import { useState } from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useShowmelove } from '../context/ShowmeloveContext';
import type { UserRole } from '../types/showmelove';

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
    <div className="fixed bottom-16 right-3 md:bottom-5 md:right-5 z-40">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="demo-controls-toggle"
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-[#171314]/15 shadow-md text-xs font-semibold text-[#171314] inline-flex items-center gap-2 hover:bg-[#FFF0F2] transition-colors whitespace-nowrap"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#E62E45]" />
          <span>Demo: {state.activeRole}</span>
        </button>
      ) : (
        <div
          className="w-72 rounded-2xl bg-white border border-[#171314]/15 shadow-xl p-4 space-y-3"
          data-testid="demo-controls-drawer"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-bold text-[#171314]">
              Demo controls
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close demo controls"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5E5255] hover:bg-[#FDF8F3]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
                      ? 'border-[#E62E45] bg-[#FFF0F2]'
                      : 'border-[#171314]/10 bg-[#FDF8F3] hover:bg-white'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#171314]">{r.label}</p>
                  <p className="text-[10px] text-[#5E5255] truncate">{r.hint}</p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              void resetDemo().then(() => setOpen(false));
            }}
            data-testid="reset-demo-btn"
            className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#E62E45]/25 bg-white text-[#E62E45] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#FFF0F2] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset demo data</span>
          </button>
        </div>
      )}
    </div>
  );
}
