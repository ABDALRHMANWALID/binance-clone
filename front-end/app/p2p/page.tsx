'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Tab = 'buy' | 'sell';

const ads = [
  {
    transactionId: 1,
    merchant: 'AhmedCrypto',
    price: 52.15,
    available: 1250,
    min: 500,
    max: 50000,
    payment: ['Vodafone Cash', 'InstaPay'],
  },
  {
    transactionId: 2,
    merchant: 'CryptoMaster',
    price: 52.1,
    available: 3500,
    min: 1000,
    max: 100000,
    payment: ['Bank Transfer'],
  },
  {
    transactionId: 3,
    merchant: 'MohamedTrade',
    price: 52.05,
    available: 850,
    min: 200,
    max: 25000,
    payment: ['Vodafone Cash'],
  },
];

export default function P2PPage() {
  const [activeTab, setActiveTab] = useState<Tab>('buy');

    const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">P2P Trading</h1>

          <p className="mt-2 text-sm text-slate-400">
            Trade test tokens with other users using simulated payments.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-8 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('buy')}
            className={`pb-4 text-lg font-semibold transition ${
              activeTab === 'buy'
                ? 'border-b-2 border-yellow-400 text-yellow-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Buy
          </button>

          <button
            onClick={() => setActiveTab('sell')}
            className={`pb-4 text-lg font-semibold transition ${
              activeTab === 'sell'
                ? 'border-b-2 border-yellow-400 text-yellow-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <select className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none">
            <option>USDT</option>
            <option>tBTC</option>
            <option>tETH</option>
          </select>

          <select className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none">
            <option>All Payment Methods</option>
            <option>Vodafone Cash</option>
            <option>InstaPay</option>
            <option>Bank Transfer</option>
          </select>

          <input
            type="number"
            placeholder="Amount"
            className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {/* Table Header */}
          <div className="grid grid-cols-12 border-b border-slate-800 px-6 py-4 text-sm text-slate-400">
            <div className="col-span-3">Advertiser</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Available</div>
            <div className="col-span-2">Limits</div>
            <div className="col-span-2">Payment</div>
            <div className="col-span-1"></div>
          </div>

          {/* Ads */}
          {ads.map((ad) => (
            <div
              key={ad.transactionId}
              className="grid grid-cols-12 items-center border-b border-slate-800 px-6 py-5 last:border-b-0"
            >
              {/* Advertiser */}
              <div className="col-span-3">
                <div className="font-medium">{ad.merchant}</div>

                <div className="mt-1 text-xs text-slate-500">
                  99.8% completion
                </div>
              </div>

              {/* Price */}
              <div className="col-span-2">
                <div className="font-semibold text-yellow-400">
                  {ad.price.toFixed(2)} EGP
                </div>

                <div className="text-xs text-slate-500">per USDT</div>
              </div>

              {/* Available */}
              <div className="col-span-2">
                <div>{ad.available.toLocaleString()} USDT</div>
              </div>

              {/* Limits */}
              <div className="col-span-2 text-sm text-slate-300">
                {ad.min.toLocaleString()} - {ad.max.toLocaleString()} EGP
              </div>

              {/* Payment */}
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1">
                  {ad.payment.map((method) => (
                    <span
                      key={method}
                      className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="col-span-1 text-right">
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeTab === 'buy'
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black'
                  }`}

                  onClick={() => {router.push(`/p2p/chat/${ad.transactionId}`);}}
                >
                  {activeTab === 'buy' ? 'Buy' : 'Sell'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-500">
          This is a simulated P2P marketplace for educational purposes.
          All assets and payment methods shown are test data and have no real
          monetary value.
        </div>
      </div>
    </main>
  );
}