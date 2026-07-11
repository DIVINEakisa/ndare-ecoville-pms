import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Building2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "./AuthProvider";
import { loginRequest } from "./authApi";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, accessToken } = useAuth();

  // All hooks must be called before any conditional return
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // Already authenticated — redirect after all hooks have been called
  if (accessToken) {
    const nextPath =
      (location.state as { from?: { pathname?: string } })?.from?.pathname ??
      '/dashboard';
    return <Navigate to={nextPath} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await loginRequest(values);
      signIn(session);
      toast.success("Welcome back");
      const nextPath =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ??
        "/dashboard";
      navigate(nextPath, { replace: true });
    } catch {
      toast.error("Invalid email or password");
    }
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 sm:px-8">
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
              <p className="text-sm font-medium text-lime-800 dark:text-lime-300">
                Secure staff access
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Use your assigned hotel account to continue.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <label className="block">
                <span className="text-sm font-medium">Email</span>
                <input
                  {...register("email")}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                  type="email"
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="mt-1 block text-sm text-red-600">
                    {errors.email.message}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium">Password</span>
                <input
                  {...register("password")}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none ring-lime-700 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                  type="password"
                  autoComplete="current-password"
                />
                {errors.password && (
                  <span className="mt-1 block text-sm text-red-600">
                    {errors.password.message}
                  </span>
                )}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime-700 px-4 py-3 font-semibold text-white transition hover:bg-lime-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </button>
            </form>
          </motion.div>
      </section>
    </main>
  );
}
