import { useState } from 'react';
import { RotateCcw, Shield, SlidersHorizontal, X } from 'lucide-react';
import { useShowmelove } from '../context/ShowmeloveContext';
import type { UserRole } from '../types/showmelove';
import { ThemeSwitcher } from './ui/DesignSystem';

interface DemoControlsPanelProps {
  onNavigateAdmin?: () => void;
}

export function DemoControlsPanel({ onNavigateAdmin }: DemoControlsPanelProps) {
  const { state, switchRole, resetDemo } = useShowmelove();
  const [open, setOpen] = useState(false);

  const roles: Array<{ id: UserRole; label: string; hint: string }> = [
    { id: 'guest', label: 'Guest', hint: 'No sign-in' },
    { id: 'sender', label: 'Sender', hint: 'tunde@showmelove.ng' },
    { id: 'recipient', label: 'Recipient', hint: 'ada@showmelove.ng' },
    { id: 'admin', label: 'Admin', hint: 'Catalog & payouts' },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="demo-controls-toggle"
        aria-expanded={open}
        aria-label="Account, theme, and demo controls"
        className="relative z-50 min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 hover:border-[#8439D5]/45 dark:hover:border-[#A855F7]/45 transition-colors whitespace-nowrap"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#DF0756] dark:text-[#FF176C]" />
        <span className="capitalize">{state.activeRole}</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-12 z-50 w-76 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-4 space-y-3.5"
            data-testid="demo-controls-drawer"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Appearance &amp; Demo Role
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close demo controls"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Theme</p>
              <ThemeSwitcher />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Switch account</p>
              <div className="grid grid-cols-2 gap-1.5">
                {roles.map((r) => {
                  const active = state.activeRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        switchRole(r.id);
                        if (r.id === 'admin' && onNavigateAdmin) {
                          onNavigateAdmin();
                          setOpen(false);
                        }
                      }}
                      className={`p-2 rounded-xl border text-left transition-colors ${
                        active
                          ? 'border-[#DF0756] dark:border-[#FF176C] bg-[#FFEAF2] dark:bg-[#2B1726]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-raised)] hover:border-[#8439D5]/45'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {r.label}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">
                        {r.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {onNavigateAdmin && (
              <button
                type="button"
                onClick={() => {
                  onNavigateAdmin();
                  setOpen(false);
                }}
                data-testid="open-admin-from-menu-btn"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 hover:border-[#8439D5]/45"
              >
                <Shield className="w-3.5 h-3.5 text-[#8439D5] dark:text-[#A855F7]" />
                <span>Open Admin Console</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                void resetDemo().then(() => setOpen(false));
              }}
              data-testid="reset-demo-btn"
              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#DF0756]/30 dark:border-[#FF176C]/35 bg-[var(--bg-card)] text-[#DF0756] dark:text-[#FF7AA8] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[var(--bg-raised)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset demo data</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
