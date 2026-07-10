import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { apiClient } from '../../services/apiClient';

const schema = z
  .object({
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type ResetForm = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Token missing — show a clear error instead of a broken form
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Lock className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Invalid Link</h2>
          <p className="mt-2 text-sm text-slate-500">
            This activation link is missing a token. Please check your email for the correct link or contact your administrator.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-700"
          >
            Back to Sign In
          </Link>
        </div>
      </main>
    );
  }

  // Success state — shown after a successful password reset
  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-lime-50">
            <CheckCircle2 className="h-8 w-8 text-lime-600" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-lime-700">
            Account Activated
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            You're all set!
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your password has been saved. You can now sign in to your staff workspace.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-7 w-full rounded-xl bg-lime-700 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-lime-800"
          >
            Go to Sign In
          </button>
        </motion.div>
      </main>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password: values.password
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'This link has expired or already been used. Please request a new one.';
      setError('root', { message });
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
      >
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 shadow">
            <Building2 className="h-5 w-5 text-lime-300" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-700">
              NuvraHub HMS
            </p>
            <p className="text-xs text-slate-400">Staff Account Setup</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Setup Your Account</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Please enter a secure password to activate your staff workspace profile.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          {/* New Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-lime-700 transition placeholder:text-slate-400 focus:border-lime-700 focus:ring-2"
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
            )}
            <p className="mt-1.5 text-xs text-slate-400">Minimum 10 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-lime-700 transition placeholder:text-slate-400 focus:border-lime-700 focus:ring-2"
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* General API error */}
          {errors.root && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-700 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-lime-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Activating…
              </>
            ) : (
              'Activate & Save Password'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-lime-700 hover:text-lime-800">
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
