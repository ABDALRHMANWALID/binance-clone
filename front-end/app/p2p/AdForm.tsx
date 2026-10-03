'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import axios from 'axios';

type Side = 'buy' | 'sell';
type AdStatus = 'active' | 'paused';

interface PaymentMethod {
  id: number;
  type: string;
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

const createAdSchema = z
  .object({
    side: z.enum(['buy', 'sell']),
    asset: z.literal('USDT'),
    fiat: z.literal('EGP'),

    price: z.string().min(1, 'Price is required'),
    total: z.string().min(1, 'Total is required'),
    minFiat: z.string().min(1, 'Minimum amount is required'),
    maxFiat: z.string().min(1, 'Maximum amount is required'),

    paymentMethodIds: z
      .array(z.number())
      .min(1, 'Select at least one payment method')
      .max(10, 'You can select up to 10 payment methods'),
  })
  .superRefine((data, ctx) => {
    if (Number(data.price) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'Price must be greater than 0',
      });
    }

    if (Number(data.total) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'Total must be greater than 0',
      });
    }

    if (Number(data.minFiat) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['minFiat'],
        message: 'Minimum amount must be greater than 0',
      });
    }

    if (Number(data.maxFiat) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxFiat'],
        message: 'Maximum amount must be greater than 0',
      });
    }

    if (Number(data.minFiat) > Number(data.maxFiat)) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxFiat'],
        message: 'Maximum amount must be greater than minimum amount',
      });
    }
  });

const updateAdSchema = z
  .object({
    price: z.string().min(1, 'Price is required'),
    total: z.string().min(1, 'Total is required'),
    minFiat: z.string().min(1, 'Minimum amount is required'),
    maxFiat: z.string().min(1, 'Maximum amount is required'),

    status: z.enum(['active', 'paused']),

    paymentMethodIds: z
      .array(z.number())
      .min(1, 'Select at least one payment method')
      .max(10, 'You can select up to 10 payment methods'),
  })
  .superRefine((data, ctx) => {
    if (Number(data.price) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'Price must be greater than 0',
      });
    }

    if (Number(data.total) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'Total must be greater than 0',
      });
    }

    if (Number(data.minFiat) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['minFiat'],
        message: 'Minimum amount must be greater than 0',
      });
    }

    if (Number(data.maxFiat) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxFiat'],
        message: 'Maximum amount must be greater than minimum amount',
      });
    }

    if (Number(data.minFiat) > Number(data.maxFiat)) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxFiat'],
        message: 'Maximum amount must be greater than minimum amount',
      });
    }
  });

export default function AdForm({
  adId,
  initialData,
  onSuccess,
}: AdFormProps) {
  const router = useRouter();
  const isEdit = Boolean(adId);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const [form, setForm] = useState({
    side: initialData?.side ?? 'buy',
    asset: initialData?.asset ?? 'USDT',
    fiat: initialData?.fiat ?? 'EGP',
    price: initialData?.price ?? '',
    total: initialData?.total ?? '',
    minFiat: initialData?.minFiat ?? '',
    maxFiat: initialData?.maxFiat ?? '',
    paymentMethodIds: initialData?.paymentMethodIds ?? [],
    status: initialData?.status ?? 'active',
  });

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await axios.get<PaymentMethod[]>(
          'http://localhost:4000/payment-methods',{
            headers: {Authorization: `Bearer ${localStorage.getItem('token')}` || ''},
          }
        );

        setPaymentMethods(response.data);
      } catch (error) {
        console.error(error);
        setServerError('Failed to load payment methods');
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  const handleChange = (
    field: keyof typeof form,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
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
      paymentMethodIds: '',
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setErrors({});
    setServerError('');

    if (isEdit) {
      const result = updateAdSchema.safeParse({
        price: form.price,
        total: form.total,
        minFiat: form.minFiat,
        maxFiat: form.maxFiat,
        status: form.status,
        paymentMethodIds: form.paymentMethodIds,
      });

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};

        result.error.issues.forEach((issue) => {
          const field = issue.path[0];

          if (typeof field === 'string') {
            fieldErrors[field] = issue.message;
          }
        });

        setErrors(fieldErrors);
        return;
      }

      try {
        setSubmitting(true);

        await axios.patch(`/ads/${adId}`, result.data);

        onSuccess?.();
      } catch (error: any) {
        console.error(error);

        setServerError(
          error?.response?.data?.message ||
            'Failed to update ad',
        );
      } finally {
        setSubmitting(false);
      }

      return;
    }

    const result = createAdSchema.safeParse({
      side: form.side,
      asset: form.asset,
      fiat: form.fiat,
      price: form.price,
      total: form.total,
      minFiat: form.minFiat,
      maxFiat: form.maxFiat,
      paymentMethodIds: form.paymentMethodIds,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (typeof field === 'string') {
          fieldErrors[field] = issue.message;
        }
      });

      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);

      // await axios.post('http://localhost:4000/ads', result.data);
      await axios.post('http://localhost:4000/ads', result.data, {
        headers: {Authorization: `Bearer ${localStorage.getItem('token')}` || ''},
      });

      onSuccess?.();
    } catch (error: any) {
      console.error(error);

      setServerError(
        error?.response?.data?.message ||
          'Failed to create ad',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          {isEdit ? 'Update Ad' : 'Create Ad'}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {isEdit
            ? 'Update your P2P advertisement'
            : 'Create a new P2P advertisement'}
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
              {(['buy', 'sell'] as Side[]).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => handleChange('side', side)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                    form.side === side
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                      : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {side} USDT
                </button>
              ))}
            </div>

            {errors.side && (
              <p className="mt-2 text-xs text-red-400">
                {errors.side}
              </p>
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
              USDT
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Fiat
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white">
              EGP
            </div>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Price
          </label>

          <div className="relative">
            <input
              value={form.price}
              onChange={(e) =>
                handleChange('price', e.target.value)
              }
              placeholder="e.g. 48.50"
              inputMode="decimal"
              className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                errors.price
                  ? 'border-red-500'
                  : 'border-slate-800 focus:border-yellow-400'
              }`}
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              EGP
            </span>
          </div>

          {errors.price && (
            <p className="mt-2 text-xs text-red-400">
              {errors.price}
            </p>
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
              onChange={(e) =>
                handleChange('total', e.target.value)
              }
              placeholder="e.g. 1000"
              inputMode="decimal"
              className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                errors.total
                  ? 'border-red-500'
                  : 'border-slate-800 focus:border-yellow-400'
              }`}
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              USDT
            </span>
          </div>

          {errors.total && (
            <p className="mt-2 text-xs text-red-400">
              {errors.total}
            </p>
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
                onChange={(e) =>
                  handleChange('minFiat', e.target.value)
                }
                placeholder="e.g. 100"
                inputMode="decimal"
                className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                  errors.minFiat
                    ? 'border-red-500'
                    : 'border-slate-800 focus:border-yellow-400'
                }`}
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                EGP
              </span>
            </div>

            {errors.minFiat && (
              <p className="mt-2 text-xs text-red-400">
                {errors.minFiat}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Maximum Order
            </label>

            <div className="relative">
              <input
                value={form.maxFiat}
                onChange={(e) =>
                  handleChange('maxFiat', e.target.value)
                }
                placeholder="e.g. 5000"
                inputMode="decimal"
                className={`w-full rounded-xl border bg-slate-950 px-4 py-3 pr-16 text-white outline-none transition placeholder:text-slate-600 ${
                  errors.maxFiat
                    ? 'border-red-500'
                    : 'border-slate-800 focus:border-yellow-400'
                }`}
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                EGP
              </span>
            </div>

            {errors.maxFiat && (
              <p className="mt-2 text-xs text-red-400">
                {errors.maxFiat}
              </p>
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
              {(['active', 'paused'] as AdStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      handleChange('status', status)
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                      form.status === status
                        ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>

            {errors.status && (
              <p className="mt-2 text-xs text-red-400">
                {errors.status}
              </p>
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
                const selected =
                  form.paymentMethodIds.includes(method.id);

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() =>
                      togglePaymentMethod(method.id)
                    }
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                        selected
                          ? 'border-yellow-400 bg-yellow-400 text-slate-950'
                          : 'border-slate-600'
                      }`}
                    >
                      {selected ? '✓' : ''}
                    </span>

                    <span
                      className={
                        selected
                          ? 'text-sm text-white'
                          : 'text-sm text-slate-400'
                      }
                    >
                      {method.type}
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
          disabled={submitting}
          className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? 'Updating...'
              : 'Creating...'
            : isEdit
              ? 'Update Ad'
              : 'Create Ad'}
        </button>
      </form>
    </div>
  );
}