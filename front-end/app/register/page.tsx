'use client';

import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-md items-center justify-center">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Join the platform and start trading crypto
            </p>
          </div>

          {/* Register Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
            <form className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Full Name
                </label>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-yellow-400"
                />

                <label
                  htmlFor="terms"
                  className="text-xs leading-5 text-slate-400"
                >
                  I agree to the{' '}
                  <Link
                    href="/legal"
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/legal"
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Register */}
              <button
                type="submit"
                className="w-full rounded-lg bg-yellow-400 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300"
              >
                Create Account
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-800" />

              <span className="text-xs text-slate-500">
                OR
              </span>

              <div className="h-px flex-1 bg-slate-800" />
            </div>

            {/* Connect Wallet */}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-950 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400"
            >
              {/* Wallet icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 8.25V6.75A2.25 2.25 0 0018 4.5H5.25A2.25 2.25 0 003 6.75v10.5A2.25 2.25 0 005.25 19.5H18a2.25 2.25 0 002.25-2.25v-1.5"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12h4.5"
                />

                <circle
                  cx="16.5"
                  cy="12"
                  r=".75"
                  fill="currentColor"
                />
              </svg>

              Connect Wallet
            </button>

            {/* Login */}
            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-yellow-400 hover:text-yellow-300"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
