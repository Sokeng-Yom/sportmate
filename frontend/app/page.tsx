import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  MessageCircle,
  Play,
  Search,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

const steps = [
  {
    title: "1. Create Profile",
    description: "Sign up and tell us your sports and skill level.",
    icon: UserRoundPlus,
  },
  {
    title: "2. Find a Match",
    description: "Browse nearby players or search by sport, time, and location.",
    icon: Search,
  },
  {
    title: "3. Book a Court",
    description: "Reserve a court at your preferred venue.",
    icon: CalendarDays,
  },
  {
    title: "4. Play Safely",
    description: "Chat securely and enjoy your game!",
    icon: ShieldCheck,
  },
];

const features = [
  {
    title: "Smart Partner Matching",
    description: "Find players at your skill level and nearby location.",
    icon: UsersRound,
  },
  {
    title: "Easy Match Management",
    description: "Organize games, manage bookings, and keep track of your schedule.",
    icon: CalendarDays,
  },
  {
    title: "Secure Chat",
    description: "Communicate safely with verified users and build your sports circle.",
    icon: MessageCircle,
  },
];

const audiences = [
  {
    title: "Players",
    subtitle: "Find your game. Find your people.",
    icon: UsersRound,
    points: [
      "Meet new players",
      "Play at your skill level",
      "Book courts easily",
      "Build your sports community",
    ],
    visual: "players",
  },
  {
    title: "Venue Owners",
    subtitle: "Fill your courts. Grow your business.",
    icon: Building2,
    points: [
      "Get more bookings",
      "Reach local players",
      "Manage your courts easily",
      "Grow your community",
    ],
    visual: "venues",
  },
];

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" aria-label="SportMates home" className="flex items-center gap-2">
      <span className="flex gap-[3px]" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-orange-400" />
        <span className="h-2 w-2 rounded-full bg-sky-500" />
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span
        className={`font-extrabold tracking-tight text-slate-900 ${
          small ? "text-sm" : "text-[17px]"
        }`}
      >
        SportMates
      </span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[62px] max-w-[1160px] items-center justify-between px-5 sm:px-8">
          <BrandMark />

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-[13px] font-semibold text-slate-600 md:flex"
          >
            <Link href="#explore" className="transition hover:text-emerald-600">
              Explore
            </Link>
            <Link href="#how-it-works" className="transition hover:text-emerald-600">
              How It Works
            </Link>
            <Link href="#features" className="transition hover:text-emerald-600">
              Features
            </Link>
            <Link
              href="#for-you"
              className="flex items-center gap-1 transition hover:text-emerald-600"
            >
              For You <ChevronDown size={13} />
            </Link>
          </nav>

          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/login"
              className="px-1 text-[13px] font-bold text-slate-700 transition hover:text-emerald-600"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-700/20 transition hover:bg-emerald-700 sm:px-5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section
          id="explore"
          className="relative overflow-hidden bg-[#fbfaf7] pt-[88px] sm:pt-[98px]"
        >
          <div className="mx-auto grid max-w-[1160px] items-center gap-8 px-5 pb-12 sm:px-8 md:pb-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:pb-12">
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
                <UsersRound size={14} />
                The ultimate sports network
              </div>
              <h1 className="max-w-[560px] text-[42px] font-extrabold leading-[1.04] tracking-[-0.045em] text-slate-900 sm:text-5xl lg:text-[54px]">
                Find Partners.
                <span className="block">
                  <span className="text-emerald-600">Book Courts.</span> Play.
                </span>
              </h1>
              <p className="mt-4 max-w-[450px] text-[14px] leading-[1.7] text-slate-600 sm:text-[15px]">
                SportMate is the secure sports partner matching and court booking
                platform. Find players at your skill level, chat securely, and
                secure courts instantly.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="rounded-full bg-emerald-600 px-5 py-3 text-[13px] font-bold text-white shadow-md shadow-emerald-700/15 transition hover:bg-emerald-700"
                >
                  Join the Community
                </Link>
                <Link
                  href="#how-it-works"
                  className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <Play size={15} fill="currentColor" />
                  See How It Works
                </Link>
              </div>
            </div>

            <div className="relative mx-auto h-[260px] w-full max-w-[580px] sm:h-[340px] lg:h-[330px]">
              <div className="absolute inset-x-4 inset-y-1 rounded-[42%] bg-[#dff3e9] sm:inset-x-8" />
              <div className="absolute inset-x-7 inset-y-2 rotate-[2deg] overflow-hidden rounded-[28px] border-[5px] border-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] sm:inset-x-12">
                <Image
                  src="/basketball-hero.jpg"
                  alt="A basketball ready for a game on an outdoor court"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 560px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />
              </div>

              <div className="absolute right-0 top-4 flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg sm:right-1 sm:top-6 sm:px-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <UsersRound size={17} />
                </span>
                <span>
                  <span className="block text-[11px] font-extrabold text-slate-900 sm:text-xs">
                    Find your perfect match
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    Players at your level
                  </span>
                </span>
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                  ✓
                </span>
              </div>

              <div className="absolute bottom-4 left-0 flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-lg sm:bottom-5 sm:left-1 sm:px-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <span className="text-lg leading-none">🏀</span>
                </span>
                <span>
                  <span className="block text-[11px] font-extrabold text-slate-900 sm:text-xs">
                    Basketball
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    Nearby · Today
                  </span>
                </span>
                <ArrowRight size={15} className="ml-1 text-slate-400" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-[1160px] px-5 py-8 sm:px-8 sm:py-9"
        >
          <SectionHeading
            title="How It Works"
            subtitle="Get started in just a few simple steps."
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 pt-5 md:grid-cols-4 md:gap-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative flex flex-col items-center px-2 text-center"
                >
                  <span className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon size={22} strokeWidth={2.3} />
                  </span>
                  <h3 className="text-[12px] font-extrabold text-slate-900 sm:text-[13px]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[190px] text-[11px] leading-[1.6] text-slate-500 sm:text-xs">
                    {step.description}
                  </p>
                  {index < steps.length - 1 && (
                    <ArrowRight
                      aria-hidden="true"
                      size={17}
                      className="absolute right-[-11px] top-4 hidden text-slate-300 md:block"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-[1160px] px-5 pb-8 pt-5 sm:px-8 sm:pb-9"
        >
          <SectionHeading
            title="Why Choose SportMate?"
            subtitle="More than just a platform — it’s your sports community."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-emerald-100 hover:shadow-md sm:p-5"
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon size={19} strokeWidth={2.4} />
                  </span>
                  <h3 className="text-[12px] font-extrabold text-slate-900 sm:text-[13px]">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-[1.6] text-slate-500 sm:text-xs">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="for-you" className="bg-[#f5faf7]">
          <div className="mx-auto max-w-[1160px] px-5 py-8 sm:px-8 sm:py-9">
            <SectionHeading
              title="Who is it for?"
              subtitle="We bring players and venue owners together."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {audiences.map((audience) => {
                const Icon = audience.icon;
                return (
                  <article
                    key={audience.title}
                    className="relative min-h-[172px] overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,0.025)] sm:p-5"
                  >
                    <div className="relative z-10 max-w-[70%]">
                      <div className="mb-2.5 flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <Icon size={18} fill="currentColor" />
                        </span>
                        <span>
                          <h3 className="text-[13px] font-extrabold text-slate-900">
                            {audience.title}
                          </h3>
                          <p className="text-[10px] text-slate-500">
                            {audience.subtitle}
                          </p>
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {audience.points.map((point) => (
                          <li
                            key={point}
                            className="flex items-center gap-1.5 text-[10px] text-slate-600 sm:text-[11px]"
                          >
                            <Check
                              size={12}
                              strokeWidth={3}
                              className="shrink-0 text-emerald-500"
                            />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div
                      aria-hidden="true"
                      className={`absolute bottom-0 right-0 top-0 w-[37%] overflow-hidden ${
                        audience.visual === "players"
                          ? "bg-gradient-to-br from-emerald-50 via-[#dff3e9] to-emerald-100"
                          : "bg-gradient-to-br from-sky-50 via-[#d8f1ed] to-emerald-100"
                      }`}
                    >
                      <div className="absolute -right-8 top-5 h-24 w-24 rounded-full border border-white/80" />
                      <div className="absolute -right-3 top-10 h-16 w-16 rounded-full border border-white/80" />
                      {audience.visual === "players" ? (
                        <UsersRound
                          size={42}
                          strokeWidth={1.5}
                          className="absolute bottom-7 right-6 text-emerald-700/65"
                        />
                      ) : (
                        <MapPin
                          size={42}
                          strokeWidth={1.5}
                          className="absolute bottom-7 right-6 text-emerald-700/65"
                        />
                      )}
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/80 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                        {audience.visual === "players" ? "Find your team" : "Courts nearby"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col gap-4 rounded-xl border border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div className="sm:flex-1">
                <h3 className="text-[12px] font-extrabold text-slate-800">
                  A Safe &amp; Trusted Community
                </h3>
                <p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px]">
                  Your safety and privacy matter to us.
                </p>
              </div>
              <TrustItem
                icon={<ShieldCheck size={19} strokeWidth={2.5} />}
                title="Secure Sessions"
                description="Encrypted chats and safe in-app communication."
              />
              <TrustItem
                icon={<UsersRound size={19} strokeWidth={2.5} />}
                title="Role-based Access"
                description="Verified users, role control, less risk, more trust."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-3 px-5 py-5 text-center sm:flex-row sm:px-8 sm:text-left">
        <BrandMark small />
        <p className="text-[10px] text-slate-400">
          © {new Date().getFullYear()} SportMate. All rights reserved.
        </p>
        <nav aria-label="Footer navigation" className="flex gap-4 text-[10px] text-slate-500">
          <Link href="#for-you" className="transition hover:text-emerald-600">
            About
          </Link>
          <Link href="#for-you" className="transition hover:text-emerald-600">
            Privacy
          </Link>
          <Link href="#for-you" className="transition hover:text-emerald-600">
            Terms
          </Link>
          <Link href="mailto:hello@sportmate.com" className="transition hover:text-emerald-600">
            Contact
          </Link>
        </nav>
      </footer>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block h-[3px] w-7 rounded-full bg-emerald-500" />
      <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-slate-900 sm:text-[22px]">
        {title}
      </h2>
      <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{subtitle}</p>
    </div>
  );
}

function TrustItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-slate-100 pt-3 sm:flex-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        {icon}
      </span>
      <span>
        <span className="block text-[10px] font-extrabold text-slate-700">
          {title}
        </span>
        <span className="mt-0.5 block max-w-[185px] text-[9px] leading-[1.5] text-slate-500 sm:text-[10px]">
          {description}
        </span>
      </span>
    </div>
  );
}
