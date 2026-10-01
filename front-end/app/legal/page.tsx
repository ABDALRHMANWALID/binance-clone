import Link from 'next/link';

export default function LegalPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold">
            Terms & Privacy
          </h1>

          <p className="mt-4 text-slate-400">
            Important information about this project
          </p>
        </div>

        {/* Disclaimer */}
        <section className="mb-10 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-6">
          <h2 className="text-xl font-semibold text-yellow-400">
            Important Notice
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            This website is not a real cryptocurrency exchange and is
            not affiliated with, associated with, authorized by, or
            endorsed by Binance.
          </p>

          <p className="mt-4 leading-7 text-slate-300">
            This project was created for educational and learning
            purposes only. It is a personal software engineering
            project designed to explore how a cryptocurrency exchange
            platform could be structured and developed.
          </p>

          <p className="mt-4 leading-7 text-slate-300">
            No real cryptocurrency, money, financial services, or
            investment services are provided through this website.
          </p>
        </section>

        {/* Terms */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold">
            Terms of Use
          </h2>

          <div className="mt-6 space-y-6 text-slate-400">
            <div>
              <h3 className="font-semibold text-white">
                Educational Project
              </h3>

              <p className="mt-2 leading-7">
                This platform is a demonstration project created for
                learning, experimentation, and portfolio purposes. It
                should not be used for real financial transactions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white">
                No Financial Services
              </h3>

              <p className="mt-2 leading-7">
                This project does not provide cryptocurrency exchange,
                brokerage, investment, payment, custody, or other
                financial services.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white">
                No Real Transactions
              </h3>

              <p className="mt-2 leading-7">
                Any trading interfaces, balances, orders, wallets, or
                other financial features displayed by the application
                are part of the demonstration and should not be
                considered real financial activity.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Third-Party Services
              </h3>

              <p className="mt-2 leading-7">
                Any third-party services or technologies used by this
                project are used for development and educational
                purposes and do not imply any commercial relationship
                with this project.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-10 border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold">
            Privacy Policy
          </h2>

          <div className="mt-6 space-y-6 text-slate-400">
            <div>
              <h3 className="font-semibold text-white">
                Information Collection
              </h3>

              <p className="mt-2 leading-7">
                This project is intended as a learning application and
                is not designed to collect or process real financial
                information.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Personal Information
              </h3>

              <p className="mt-2 leading-7">
                Do not provide real passwords, payment information,
                private keys, seed phrases, or other sensitive
                information while using this demonstration project.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Wallet Connections
              </h3>

              <p className="mt-2 leading-7">
                Any wallet connection functionality is intended for
                development and testing purposes. Never share your
                private key or recovery phrase with this application
                or any website.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Local Storage
              </h3>

              <p className="mt-2 leading-7">
                The application may use browser local storage for
                development purposes, such as maintaining authentication
                state. This data is part of the demonstration
                environment.
              </p>
            </div>
          </div>
        </section>

        {/* Project */}
        <section className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold">
            About This Project
          </h2>

          <p className="mt-4 leading-7 text-slate-400">
            This project is an open-source learning project inspired
            by modern cryptocurrency exchange platforms. The goal is
            to practice frontend development, Web3 integration,
            authentication, trading interfaces, and exchange
            architecture.
          </p>

          <a
            href="https://github.com/ABDALRHMANWALID/binance-clone"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-lg border border-slate-700
                       px-5 py-3 text-sm font-semibold text-white
                       transition hover:border-yellow-400
                       hover:text-yellow-400"
          >
            View Project on GitHub
          </a>
        </section>

        {/* Social Links */}
        <section className="mt-10 border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold">
            Connect With Me
          </h2>

          <div className="mt-6 flex flex-wrap gap-3">
            <SocialLink
              href="https://www.linkedin.com/in/abdalrhman-walid"
              label="LinkedIn"
            />

            <SocialLink
              href="https://github.com/ABDALRHMANWALID"
              label="GitHub"
            />

            <SocialLink
              href="https://www.youtube.com/@booodywalid"
              label="YouTube"
            />

            <SocialLink
              href="https://x.com/booody_walid"
              label="X"
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          <p>
            This is an educational project and is not a real
            cryptocurrency exchange.
          </p>

          <p className="mt-2">
            © {new Date().getFullYear()} Abdalrhman Walid
          </p>
        </footer>
      </div>
    </main>
  );
}

function SocialLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-slate-700 bg-slate-900
                 px-5 py-3 text-sm font-medium text-slate-300
                 transition hover:border-yellow-400
                 hover:text-yellow-400"
    >
      {label}
    </a>
  );
}