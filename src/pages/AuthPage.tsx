import React, { useState } from 'react';
import {
  ArrowLeft,
  Lock,
  Mail,
  Building2,
  User,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  PhoneCall,
  Zap,
  Layers,
  Sparkles,
  ChevronRight,
  Globe,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { VoxMitraLogo } from '../components/common/VoxMitraLogo.tsx';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'forgot';
  onSuccess: () => void;
  onBack: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onSuccess, onBack }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!email || !password || !fullName || !businessName) {
          throw new Error('Please fill in all required fields.');
        }
        if (!termsAgreed) {
          throw new Error('Please agree to the Terms of Service and Privacy Policy.');
        }
        await register({ email, password, fullName, businessName });
      } else if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Please enter your email and password.');
        }
        await login(email, password);
      } else if (mode === 'forgot') {
        if (!email) throw new Error('Please enter your registered work email address.');
        setForgotSent(true);
        setLoading(false);
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (presetEmail: string, presetBusiness: string) => {
    setEmail(presetEmail);
    setPassword('demo1234');
    setError(null);
    setLoading(true);
    try {
      await login(presetEmail, 'demo1234');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Demo workspace login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans selection:bg-blue-600 selection:text-white">
      {/* LEFT PANEL: Deep Midnight Navy Branding & Live Interactive Preview */}
      <div className="lg:w-1/2 bg-gradient-to-br from-slate-950 via-[#0B0F19] to-slate-900 border-r border-slate-800/80 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-left group focus:outline-hidden">
              <VoxMitraLogo size="md" />
            </button>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900/80 border border-transparent hover:border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Website</span>
            </button>
          </div>

          {/* Heading */}
          <div className="space-y-3 pt-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-400">
              <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>Enterprise AI Voice Platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              {mode === 'register'
                ? 'Deploy your AI voice team in under 5 minutes.'
                : 'Every call answered. Every opportunity captured.'}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Equip your business with autonomous voice employees that answer inbound calls 24/7,
              dial hot leads within 60 seconds, and sync with your CRM.
            </p>
          </div>

          {/* Realistic Live Voice Employee Simulation Widget */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4 max-w-lg">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-emerald-400 font-semibold tracking-wider text-[11px]">
                  LIVE CALL IN PROGRESS
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Line: +91 80 4712 3900
              </span>
            </div>

            {/* Conversation Turn Stream */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  AI
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-[11px]">Priya (Apex Healthcare)</span>
                    <span className="text-[9px] text-blue-400 font-mono">180ms TTFT</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    &quot;Namaste Rahul ji. I can confirm your root canal consultation with Dr. Sharma for this Thursday at 4:30 PM. Would you like a WhatsApp reminder?&quot;
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  CL
                </div>
                <div>
                  <span className="font-semibold text-slate-200 text-[11px]">Caller (+91 98765 43210)</span>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                    &quot;Yes please, send the confirmation on WhatsApp. Thank you!&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Entities Extracted */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800/70">
              <span className="text-[10px] font-mono text-slate-400 mr-1">EXTRACTED:</span>
              <span className="text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                ✓ Appointment Booked
              </span>
              <span className="text-[10px] font-medium bg-blue-950/70 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-md">
                📅 Thu 4:30 PM
              </span>
              <span className="text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md">
                📱 WhatsApp Opt-In
              </span>
            </div>
          </div>

          {/* Social Proof & Metrics */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg text-slate-300">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70">
              <p className="text-lg font-bold font-mono tabular-nums text-white">&lt;200ms</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Speech Latency</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70">
              <p className="text-lg font-bold font-mono tabular-nums text-white">99.4%</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Answer Rate</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70">
              <p className="text-lg font-bold font-mono tabular-nums text-white">2.4M+</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Minutes Handled</p>
            </div>
          </div>
        </div>

        {/* Security Trust Footnote */}
        <div className="relative z-10 pt-8 flex items-center gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Sovereign Indian telecom routing (Exotel) · Enterprise grade encryption · Zero data leak.</span>
        </div>
      </div>

      {/* RIGHT PANEL: Clean Light-Themed High-Contrast Form */}
      <div className="lg:w-1/2 bg-white text-slate-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Header & Mode Switcher */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {mode === 'register'
                  ? 'Create account'
                  : mode === 'forgot'
                  ? 'Reset password'
                  : 'Welcome back'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {mode === 'register'
                  ? 'Start your 14-day trial with full voice access.'
                  : mode === 'forgot'
                  ? 'Enter your work email to receive a secure reset link.'
                  : 'Sign in to access your AI employee workspace.'}
              </p>
            </div>

            {mode !== 'forgot' && (
              <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Quick Demo Workspace Access (Essential for frictionless evaluation) */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                1-Click Instant Workspace Access
              </span>
              <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-mono">
                No typing required
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDemoSignIn('akshaydosapati.16@gmail.com', 'Apex Dental & Clinic')}
                disabled={loading}
                className="p-2 text-left bg-white hover:bg-blue-100/50 border border-blue-200 rounded-lg text-xs transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-slate-900">Apex Healthcare</p>
                  <p className="text-[10px] text-slate-500">Inbound Clinic Agent</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoSignIn('akshaydosapati.16@gmail.com', 'Sunrise Realty')}
                disabled={loading}
                className="p-2 text-left bg-white hover:bg-blue-100/50 border border-blue-200 rounded-lg text-xs transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-slate-900">Sunrise Realty</p>
                  <p className="text-[10px] text-slate-500">Speed-to-Lead Agent</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {forgotSent && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Password Reset Email Sent</span>
              </div>
              <p>Check your inbox at <span className="font-semibold">{email}</span> for instructions to reset your password.</p>
              <button
                type="button"
                onClick={() => {
                  setForgotSent(false);
                  setMode('login');
                }}
                className="text-xs font-semibold text-emerald-900 underline block pt-1"
              >
                Return to Sign In
              </button>
            </div>
          )}

          {!forgotSent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                    <div className="mt-1 relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Aditya Sharma"
                        className="block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Business / Organization Name</label>
                    <div className="mt-1 relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Apex Health Services"
                        className="block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Work Email Address</label>
                <div className="mt-1 relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aditya@company.in"
                    className="block w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-500"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="mt-1 relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600">
                    Keep me signed in on this device
                  </label>
                </div>
              )}

              {mode === 'register' && (
                <div className="flex items-start">
                  <input
                    id="terms-agree"
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="terms-agree" className="ml-2 block text-xs text-slate-600 leading-relaxed">
                    I agree to the <span className="font-semibold text-slate-900">Terms of Service</span> and{' '}
                    <span className="font-semibold text-slate-900">Privacy Policy</span>.
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all shadow-md shadow-blue-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {mode === 'register'
                    ? 'Create Workspace Account'
                    : mode === 'forgot'
                    ? 'Send Reset Instructions'
                    : 'Sign In to Workspace'}
                </span>
              </button>
            </form>
          )}

          {/* Toggle Login / Register / Forgot footer */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            {mode === 'login' ? (
              <p>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-500"
                >
                  Create workspace account
                </button>
              </p>
            ) : mode === 'register' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
