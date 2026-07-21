import { motion } from "framer-motion";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DatabaseZap,
  Hotel,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    title: "Multi-Property Channel Sync",
    description:
      "Real-time Airbnb & Booking.com updates via Lodgify for every property in your portfolio.",
    icon: RefreshCw,
  },
  {
    title: "Contactless QR Guest Portal",
    description:
      "Paper QR codes for direct room ordering, menus, service requests, and live folio billing.",
    icon: QrCode,
  },
  {
    title: "Automated Stock & Requisitions",
    description:
      "Smart thresholds, kitchen alerts, and digitized mobile approval flows for every department.",
    icon: DatabaseZap,
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 sm:h-11 sm:w-11">
              <Building2 className="h-5 w-5 text-lime-300 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-sm font-black tracking-[0.22em] text-slate-950">NVH</p>
              <p className="text-xs font-medium text-slate-500">Digital Products & Solutions</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-950">Features</a>
            <a href="#pricing" className="transition-colors hover:text-slate-950">Pricing</a>
            <a href="#about" className="transition-colors hover:text-slate-950">About Us</a>
          </div>

          <Link
            to="/login"
            className="rounded-2xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:px-4 sm:py-2.5"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-50 pt-16 sm:pt-20">
        <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-lime-200/50 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-slate-200/70 blur-3xl sm:h-72 sm:w-72" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20 lg:grid lg:min-h-[calc(100vh-80px)] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-lime-200 bg-white px-3 py-1.5 text-xs font-semibold text-lime-800 shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Built for boutique hotels, eco-villes, and apartment stays</span>
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
              The Complete Digital Operating System for Modern Boutique Hotels &amp; Eco-Villes.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
              Automate check-ins, streamline restaurant orders via QR codes, track multi-property stock, and centralize your operations in one premium dashboard built for local and global needs.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-lime-700 px-6 py-3.5 text-base font-bold text-white shadow-md shadow-lime-700/20 transition-all hover:-translate-y-0.5 hover:bg-lime-800 sm:px-8 sm:py-4"
              >
                Explore Workspace Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 sm:px-8 sm:py-4"
              >
                View features
              </a>
            </div>
          </motion.div>

          {/* Dashboard mock — hidden on small screens, shown from lg up */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-12 hidden lg:mt-0 lg:block"
          >
            <DashboardMock />
          </motion.div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 max-w-3xl sm:mb-12">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-lime-700">
            Core Platform
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Everything your team needs to operate calmly.
          </h2>
        </div>
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-8"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-700 sm:mb-6 sm:h-12 sm:w-12">
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 sm:text-xl">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="about" className="bg-slate-900 py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-lime-300">
              Built for Rwanda
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Local payment rails. Local support. Global-grade operations.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LocalAdvantage
              icon={WalletCards}
              title="Native local payments"
              text="MTN Mobile Money and Airtel Money are accepted natively upfront for guest payments and folio settlement."
            />
            <LocalAdvantage
              icon={UsersRound}
              title="Kigali training support"
              text="Dedicated physical and remote training support for hotel teams, managers, reception, kitchen, and owners."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-lime-700">
            Transparent Pricing
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Simple investment, complete operating stack.
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-2">
          <PricingCard
            label="Setup Tier"
            price="$150"
            suffix="One-Time Setup Fee"
            items={["Dual-property customization", "System configuration", "2 weeks of team training"]}
          />
          <PricingCard
            label="Subscription Tier"
            price="$200"
            suffix="/ month"
            items={["Full cloud hosting", "Support and maintenance", "Active sync maintenance"]}
            featured
          />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:px-8 sm:py-8 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-slate-900">
            © {new Date().getFullYear()} Ndare Ecoville. All rights reserved.
          </p>
          <div className="flex flex-col gap-1.5 md:flex-row md:gap-6">
            <a href="mailto:info@ndareecoville.rw" className="hover:text-slate-950">info@ndareecoville.rw</a>
            <a href="tel:+250794485969" className="hover:text-slate-950">+250 794 485 969</a>
            <span>Kigali, Rwanda</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function DashboardMock() {
  const cards = [
    ["Revenue", "$8.4k"],
    ["Occupancy", "82%"],
    ["Rooms", "13"],
    ["Orders", "18"],
  ];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/20">
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
        <div className="grid h-[520px] grid-cols-[180px_1fr]">
          <aside className="bg-slate-900 p-5 text-white">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-700">
                <Hotel className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black tracking-[0.18em]">HMS</p>
                <p className="text-xs text-slate-400">Ndare PMS</p>
              </div>
            </div>
            {["Dashboard", "Guests", "Rooms", "Restaurant", "Inventory"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`mb-2 rounded-xl px-3 py-2 text-xs font-semibold ${index === 0 ? "bg-lime-700 text-white" : "text-slate-400"}`}
                >
                  {item}
                </div>
              ),
            )}
          </aside>
          <section className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-700">
                  Owner Dashboard
                </p>
                <h3 className="text-2xl font-black text-slate-950">
                  Live operations
                </h3>
              </div>
              <div className="h-10 w-28 rounded-full bg-white shadow-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {cards.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold">Revenue trend</p>
                <CreditCard className="h-4 w-4 text-lime-700" />
              </div>
              <div className="flex h-32 items-end gap-3">
                {[42, 70, 54, 92, 78, 104, 86].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-xl bg-lime-700/80"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <BedDouble className="mb-3 h-5 w-5 text-lime-700" />
                <p className="text-sm font-bold">Check-ins ready</p>
                <p className="text-xs text-slate-500">4 arrivals today</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <Smartphone className="mb-3 h-5 w-5 text-lime-700" />
                <p className="text-sm font-bold">QR orders</p>
                <p className="text-xs text-slate-500">Kitchen queue synced</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LocalAdvantage({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Smartphone;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <Icon className="mb-5 h-7 w-7 text-lime-300" />
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-slate-300">{text}</p>
    </div>
  );
}

function PricingCard({
  label,
  price,
  suffix,
  items,
  featured = false,
}: {
  label: string;
  price: string;
  suffix: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-8 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ${featured ? "border-lime-300 bg-lime-50" : "border-slate-200 bg-white"}`}
    >
      <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-700">
        {label}
      </p>
      <div className="mt-5 flex items-end gap-2">
        <p className="text-5xl font-black tracking-tight text-slate-950">
          {price}
        </p>
        <p className="pb-2 font-semibold text-slate-600">{suffix}</p>
      </div>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 text-slate-700">
            <CheckCircle2 className="h-5 w-5 text-lime-700" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
