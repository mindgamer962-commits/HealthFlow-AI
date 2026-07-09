import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Building2, AlertCircle, Key, Mail, Lock, Check, Send, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ApexLogo } from '../../components/ui/ApexLogo';

export const LoginPage: React.FC = () => {
  const { login, resetPasswordEmail, loading } = useAuthStore();
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please specify email and password credentials.");
      return;
    }

    try {
      await login(email, password, rememberMe);
      // Retrieve role to trigger route redirections
      const freshUser = useAuthStore.getState().user;
      if (freshUser?.role === 'District Health Administrator') {
        navigate('/dashboard');
      } else if (freshUser?.role === 'PHC Staff' || freshUser?.role === 'CHC Staff') {
        navigate('/phc-portal');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate credentials.");
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);

    if (!forgotEmail) {
      setError("Please specify your registered email address.");
      return;
    }

    try {
      await resetPasswordEmail(forgotEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to trigger recovery email.");
    }
  };

  const handleBypassPreFill = (role: 'Admin' | 'Staff') => {
    setError(null);
    if (role === 'Admin') {
      setEmail('admin@healthflow.gov.in');
      setPassword('password123');
    } else {
      setEmail('staff@healthflow.gov.in');
      setPassword('staff123');
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col lg:flex-row transition-colors duration-200">
      
      {/* Left side: Premium Healthcare Illustration & Brand description */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-blue to-brand-darkBlue p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background vectors simulating DNA/Grid networks */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#FFF_1px,transparent_1px),linear-gradient(to_bottom,#FFF_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute right-[-10%] top-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-pulse" />
        
        {/* Header logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center text-brand-blue font-extrabold text-xl shadow-md">
            A
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block">HealthFlow AI</span>
            <span className="text-[10px] text-white/60 font-semibold tracking-wider uppercase">District Operations Platform</span>
          </div>
        </div>

        {/* Dynamic Vector Healthcare Illustration */}
        <div className="z-10 max-w-lg space-y-6 self-center my-auto">
          {/* Mock Vector Grid drawing a Clinic node network */}
          <div className="w-80 h-80 mx-auto opacity-80 relative flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full text-brand-orange drop-shadow-md" fill="currentColor">
              <path d="M100 15 L175 60 L175 140 L100 185 L25 140 L25 60 Z" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
              {/* Center Hospital Cross */}
              <rect x="85" y="85" width="30" height="30" fill="white" rx="6" />
              <rect x="95" y="75" width="10" height="50" fill="#0B4E9A" rx="2" />
              <rect x="75" y="95" width="50" height="10" fill="#0B4E9A" rx="2" />
              {/* Peripheral Nodes representing PHC links */}
              <circle cx="25" cy="60" r="10" fill="#EA6C13" />
              <circle cx="175" cy="60" r="10" fill="#22C55E" />
              <circle cx="175" cy="140" r="10" fill="#0B4E9A" />
              <circle cx="25" cy="140" r="10" fill="#EA6C13" />
            </svg>
          </div>

          <div className="space-y-3 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Intelligent District Triage & Resource Optimization
            </h2>
            <p className="text-sm text-white/85 leading-relaxed">
              Synchronize doctor attendances, track critical medicine inventories, and execute resource redirection requests across your medical network instantly.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-white/60 font-medium z-10 flex justify-between">
          <span>Powered by Gemini 2.0 Flash</span>
          <span>Team APEX Meghalaya</span>
        </div>
      </div>

      {/* Right side: Authentication Card forms */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
        {/* Brand logo header on mobile */}
        <div className="lg:hidden mb-8 flex flex-col items-center">
          <ApexLogo variant="large" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-slate-200 rounded-apex shadow-apex p-8"
        >
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-status-critical rounded-xl text-xs font-bold flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Password recovery instructions dispatched! Check inbox.</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!isForgotMode ? (
              /* LOGIN STATE */
              <motion.div
                key="login-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-800">
                    Console Credentials Login
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Please specify your registered administrative key identifiers.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Console Username</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. admin@healthflow.gov.in"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 block">Security Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setIsForgotMode(true);
                        }}
                        className="text-[10px] font-bold text-brand-orange hover:underline focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded text-brand-blue focus:ring-brand-blue border-slate-350 cursor-pointer"
                    />
                    <label htmlFor="remember-me" className="ml-2 text-xs font-bold text-slate-500 cursor-pointer select-none">
                      Keep me logged in (Persistent Session)
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-1.5 py-3 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all-ease shadow-sm hover:shadow disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Authorize Console Node
                      </>
                    )}
                  </button>
                </form>

                {/* Simulation Pre-fill Shortcut Drawer */}
                <div className="pt-5 border-t border-slate-100 space-y-3">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-brand-orange" /> Sandbox simulation pre-fills
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <button
                      onClick={() => handleBypassPreFill('Admin')}
                      className="flex items-center justify-center gap-1.5 p-2.5 bg-brand-blue/5 border border-brand-blue/15 text-brand-blue rounded-xl hover:bg-brand-blue/10 transition-colors"
                    >
                      <Bot className="h-3.5 w-3.5 shrink-0" />
                      District Admin
                    </button>
                    <button
                      onClick={() => handleBypassPreFill('Staff')}
                      className="flex items-center justify-center gap-1.5 p-2.5 bg-brand-orange/5 border border-brand-orange/15 text-brand-orange rounded-xl hover:bg-brand-orange/10 transition-colors"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      PHC Staff
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* PASSWORD RECOVERY STATE */
              <motion.div
                key="recovery-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-800">
                    Credential Recovery Requisition
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Provide your username email to dispatcher credentials reset token.
                  </p>
                </div>

                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Registered Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. user@healthflow.gov.in"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-1.5 py-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs rounded-xl transition-all-ease shadow-sm hover:shadow"
                  >
                    {loading ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Dispatch Reset Token
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setResetSent(false);
                      setIsForgotMode(false);
                    }}
                    className="w-full flex items-center justify-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to credentials login
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
export default LoginPage;
