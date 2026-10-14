"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { z } from "zod";

const balanceSchema = z.object({
  asset: z.string().optional(),
  available: z.coerce.number(),
});

/*
 * The only place that knows the shape of GET /get-balance.
 * It accepts:  [{ asset, available }]  or  { balances: [{ asset, available }] }
 * or a single { available }. If your response is different, change this function only.
 */
function pickAvailable(data: unknown, asset: string): number | null {
  const raw = data as { balances?: unknown };
  const list = Array.isArray(data)
    ? data
    : Array.isArray(raw?.balances)
      ? raw.balances
      : [data];

  const items = z.array(balanceSchema).safeParse(list);
  if (!items.success) return null;

  const item = items.data.find((b) => !b.asset || b.asset === asset);
  return item ? item.available : null;
}

export function useAssetBalance(asset: string, enabled: boolean) {
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          "http://localhost:4000/balances/my-balance",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            params: { asset },
          },
        );

        const value = pickAvailable(response.data, asset);
        if (cancelled) return;

        if (value === null) {
          setError("Could not read your balance");
        } else {
          setAvailable(value);
        }
      } catch {
        if (!cancelled) setError("Failed to load your balance");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [asset, enabled]);

  return { available, loading, error };
}
