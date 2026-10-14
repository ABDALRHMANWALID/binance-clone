"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import axios from "axios";
import { useAssetBalance } from "./useAssetBalance";

type Side = "buy" | "sell";
type AdStatus = "active" | "paused";

const API_URL = "http://localhost:4000";
const ASSET = "ETH" as const;
const FIAT = "EGP" as const;

interface PaymentMethod {
  id: number;
  name: string;
}

interface AdFormProps {
  adId?: number | string;
  initialData?: {
    side?: Side;
    asset?: string;
    fiat?: string;
    price?: string;
    total?: string;
    minFiat?: string;
    maxFiat?: string;
    status?: AdStatus;
    paymentMethodIds?: number[];
  };
  onSuccess?: () => void;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// 1.5 -> "1.5", 0.01 -> "0.01" (rounded DOWN so we never show more than the user has)
const formatEth = (value: number) =>
  (Math.floor(value * 1e8) / 1e8).toFixed(8).replace(/\.?0+$/, "");

const toFieldErrors = (
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
) => {
  const fieldErrors: Record<string, string> = {};

  issues.forEach((issue) => {
    const field = issue.path[0];

    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  });

  return fieldErrors;
};

/*
 * Schemas
 */
const baseFields = {
  price: z.string().min(1, "Price is required"),
  total: z.string().min(1, "Total is required"),
  minFiat: z.string().min(1, "Minimum amount is required"),
  maxFiat: z.string().min(1, "Maximum amount is required"),
  paymentMethodIds: z
    .array(z.number())
    .min(1, "Select at least one payment method")
    .max(10, "You can select up to 10 payment methods"),
};

// shared by create and update; maxTotal is null when there is no limit (buy ads)
function checkAmounts(
  data: { price: string; total: string; minFiat: string; maxFiat: string },
  ctx: {
    addIssue: (issue: {
      code: "custom";
      path: string[];
      message: string;
    }) => void;
  },
  maxTotal: number | null,
) {
  const add = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });

  if (Number(data.price) <= 0) {
    add("price", "Price must be greater than 0");
  }

  if (Number(data.total) <= 0) {
    add("total", "Total must be greater than 0");
  } else if (maxTotal !== null && Number(data.total) > maxTotal + 1e-12) {
    add("total", `You can sell up to ${formatEth(maxTotal)} ${ASSET}`);
  }

  if (Number(data.minFiat) <= 0) {
    add("minFiat", "Minimum amount must be greater than 0");
  }

  if (Number(data.maxFiat) <= 0) {
    add("maxFiat", "Maximum amount must be greater than 0");
  }

  if (Number(data.minFiat) > Number(data.maxFiat)) {
    add("maxFiat", "Maximum amount must be greater than minimum amount");
  }
}

const buildCreateSchema = (maxTotal: number | null) =>
  z
    .object({
      side: z.enum(["buy", "sell"]),
      asset: z.literal(ASSET),
      fiat: z.literal(FIAT),
      ...baseFields,
    })
    .superRefine((data, ctx) => checkAmounts(data, ctx, maxTotal));

const buildUpdateSchema = (maxTotal: number | null) =>
  z
    .object({
      ...baseFields,
      status: z.enum(["active", "paused"]),
    })
    .superRefine((data, ctx) => checkAmounts(data, ctx, maxTotal));

export default function AdForm({ adId, initialData, onSuccess }: AdFormProps) {
  const isEdit = Boolean(adId);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState({
    side: initialData?.side ?? "buy",
    price: initialData?.price ?? "",
    total: initialData?.total ?? "",
    minFiat: initialData?.minFiat ?? "",
    maxFiat: initialData?.maxFiat ?? "",
    paymentMethodIds: initialData?.paymentMethodIds ?? [],
    status: initialData?.status ?? "active",
  });

  /*
   * Balance limit (sell ads only)
   * create: you can sell up to what is available
   * edit:   you can sell what is already in the ad + what is available
   */
  const isSell = form.side === "sell";
  const {
    available,
    loading: loadingBalance,
    error: balanceError,
  } = useAssetBalance(ASSET, isSell);

  const adTotal = isEdit ? Number(initialData?.total ?? 0) : 0;
  const maxTotal = isSell && available !== null ? available + adTotal : null;

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await axios.get<PaymentMethod[]>(
          `${API_URL}/payment-methods`,
          { headers: authHeaders() },
        );

        setPaymentMethods(response.data);
      } catch (error) {
        console.error(error);
        setServerError("Failed to load payment methods");
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  // the user cannot type a total bigger than the limit
  const handleTotalChange = (value: string) => {
    // numbers only, up to 18 decimals
    if (!/^\d*\.?\d{0,18}$/.test(value)) return;

    if (maxTotal !== null && Number(value) > maxTotal + 1e-12) {
      setErrors((prev) => ({
        ...prev,
        total: `You can sell up to ${formatEth(maxTotal)} ${ASSET}`,
      }));
      return; // reject the change, the input keeps its previous value
    }

    handleChange("total", value);
  };

  const togglePaymentMethod = (id: number) => {
    setForm((prev) => {
      const exists = prev.paymentMethodIds.includes(id);

      if (exists) {
        return {
          ...prev,
          paymentMethodIds: prev.paymentMethodIds.filter(
            (methodId) => methodId !== id,
          ),
        };
      }

      if (prev.paymentMethodIds.length >= 10) {
        return prev;
      }

      return {
        ...prev,
        paymentMethodIds: [...prev.paymentMethodIds, id],
      };
    });

    setErrors((prev) => ({
      ...prev,
      paymentMethodIds: "",
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrors({});
    setServerError("");

    if (isEdit) {
      const result = buildUpdateSchema(maxTotal).safeParse({
        price: form.price,
        total: form.total,
        minFiat: form.minFiat,
        maxFiat: form.maxFiat,
        status: form.status,
        paymentMethodIds: form.paymentMethodIds,
      });

      if (!result.success) {
        setErrors(toFieldErrors(result.error.issues));
        return;
      }

      try {
        setSubmitting(true);

        await axios.patch(`${API_URL}/ads/${adId}`, result.data, {
          headers: authHeaders(),
        });

        onSuccess?.();
      } catch (error: any) {
        console.error(error);

        setServerError(error?.response?.data?.message || "Failed to update ad");
      } finally {
        setSubmitting(false);
      }

      return;
    }

    const result = buildCreateSchema(maxTotal).safeParse({
      side: form.side,
      asset: ASSET,
      fiat: FIAT,
      price: form.price,
      total: form.total,
      minFiat: form.minFiat,
      maxFiat: form.maxFiat,
      paymentMethodIds: form.paymentMethodIds,
    });

    if (!result.success) {
      setErrors(toFieldErrors(result.error.issues));
      return;
    }

    try {
      setSubmitting(true);

      await axios.post(`${API_URL}/ads`, result.data, {
        headers: authHeaders(),
      });

      onSuccess?.();
    } catch (error: any) {
      console.error(error);

      setServerError(error?.response?.data?.message || "Failed to create ad");
    } finally {
      setSubmitting(false);
    }
  };

  // a sell ad cannot be submitted until we know the balance
  const balanceNotReady = isSell && (loadingBalance || maxTotal === null);

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          {isEdit ? "Update Ad" : "Create Ad"}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {isEdit
            ? "Update your P2P advertisement"
            : "Create a new P2P advertisement"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Side */}
        {!isEdit && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              I want to
            </label>

            <div className="grid grid-cols-2 gap-3">
              {(["buy", "sell"] as Side[]).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => handleChange("side", side)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                    form.side === side
                      ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                      : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {side} {ASSET}
                </button>
              ))}
            </div>

            {errors.side && (
              <p className="mt-2 text-xs text-red-400">{errors.side}</p>
            )}
          </div>
        )}

        {/* Asset / Fiat */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Asset
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white">
              {ASSET}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Fiat
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white">
              {FIAT}
            </div>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Price (per {ASSET})
          </label>

          <div className="relative">
            <input
              value={form.price}
              onChange={(e) => handleChange("price", e.target.value)}
              placeholder="e.g. 150000"
              inputMode="decimal"
              className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                errors.price
                  ? "border-red-500"
                  : "border-slate-800 focus:border-yellow-400"
              }`}
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              {FIAT}
            </span>
          </div>

          {errors.price && (
            <p className="mt-2 text-xs text-red-400">{errors.price}</p>
          )}
        </div>

        {/* Total */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Total
          </label>

          <div className="relative">
            <input
              value={form.total}
              onChange={(e) => handleTotalChange(e.target.value)}
              placeholder="e.g. 0.5"
              inputMode="decimal"
              className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                errors.total
                  ? "border-red-500"
                  : "border-slate-800 focus:border-yellow-400"
              }`}
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              {ASSET}
            </span>
          </div>

          {/* Balance hint (sell only) */}
          {isSell && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              {loadingBalance ? (
                <span>Loading your balance...</span>
              ) : maxTotal !== null ? (
                <>
                  <span>
                    Available: {formatEth(available ?? 0)} {ASSET}
                    {isEdit &&
                      ` (+ ${formatEth(adTotal)} ${ASSET} already in this ad)`}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleChange("total", formatEth(maxTotal))}
                    className="font-medium text-yellow-400 hover:underline"
                  >
                    Max
                  </button>
                </>
              ) : (
                <span className="text-red-400">
                  {balanceError || "Could not load your balance"}
                </span>
              )}
            </div>
          )}

          {errors.total && (
            <p className="mt-2 text-xs text-red-400">{errors.total}</p>
          )}
        </div>

        {/* Min / Max */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Minimum Order
            </label>

            <div className="relative">
              <input
                value={form.minFiat}
                onChange={(e) => handleChange("minFiat", e.target.value)}
                placeholder="e.g. 500"
                inputMode="decimal"
                className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                  errors.minFiat
                    ? "border-red-500"
                    : "border-slate-800 focus:border-yellow-400"
                }`}
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {FIAT}
              </span>
            </div>

            {errors.minFiat && (
              <p className="mt-2 text-xs text-red-400">{errors.minFiat}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Maximum Order
            </label>

            <div className="relative">
              <input
                value={form.maxFiat}
                onChange={(e) => handleChange("maxFiat", e.target.value)}
                placeholder="e.g. 50000"
                inputMode="decimal"
                className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                  errors.maxFiat
                    ? "border-red-500"
                    : "border-slate-800 focus:border-yellow-400"
                }`}
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {FIAT}
              </span>
            </div>

            {errors.maxFiat && (
              <p className="mt-2 text-xs text-red-400">{errors.maxFiat}</p>
            )}
          </div>
        </div>

        {/* Status */}
        {isEdit && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Status
            </label>

            <div className="grid grid-cols-2 gap-3">
              {(["active", "paused"] as AdStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleChange("status", status)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                    form.status === status
                      ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                      : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {errors.status && (
              <p className="mt-2 text-xs text-red-400">{errors.status}</p>
            )}
          </div>
        )}

        {/* Payment Methods */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">
              Payment Methods
            </label>

            <span className="text-xs text-slate-500">
              {form.paymentMethodIds.length}/10 selected
            </span>
          </div>

          {loadingPaymentMethods ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm text-slate-500">
              Loading payment methods...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {paymentMethods.map((method) => {
                const selected = form.paymentMethodIds.includes(method.id);

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => togglePaymentMethod(method.id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                        selected
                          ? "border-yellow-400 bg-yellow-400 text-slate-950"
                          : "border-slate-600"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>

                    <span
                      className={
                        selected
                          ? "text-sm text-white"
                          : "text-sm text-slate-400"
                      }
                    >
                      {method.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {errors.paymentMethodIds && (
            <p className="mt-2 text-xs text-red-400">
              {errors.paymentMethodIds}
            </p>
          )}
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {serverError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || balanceNotReady}
          className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? "Updating..."
              : "Creating..."
            : isEdit
              ? "Update Ad"
              : "Create Ad"}
        </button>
      </form>
    </div>
  );
}
