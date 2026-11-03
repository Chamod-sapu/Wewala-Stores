import { Link } from 'react-router-dom';
import {
  Leaf,
  ShieldCheck,
  Truck,
  Heart,
  Award,
  Users,
  ArrowRight,
  Sparkles,
  Target,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { aboutContent, ValueItem } from '@/config/aboutContent';
import { SEO } from '@/components/common/SEO';

// Helper to map icon name to Lucide icon component
function ValueIcon({ name }: { name: ValueItem['iconName'] }) {
  const iconProps = { size: 24, className: 'text-brand-600 dark:text-brand-400' };
  switch (name) {
    case 'leaf':
      return <Leaf {...iconProps} />;
    case 'shield-check':
      return <ShieldCheck {...iconProps} />;
    case 'truck':
      return <Truck {...iconProps} />;
    case 'heart':
      return <Heart {...iconProps} />;
    case 'award':
      return <Award {...iconProps} />;
    case 'users':
      return <Users {...iconProps} />;
    default:
      return <CheckCircle2 {...iconProps} />;
  }
}

export default function AboutPage() {
  const { hero, story, missionVision, stats, values, team, cta } = aboutContent;

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      <SEO
        title="About Our Story & Values"
        description="Learn about Wewala Stores' mission: partnering with Sri Lankan farmers and estates to bring fresh, authentic groceries directly to island households."
      />

      {/* ============================================================== */}
      {/* 1. HERO HEADER                                                 */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-950 via-brand-900 to-slate-900 text-white py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />
        
        <div className="section-container relative text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-300 backdrop-blur-sm mb-6">
            <Sparkles size={14} /> {hero.badge}
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            {hero.title}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-200">
              {hero.highlight}
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {hero.subtitle}
          </p>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. STATS SECTION                                               */}
      {/* ============================================================== */}
      <section className="-mt-12 relative z-10">
        <div className="section-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="card p-6 text-center transform transition-all duration-200 hover:-translate-y-1 hover:shadow-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm"
              >
                <p className="text-3xl sm:text-4xl font-black text-brand-600 dark:text-brand-400">
                  {stat.value}
                </p>
                <p className="mt-1 font-bold text-sm text-slate-900 dark:text-white">
                  {stat.label}
                </p>
                {stat.description && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {stat.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. OUR STORY                                                   */}
      {/* ============================================================== */}
      <section>
        <div className="section-container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Story Text */}
            <div className="space-y-6">
              <span className="badge-brand">{story.badge}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {story.heading}
              </h2>

              <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                {story.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {story.highlightQuote && (
                <div className="rounded-xl border-l-4 border-brand-500 bg-brand-50/50 p-4 italic text-sm text-brand-900 dark:bg-brand-950/20 dark:text-brand-200">
                  {story.highlightQuote}
                </div>
              )}
            </div>

            {/* Story Image */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-slate-200 shadow-xl dark:border-slate-800">
                <img
                  src={story.imageUrl}
                  alt="Wewala Stores Story"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              {story.imageCaption && (
                <p className="mt-2 text-center text-xs text-slate-500 italic">
                  {story.imageCaption}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. MISSION & VISION                                            */}
      {/* ============================================================== */}
      <section className="bg-slate-50 py-16 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="section-container">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Mission Card */}
            <div className="card p-8 space-y-4 border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-950/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {missionVision.missionTitle}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {missionVision.missionText}
              </p>
            </div>

            {/* Vision Card */}
            <div className="card p-8 space-y-4 border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-950/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <Compass size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {missionVision.visionTitle}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {missionVision.visionText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. CORE VALUES                                                 */}
      {/* ============================================================== */}
      <section>
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="badge-brand mb-2">Our Commitments</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Values That Guide Every Basket
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              We operate on principles of transparency, fairness, and uncompromising culinary quality.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <div
                key={i}
                className="card p-6 space-y-3 transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60">
                  <ValueIcon name={v.iconName} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{v.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. TEAM SECTION                                                */}
      {/* ============================================================== */}
      <section className="bg-slate-50 py-16 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="badge-brand mb-2">{team.badge}</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {team.heading}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{team.subheading}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {team.members.map((member, i) => (
              <div
                key={i}
                className="card overflow-hidden group text-center hover:shadow-md transition-all"
              >
                <div className="aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {member.name}
                  </h3>
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                    {member.role}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. CALL TO ACTION (CTA)                                        */}
      {/* ============================================================== */}
      <section>
        <div className="section-container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-800 to-emerald-700 p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl">
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-2xl" />

            <div className="relative max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {cta.title}
              </h2>
              <p className="text-brand-100 text-sm sm:text-base leading-relaxed">
                {cta.subtitle}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  to={cta.primaryButtonLink}
                  className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-800 shadow-md hover:bg-slate-100 transition-all inline-flex items-center gap-2"
                >
                  {cta.primaryButtonText} <ArrowRight size={16} />
                </Link>
                <Link
                  to={cta.secondaryButtonLink}
                  className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all"
                >
                  {cta.secondaryButtonText}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
