'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';

type Role = 'buyer' | 'seller';

type Message = {
  id: string;
  sender: Role;
  text?: string;
  file?: {
    name: string;
    type: string;
    url: string;
  };
};

export default function P2PChatPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = use(params);

  const [role, setRole] = useState<Role>('buyer');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: role,
        text: message,
      },
    ]);

    setMessage('');
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert('File size cannot exceed 10MB');
      return;
    }

    const fileUrl = URL.createObjectURL(file);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: role,
        file: {
          name: file.name,
          type: file.type,
          url: fileUrl,
        },
      },
    ]);

    // Allow selecting the same file again
    event.target.value = '';
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        {/* Chat */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {/* Header */}
          <div className="border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/p2p"
                className="text-slate-400 hover:text-white"
              >
                ←
              </Link>

              <div>
                <h1 className="font-semibold">P2P Trade Chat</h1>

                <p className="text-xs text-slate-500">
                  Transaction ID: {transactionId}
                </p>
              </div>
            </div>
          </div>

          {/* Demo Role */}
          <div className="border-b border-slate-800 px-6 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Demo role:</span>

              <button
                onClick={() => setRole('buyer')}
                className={`rounded px-3 py-1 ${
                  role === 'buyer'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-slate-800'
                }`}
              >
                Buyer
              </button>

              <button
                onClick={() => setRole('seller')}
                className={`rounded px-3 py-1 ${
                  role === 'seller'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-slate-800'
                }`}
              >
                Seller
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex min-h-[450px] flex-1 flex-col gap-4 overflow-y-auto p-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender === role
                    ? 'ml-auto bg-yellow-400 text-black'
                    : 'bg-slate-800 text-white'
                }`}
              >
                {/* Text */}
                {msg.text && (
                  <p className="text-sm">{msg.text}</p>
                )}

                {/* File */}
                {msg.file && (
                  <div className="flex items-center gap-3">
                    {msg.file.type.startsWith('image/') ? (
                      <img
                        src={msg.file.url}
                        alt={msg.file.name}
                        className="max-h-48 max-w-64 rounded-lg object-contain"
                      />
                    ) : (
                      <a
                        href={msg.file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg bg-black/20 p-3"
                      >
                        <span className="text-2xl">📄</span>

                        <div>
                          <p className="max-w-48 truncate text-sm font-medium">
                            {msg.file.name}
                          </p>

                          <p className="text-xs opacity-60">
                            Open file
                          </p>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-2">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-800 text-xl transition hover:bg-slate-700"
                title="Attach file"
              >
                📎
              </button>

              {/* Text Input */}
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-yellow-400"
              />

              {/* Send */}
              <button
                onClick={handleSendMessage}
                className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-semibold text-black hover:bg-yellow-300"
              >
                Send
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-600">
              Images and files up to 10MB
            </p>
          </div>
        </div>

        {/* Transaction Details */}
        <aside className="w-80 rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <h2 className="font-semibold">Transaction Details</h2>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <p className="text-xs text-slate-500">
                Transaction ID
              </p>

              <p className="mt-1 break-all text-sm">
                {transactionId}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Asset</p>
              <p className="mt-1 font-medium">USDT</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Amount</p>
              <p className="mt-1 font-medium">500 USDT</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Payment</p>
              <p className="mt-1 font-medium">Vodafone Cash</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}