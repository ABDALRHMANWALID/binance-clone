
import Link from 'next/link';

export default function Home() {



  return (
    <>
      {/* Hero */}
      <section>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-400">
              Next-generation crypto exchange
            </span>

            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Trade crypto{' '}
              <span className="text-yellow-400">your way.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
              Buy, sell and trade digital assets with a fast and secure
              crypto trading platform.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                href="/p2p"
                className="rounded-lg bg-yellow-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300"
              >
                Start P2P Trading
              </Link>

              <Link
                href="/markets"
                className="rounded-lg border border-slate-700 px-6 py-3 font-semibold transition hover:border-slate-500"
              >
                Explore Markets
              </Link>
            </div>
          </div>

          {/* Market Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Total Market Cap
                </p>

                <p className="mt-1 text-3xl font-bold">
                  $2.41T
                </p>
              </div>

              <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
                +4.28%
              </span>
            </div>

            <div className="space-y-4">
              {[
                {
                  name: 'Bitcoin',
                  symbol: 'BTC',
                  price: '$67,420',
                  change: '+2.14%',
                },
                {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  price: '$3,840',
                  change: '+1.87%',
                },
                {
                  name: 'Solana',
                  symbol: 'SOL',
                  price: '$182.40',
                  change: '+5.21%',
                },
              ].map((coin) => (
                <div
                  key={coin.symbol}
                  className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4"
                >
                  <div>
                    <p className="font-semibold">{coin.name}</p>
                    <p className="text-xs text-slate-400">
                      {coin.symbol}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">{coin.price}</p>
                    <p className="text-sm text-green-400">
                      {coin.change}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">
              Everything you need to trade
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              A complete crypto trading experience built around
              speed, security and simplicity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Feature
              title="Fast Trading"
              description="Execute orders quickly with a high-performance trading infrastructure."
              icon="⚡"
            />

            <Feature
              title="Secure Assets"
              description="Keep your digital assets protected with secure wallet and account infrastructure."
              icon="🔒"
            />

            <Feature
              title="P2P Trading"
              description="Trade directly with other users through a simple P2P marketplace."
              icon="🌐"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/10 text-xl">
        {icon}
      </div>

      <h3 className="text-xl font-semibold">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}
