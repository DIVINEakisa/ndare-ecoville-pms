import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../../services/apiClient';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotForm = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiClient.post('/auth/forgot-password', { email: values.email });
      setSubmittedEmail(values.email);
      setSent(true);
    } catch {
      // Never reveal whether an account exists — always show success
      setSubmittedEmail(values.email);
      setSent(true);
    }
  });

  // ── Success state ──────────────────────────────────────────────────────────
  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-lime-50">
            <CheckCircle2 className="h-8 w-8 text-lime-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            If an account exists for{' '}
            <span className="font-semibold text-slate-700">{submittedEmail}</span>,
            you will receive a password reset link shortly.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Check your spam folder if you don't see it within a few minutes.
          </p>
          <Link
            to="/login"
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime-700 py-2.5 text-sm font-semibold text-white transition hover:bg-lime-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </motion.div>
      </main>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 sm:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow">
              <Building2 className="h-5 w-5 text-lime-300" />
            </div>
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-slate-950">NDARE ECOVILLE</p>
              <p className="text-xs font-medium text-slate-500">Property Management System</p>
            </div>
          </Link>
        </div>
      </header>

      <section className="flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
        >
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-50">
              <Mail className="h-6 w-6 text-lime-700" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-900">Forgot password?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter your work email and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Work Email</span>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-lime-700 transition placeholder:text-slate-400 focus:border-lime-700 focus:ring-2"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </label>

            {errors.root && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-700 py-3 text-sm font-semibold text-white transition hover:bg-lime-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                : 'Send reset link'
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
