'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import AdForm from '@/app/p2p/AdForm';

interface Ad {
  id: number;
  side: 'buy' | 'sell';
  asset: string;
  fiat: string;
  price: string;
  total: string;
  minFiat: string;
  maxFiat: string;
  status: 'active' | 'paused';
  paymentMethodIds: number[];
}

export default function EditAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await axios.get<Ad>(`/ads/${id}`);
        setAd(response.data);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 text-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 text-center text-red-400">
        Ad not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <AdForm
          adId={id}
          initialData={ad}
          onSuccess={() => {
            router.push('/p2p');
          }}
        />
      </div>
    </div>
  );
}