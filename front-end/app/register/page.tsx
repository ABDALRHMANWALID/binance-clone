'use client';

import Link from 'next/link';
import { useState } from 'react';
import { z } from 'zod';
import { api } from '@/app/lib/axios';
import { useRouter } from 'next/navigation';

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters'),

    email: z
      .string()
      .email('Please enter a valid email'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),

    confirmPassword: z.string(),

    terms: z
      .boolean()
      .refine((value) => value === true, {
        message: 'You must accept the Terms of Service',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));

    setServerError('');
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    setErrors({});
    setServerError('');

    const result = registerSchema.safeParse(formData);

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
      setLoading(true);

      const { name, email, password } = result.data;

      const response = await api.post('/auth/register', {
        name,
        email,
        password,
      });

      console.log('Registered successfully:', response.data);

      const { token } = response.data;

      localStorage.setItem('token', token);

      // router.push('/');
      window.location.href = '/';

    } catch (error: any) {
      if (error.response?.status === 409) {
        setServerError('Email already exists');
      } else {
        setServerError(
          error.response?.data?.message ||
          'Something went wrong. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Join the platform and start trading crypto
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
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
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />

                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.name}
                  </p>
                )}
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
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />

                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.email}
                  </p>
                )}
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
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />

                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.password}
                  </p>
                )}
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
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400"
                />

                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={formData.terms}
                  onChange={handleChange}
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

              {errors.terms && (
                <p className="-mt-3 text-xs text-red-400">
                  {errors.terms}
                </p>
              )}

              {/* Server Error */}
              {serverError && (
                <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
                  {serverError}
                </div>
              )}

              {/* Register */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-yellow-400 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Creating account...'
                  : 'Create Account'}
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