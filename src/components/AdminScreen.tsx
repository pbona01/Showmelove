import { CheckCircle2, Shield, XCircle } from 'lucide-react';
import { formatNaira } from '../config/economy';
import { useShowmelove } from '../context/ShowmeloveContext';
import type { CollectionId } from '../types/showmelove';
import { GiftArtworkSvg } from './GiftArtwork';

export function AdminScreen() {
  const { state, updateCatalogItem, setSeasonalConfig, resolvePayout } = useShowmelove();

  const pendingPayouts = state.payoutRequests.filter((p) => p.status === 'pending');

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#E62E45]">
            Demo admin console · Persists across refreshes
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#171314] mt-1">
            Catalog &amp; Payout Operations
          </h1>
          <p className="text-sm text-[#5E5255] mt-1">
            Changes update the live catalog immediately. Previously sent gifts keep their own snapshot so old links still replay as originally sent.
          </p>
        </div>
        <Shield className="w-6 h-6 text-[#171314] shrink-0 hidden sm:block" />
      </div>

      {/* Seasonal Drop Control */}
      <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="font-display text-lg font-bold text-[#171314]">
            Active seasonal collection
          </h2>
          <p className="text-xs text-[#5E5255] mt-0.5">
            Toggle whether the Valentine&apos;s seasonal drop appears in the public catalog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#171314] cursor-pointer">
            <input
              type="checkbox"
              checked={state.seasonalDropEnabled}
              onChange={(e) =>
                setSeasonalConfig(state.activeSeasonalCollection, e.target.checked)
              }
              className="w-4 h-4 accent-[#E62E45]"
            />
            <span>Show Valentine&apos;s Drop</span>
          </label>
        </div>
      </section>

      {/* Catalog Editor */}
      <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-5 shadow-sm">
        <h2 className="font-display text-xl font-bold text-[#171314]">
          Gift catalog editor
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.catalog.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#171314]/10 bg-[#FDF8F3] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.accentColor || '#FFF0F2' }}
                  >
                    <GiftArtworkSvg artworkId={item.artworkId} className="w-9 h-9" />
                  </div>
                  <div>
                    <p className="text-xs text-[#5E5255]">
                      Animation: {item.animationType}
                    </p>
                    <p className="font-display text-base font-bold text-[#171314]">
                      {item.name}
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#171314] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.available}
                    onChange={(e) =>
                      updateCatalogItem(item.id, { available: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#E62E45]"
                  />
                  <span>Available</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`admin-name-${item.id}`}
                    className="block text-xs text-[#5E5255] mb-1"
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
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#171314]/12 bg-white text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`admin-price-${item.id}`}
                    className="block text-xs text-[#5E5255] mb-1"
                  >
                    Default price (₦)
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
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#171314]/12 bg-white text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`admin-collection-${item.id}`}
                    className="block text-xs text-[#5E5255] mb-1"
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
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#171314]/12 bg-white text-sm"
                  >
                    <option value="evergreen">Evergreen</option>
                    <option value="valentines">Valentine&apos;s Drop</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`admin-theme-${item.id}`}
                    className="block text-xs text-[#5E5255] mb-1"
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
                      className="w-10 h-9 rounded-lg border border-[#171314]/15 bg-white cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[#5E5255]">
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
      <section className="rounded-3xl bg-white border border-[#171314]/8 p-5 sm:p-6 space-y-4 shadow-sm">
        <h2 className="font-display text-xl font-bold text-[#171314]">
          Pending demo payout requests ({pendingPayouts.length})
        </h2>

        {state.payoutRequests.length === 0 ? (
          <p className="text-sm text-[#5E5255]">
            No payout requests yet. Request a demo withdrawal from the Withdraw screen to test approval or rejection.
          </p>
        ) : (
          <div className="divide-y divide-[#171314]/8">
            {state.payoutRequests.map((p) => (
              <div
                key={p.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-display text-base font-bold tabular-nums text-[#171314]">
                    {formatNaira(p.amountNaira)} · {p.recipientEmail}
                  </p>
                  <p className="text-xs text-[#5E5255]">
                    {p.bankAccount.bankName} ({p.bankAccount.accountNumber}) · Status:{' '}
                    <strong className="text-[#171314]">
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
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#171314] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#2c2527]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Approve payout</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        resolvePayout(p.id, 'failed', 'Rejected by demo admin — funds returned.')
                      }
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#E62E45]/30 bg-white text-[#E62E45] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#FFF0F2]"
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
    </div>
  );
}
