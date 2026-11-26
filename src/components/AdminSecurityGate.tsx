import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { verifyAdminPassword, setAdminSessionUnlocked } from '../config/admin';
import { Button } from './ui/DesignSystem';

interface AdminSecurityGateProps {
  onUnlock: () => void;
  onCancel: () => void;
}

export function AdminSecurityGate({ onUnlock, onCancel }: AdminSecurityGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the master admin password.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    setTimeout(() => {
      if (verifyAdminPassword(password)) {
        setAdminSessionUnlocked(true, rememberDevice);
        setIsVerifying(false);
        onUnlock();
      } else {
        setIsVerifying(false);
        setError('Incorrect admin password. Access denied.');
      }
    }, 250);
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 sm:px-0">
      <div className="apple-card rounded-[32px] p-6 sm:p-8 border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FF2385] to-[#7C3AED] text-white flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950/60 text-[#E10B5C] dark:text-[#FF3888] text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Showmelove Super Admin</span>
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              Master Admin Access
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
              Enter your master administrator password to unlock financial visibility, user wallets, and withdrawal controls.
            </p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-master-password"
              className="text-xs font-bold text-[var(--text-secondary)] block"
            >
              Master Password
            </label>
            <div className="relative">
              <input
                id="admin-master-password"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter admin password"
                className="w-full h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-4 pr-11 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[#FF2385]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember on device checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded-md accent-[#FF2385]"
            />
            <span className="text-xs text-[var(--text-secondary)]">
              Keep admin unlocked on this device
            </span>
          </label>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-500 flex items-center gap-2 animate-in fade-in"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isVerifying || !password.trim()}
            >
              {isVerifying ? 'Verifying Credentials…' : 'Unlock Admin Console'}
            </Button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-2xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
