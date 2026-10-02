'use client';

import axios from 'axios';
import Link from 'next/link';
import { useState } from 'react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrors({});

    const result = loginSchema.safeParse({
      email,
      password,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });

      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        'http://localhost:4000/auth/login',
        {
          email: result.data.email,
          password: result.data.password,
        },
      );

      const { token } = response.data;

      localStorage.setItem('token', token);

      window.location.href = '/';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrors({
          general:
            error.response?.data?.message ||
            'Invalid email or password',
        });
      } else {
        setErrors({
          general: 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-192px)] max-w-md items-center justify-center">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Welcome back</h1>

            <p className="mt-2 text-sm text-slate-400">
              Login to your account and start trading
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* General Error */}
              {errors.general && (
                <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
                  {errors.general}
                </div>
              )}

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`w-full rounded-lg border ${
                    errors.email
                      ? 'border-red-500'
                      : 'border-slate-700'
                  } bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400`}
                />

                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full rounded-lg border ${
                    errors.password
                      ? 'border-red-500'
                      : 'border-slate-700'
                  } bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400`}
                />

                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Login */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-yellow-400 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-800" />

              <span className="text-xs text-slate-500">OR</span>

              <div className="h-px flex-1 bg-slate-800" />
            </div>

            {/* Connect Wallet */}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-950 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400"
            >
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

            {/* Register */}
            <p className="mt-6 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-yellow-400 hover:text-yellow-300"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}