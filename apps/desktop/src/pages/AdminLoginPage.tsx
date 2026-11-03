import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  MonitorCheck,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { STORE_CONFIG } from '@wewala/shared';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAdmin } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in as admin, redirect to dashboard
  if (user && isAdmin) {
    navigate('/', { replace: true });
  }

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await login(email.trim(), password);

    if (error) {
      setErrorMessage(error);
      setIsSubmitting(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 p-4 text-slate-100 select-none">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-lg shadow-brand-500/5 mb-4">
            <MonitorCheck size={36} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {STORE_CONFIG.name} POS & Admin
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Storefront Operations & Database Management Console
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          {/* Access Warning Banner */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-300">
            <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-400" />
            <p className="leading-relaxed">
              <strong>Restricted Access:</strong> Only accounts with verified <code>admin</code>{' '}
              role in Supabase can access this terminal.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-0.5">
                <p className="font-bold">Access Denied</p>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@wewalastores.lk"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock size={14} className="text-slate-400" /> Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Verifying Role...
                </>
              ) : (
                <>
                  <KeyRound size={16} /> Sign In to Console
                </>
              )}
            </button>
          </form>

          {/* Supabase Security Footer */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="text-brand-500" />
            <span>Supabase RLS Protected • Security Definer Policies</span>
          </div>
        </div>
      </div>
    </div>
  );
}

