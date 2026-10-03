'use client';

import { useRouter } from 'next/navigation';
import AdForm from '@/app/p2p/AdForm';

export default function CreateAdPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <AdForm
          onSuccess={() => {
            router.push('/p2p');
          }}
        />
      </div>
    </div>
  );
}