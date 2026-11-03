import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Leaf,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Validation Schemas
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get('mode') as AuthMode | null;
  const [mode, setMode] = useState<AuthMode>(urlMode || initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  const { user, signIn, signUp, signInWithGoogle, resetPasswordForEmail, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Compute redirect destination
  const redirectParam = searchParams.get('redirect');
  const fromState = (location.state as { from?: { pathname: string; search?: string } })?.from;
  const from =
    redirectParam ||
    (fromState ? `${fromState.pathname}${fromState.search || ''}` : '/');

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (user && mode !== 'reset') {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate, mode]);

  // Sync mode with URL param if it changes (e.g. ?mode=reset from email recovery link)
  useEffect(() => {
    if (urlMode) {
      setMode(urlMode);
    }
  }, [urlMode]);

  // Form hooks
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const forgotForm = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Handle Login Submit
  async function handleLogin(data: LoginForm) {
    const { error } = await signIn(data.email, data.password);
    if (error) {
      if (error.toLowerCase().includes('invalid login credentials')) {
        toast.error('Incorrect email or password. Please try again.');
      } else if (error.toLowerCase().includes('email not confirmed')) {
        toast.error('Please verify your email address before logging in.');
      } else {
        toast.error(error);
      }
    } else {
      toast.success('Welcome back to Wewala Stores!');
      navigate(from, { replace: true });
    }
  }

  // Handle Signup Submit
  async function handleSignup(data: SignupForm) {
    const { error, needsEmailVerification } = await signUp(data.email, data.password, data.fullName);
    if (error) {
      if (error.toLowerCase().includes('already registered')) {
        toast.error('An account with this email already exists. Try signing in.');
      } else {
        toast.error(error);
      }
    } else if (needsEmailVerification) {
      setVerificationEmailSent(data.email);
      toast.success('Verification link sent! Check your inbox.');
    } else {
      toast.success('Account created successfully! Welcome aboard.');
      navigate(from, { replace: true });
    }
  }

  // Handle Google OAuth
  async function handleGoogleSignIn() {
    setOauthLoading(true);
    try {
      const { error } = await signInWithGoogle(from);
      if (error) {
        toast.error(error || 'Google Sign-In failed.');
      }
    } catch (err: any) {
      toast.error('Could not connect to Google OAuth.');
    } finally {
      setOauthLoading(false);
    }
  }

  // Handle Forgot Password
  async function handleForgotPassword(data: ForgotForm) {
    const { error } = await resetPasswordForEmail(data.email);
    if (error) {
      toast.error(error);
    } else {
      setResetEmailSent(data.email);
      toast.success('Password reset email sent! Check your inbox.');
    }
  }

  // Handle Password Reset
  async function handleResetPassword(data: ResetForm) {
    const { error } = await updatePassword(data.password);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Your password has been updated successfully!');
      navigate('/account', { replace: true });
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Leaf className="text-brand-600 dark:text-brand-400" size={32} />
            <span className="text-2xl tracking-tight">
              Wewala<span className="text-brand-600 dark:text-brand-400">.</span>
            </span>
          </Link>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set New Password'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {mode === 'login' && 'Sign in to access your orders and saved wishlist'}
            {mode === 'signup' && 'Join Wewala Stores for fresh deliveries and rewards'}
            {mode === 'forgot' && "Enter your email and we'll send recovery instructions"}
            {mode === 'reset' && 'Choose a strong password with at least 8 characters'}
          </p>
        </div>

        {/* Tab Toggle (Visible for Login & Signup) */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setVerificationEmailSent(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setVerificationEmailSent(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Card Container */}
        <div className="card p-6 shadow-lg md:p-8">
          {/* ============================================================== */}
          {/* 1. SIGN IN MODE                                               */}
          {/* ============================================================== */}
          {mode === 'login' && (
            <div className="space-y-5">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading}
                className="btn-secondary w-full flex items-center justify-center gap-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{oauthLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                <span className="absolute bg-white px-3 text-xs uppercase tracking-wider text-slate-400 dark:bg-slate-900">
                  Or email
                </span>
              </div>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <label className="label mb-1.5 flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400" /> Email Address
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="input"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="error-text mt-1">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="label flex items-center gap-1.5">
                      <Lock size={14} className="text-slate-400" /> Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="input pr-10"
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="error-text mt-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2"
                >
                  {loginForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. SIGN UP MODE                                               */}
          {/* ============================================================== */}
          {mode === 'signup' && (
            <div>
              {/* Email Verification Sent Feedback Message */}
              {verificationEmailSent ? (
                <div className="text-center py-4 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Mail size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Verification Link Sent!
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    We've sent a confirmation email to{' '}
                    <strong className="text-slate-900 dark:text-white">{verificationEmailSent}</strong>.
                    Please check your inbox (and spam folder) and click the link to activate your
                    account.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="btn-primary w-full"
                    >
                      Proceed to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={oauthLoading}
                    className="btn-secondary w-full flex items-center justify-center gap-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 shadow-sm"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{oauthLoading ? 'Connecting...' : 'Sign up with Google'}</span>
                  </button>

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                    <span className="absolute bg-white px-3 text-xs uppercase tracking-wider text-slate-400 dark:bg-slate-900">
                      Or details
                    </span>
                  </div>

                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <div>
                      <label className="label mb-1.5 flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" /> Full Name
                      </label>
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. Kasun Perera"
                        className="input"
                        {...signupForm.register('fullName')}
                      />
                      {signupForm.formState.errors.fullName && (
                        <p className="error-text mt-1">{signupForm.formState.errors.fullName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="label mb-1.5 flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400" /> Email Address
                      </label>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="input"
                        {...signupForm.register('email')}
                      />
                      {signupForm.formState.errors.email && (
                        <p className="error-text mt-1">{signupForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="label mb-1.5 flex items-center gap-1.5">
                        <Lock size={14} className="text-slate-400" /> Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="input pr-10"
                          {...signupForm.register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {signupForm.formState.errors.password && (
                        <p className="error-text mt-1">{signupForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="label mb-1.5 flex items-center gap-1.5">
                        <Lock size={14} className="text-slate-400" /> Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="input pr-10"
                          {...signupForm.register('confirmPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {signupForm.formState.errors.confirmPassword && (
                        <p className="error-text mt-1">
                          {signupForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={signupForm.formState.isSubmitting}
                      className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2"
                    >
                      {signupForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={16} /> Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. FORGOT PASSWORD MODE                                       */}
          {/* ============================================================== */}
          {mode === 'forgot' && (
            <div>
              {resetEmailSent ? (
                <div className="text-center py-4 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Check Your Inbox
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Instructions to reset your password have been sent to{' '}
                    <strong className="text-slate-900 dark:text-white">{resetEmailSent}</strong>.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmailSent(null);
                        setMode('login');
                      }}
                      className="btn-primary w-full"
                    >
                      Return to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                  <div>
                    <label className="label mb-1.5 flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-400" /> Registered Email Address
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="input"
                      {...forgotForm.register('email')}
                    />
                    {forgotForm.formState.errors.email && (
                      <p className="error-text mt-1">{forgotForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotForm.formState.isSubmitting}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    {forgotForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Sending link...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <ArrowLeft size={14} /> Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. RESET NEW PASSWORD MODE                                    */}
          {/* ============================================================== */}
          {mode === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <div>
                <label className="label mb-1.5 flex items-center gap-1.5">
                  <Lock size={14} className="text-slate-400" /> New Password (min 8 chars)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input pr-10"
                    {...resetForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {resetForm.formState.errors.password && (
                  <p className="error-text mt-1">{resetForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="label mb-1.5 flex items-center gap-1.5">
                  <Lock size={14} className="text-slate-400" /> Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input pr-10"
                    {...resetForm.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="error-text mt-1">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={resetForm.formState.isSubmitting}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                {resetForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Updating password...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Navigation */}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          By signing in or creating an account, you agree to Wewala Stores'{' '}
          <Link to="/about" className="underline hover:text-slate-700 dark:hover:text-slate-200">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/about" className="underline hover:text-slate-700 dark:hover:text-slate-200">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <AuthPage initialMode="login" />;
}
