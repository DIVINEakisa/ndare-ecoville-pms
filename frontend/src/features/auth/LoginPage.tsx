import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Building2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthProvider';
import { loginRequest } from './authApi';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await loginRequest(values);
      signIn(session);
      toast.success('Welcome back');
      const nextPath = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard';
      navigate(nextPath, { replace: true });
    } catch {
      toast.error('Invalid email or password');
    }
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.35),transparent_35%),linear-gradient(135deg,#042f2e,#0f172a_55%,#064e3b)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-teal-100">NuvraHub</p>
              <h1 className="text-xl font-semibold">Hotel Apartment Management System</h1>
            </div>
          </div>
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-200">Ndare Ecoville & Property 2</p>
            <h2 className="mt-5 text-5xl font-semibold leading-tight">A calm operating room for every stay.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-200">
              Manage reservations, guest folios, restaurant orders, payments, inventory, and property performance from
              one secure multi-property workspace.
            </p>
          </div>
          <p className="text-sm text-slate-300">Production build foundation · Phase 2</p>
        </section>

        <section className="flex items-center justify-center bg-slate-50 p-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-8">
              <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Secure staff access</p>
              <h2 className="mt-2 text-3xl font-semibold">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Use your assigned hotel account to continue.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <label className="block">
                <span className="text-sm font-medium">Email</span>
                <input
                  {...register('email')}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none ring-teal-600 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                  type="email"
                  autoComplete="email"
                />
                {errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span>}
              </label>

              <label className="block">
                <span className="text-sm font-medium">Password</span>
                <input
                  {...register('password')}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none ring-teal-600 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                  type="password"
                  autoComplete="current-password"
                />
                {errors.password && <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </button>
            </form>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
