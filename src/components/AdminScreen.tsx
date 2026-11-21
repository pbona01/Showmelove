import { CheckCircle2, Shield, XCircle } from 'lucide-react';
import { formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import type { CollectionId } from '../types/showmelove';
import { GiftArtworkSvg } from './GiftArtwork';
import { Reveal } from './ui/MotionPrimitives';

export function AdminScreen() {
  const { state, updateCatalogItem, setSeasonalConfig, resolvePayout } = useShowmelove();

  const pendingPayouts = state.payoutRequests.filter((p) => p.status === 'pending');

  return (
    <Reveal type="slide-up" className="max-w-5xl mx-auto pb-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#8439D5] dark:text-[#A855F7]">
            Demo admin console · Persists across refreshes
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mt-1">
            Catalog &amp; Payout Operations
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Changes update the live catalog immediately. Previously sent gifts keep their own snapshot so old links replay as originally sent.
          </p>
        </div>
        <Shield className="w-6 h-6 text-[var(--text-primary)] shrink-0 hidden sm:block" />
      </div>

      {/* Seasonal Drop Control */}
      <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Active seasonal collection
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Toggle whether the Valentine&apos;s seasonal drop appears in the public catalog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={state.seasonalDropEnabled}
              onChange={(e) =>
                setSeasonalConfig(state.activeSeasonalCollection, e.target.checked)
              }
              className="w-4 h-4 accent-[#DF0756] dark:accent-[#FF176C]"
            />
            <span>Show Valentine&apos;s Drop</span>
          </label>
        </div>
      </section>

      {/* Catalog Editor */}
      <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-5 shadow-sm">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Gift catalog editor
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.catalog.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#F4ECF8] dark:bg-[#241E30] border border-[var(--border-subtle)]">
                    <GiftArtworkSvg artworkId={item.artworkId} className="w-9 h-9" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Animation: {item.animationType}
                    </p>
                    <p className="text-base font-bold text-[var(--text-primary)]">
                      {item.name}
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.available}
                    onChange={(e) =>
                      updateCatalogItem(item.id, { available: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#DF0756] dark:accent-[#FF176C]"
                  />
                  <span>Available</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`admin-name-${item.id}`}
                    className="block text-xs text-[var(--text-secondary)] mb-1"
                  >
                    Display name
                  </label>
                  <input
                    id={`admin-name-${item.id}`}
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      updateCatalogItem(item.id, { name: e.target.value })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`admin-price-${item.id}`}
                    className="block text-xs text-[var(--text-secondary)] mb-1"
                  >
                    Default price (Love Coins)
                  </label>
                  <input
                    id={`admin-price-${item.id}`}
                    type="number"
                    min={100}
                    max={100000}
                    step={100}
                    value={item.defaultPriceNaira}
                    onChange={(e) =>
                      updateCatalogItem(item.id, {
                        defaultPriceNaira: Math.max(100, Number(e.target.value) || 100),
                      })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`admin-collection-${item.id}`}
                    className="block text-xs text-[var(--text-secondary)] mb-1"
                  >
                    Collection
                  </label>
                  <select
                    id={`admin-collection-${item.id}`}
                    value={item.collectionId}
                    onChange={(e) =>
                      updateCatalogItem(item.id, {
                        collectionId: e.target.value as CollectionId,
                      })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]"
                  >
                    <option value="evergreen">Classic</option>
                    <option value="valentines">Valentine&apos;s Drop</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`admin-theme-${item.id}`}
                    className="block text-xs text-[var(--text-secondary)] mb-1"
                  >
                    Theme color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`admin-theme-${item.id}`}
                      type="color"
                      value={item.themeColor}
                      onChange={(e) =>
                        updateCatalogItem(item.id, { themeColor: e.target.value })
                      }
                      className="w-10 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      {item.themeColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payout Approvals */}
      <section className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4 shadow-sm">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Pending demo payout requests ({pendingPayouts.length})
        </h2>

        {state.payoutRequests.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No payout requests yet. Request a demo withdrawal from the Withdraw Rewards screen to test approval or rejection.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {state.payoutRequests.map((p) => (
              <div
                key={p.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-base font-bold tabular-nums text-[var(--text-primary)]">
                    {formatNaira(p.amountNaira)} · {p.recipientEmail}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {p.bankAccount.bankName} ({p.bankAccount.accountNumber}) · Status:{' '}
                    <strong className="text-[var(--text-primary)]">
                      {p.status === 'completed'
                        ? 'Paid'
                        : p.status === 'pending'
                          ? 'Pending'
                          : 'Failed'}
                    </strong>
                  </p>
                </div>

                {p.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => resolvePayout(p.id, 'completed')}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#201727] dark:bg-[#25212E] text-white text-xs font-semibold inline-flex items-center gap-1.5 border border-white/10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#24C888]" />
                      <span>Approve payout</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        resolvePayout(p.id, 'failed', 'Rejected by demo admin — funds returned.')
                      }
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DF0756]/35 dark:border-[#FF176C]/35 bg-[var(--bg-card)] text-[#DF0756] dark:text-[#FF7AA8] text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject &amp; refund</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </Reveal>
  );
}
