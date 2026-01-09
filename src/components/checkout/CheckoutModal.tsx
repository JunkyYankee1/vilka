"use client";

import { useEffect, useRef, useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { useCart } from "@/modules/cart/cartContext";
import { QuantityControls } from "@/components/QuantityControls";
import CheckoutSummary from "./CheckoutSummary";
import AddressPaymentStep from "./AddressPaymentStep";
import { useCheckoutDraft } from "./useCheckoutDraft";
import type { CheckoutStep } from "./types";
import AddressModal from "@/components/AddressModal";

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  baseItems: Array<{ id: string; name: string }>;
  currentAddressLabel: string;
  onAddressSelected: (label: string) => void;
};

export default function CheckoutModal({
  isOpen,
  onClose,
  baseItems,
  currentAddressLabel,
  onAddressSelected,
}: CheckoutModalProps) {
  const { entries, totals, offerStocks, add, remove, removeLine } = useCart();
  const { draft, updateDraft } = useCheckoutDraft();
  const [step, setStep] = useState<CheckoutStep>("summary");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Initialize draft address from currentAddressLabel if available
  useEffect(() => {
    if (isOpen && currentAddressLabel && currentAddressLabel !== "Указать адрес доставки" && !draft.addressLabel) {
      updateDraft({ addressLabel: currentAddressLabel });
    }
  }, [isOpen, currentAddressLabel, draft.addressLabel, updateDraft]);

  // Reset step when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("summary");
    }
  }, [isOpen]);

  // Lock scroll when modal opens, restore when it closes
  useEffect(() => {
    if (!isOpen) return;

    // Save current scroll position
    scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.width = "100%";

    return () => {
      // Restore scroll
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;

      // Restore scroll position
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (step === "addressPayment") {
          setStep("summary");
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, step]);

  // Handle backdrop click (desktop only - mobile uses full-height sheet)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close on backdrop click on desktop (not mobile)
    if (e.target === e.currentTarget && window.innerWidth >= 768) {
      if (step === "addressPayment") {
        setStep("summary");
      } else {
        onClose();
      }
    }
  };

  const handleAddressSelected = (label: string) => {
    updateDraft({ addressLabel: label });
    onAddressSelected(label);
    setIsAddressModalOpen(false);
  };

  if (!isOpen) return null;

  const formatMoney = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const handleContinueToAddress = () => {
    setStep("addressPayment");
  };

  const handleBackToSummary = () => {
    setStep("summary");
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 md:px-0"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="relative flex h-full w-full flex-col bg-white md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl md:shadow-vilka-soft"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-4 md:rounded-t-3xl md:px-6">
            <div className="flex items-center gap-3">
              {step === "addressPayment" && (
                <button
                  type="button"
                  onClick={handleBackToSummary}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-slate-700 transition-colors hover:bg-slate-100"
                  aria-label="Назад"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-slate-900">
                {step === "summary" ? "Оформление заказа" : "Адрес и оплата"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-4 md:px-6 md:py-6">
              {step === "summary" ? (
                /* Step 1: Cart Summary */
                <>
                  {entries.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-600">Ваша корзина пуста</div>
                  ) : (
                    <div className="space-y-4">
                      {entries.map(({ offer, quantity, lineTotal, lineOldPrice }) => {
                        const isSoldOut = ((offerStocks[offer.id] ?? offer.stock) ?? 0) <= 0;
                        const base = baseItems.find((i) => i.id === offer.baseItemId);

                        return (
                          <div
                            key={offer.id}
                            className="group relative flex items-start gap-4 rounded-3xl bg-white p-4 border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() => removeLine(offer.id)}
                              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                              aria-label="Удалить"
                              title="Удалить"
                            >
                              <span className="text-xl leading-none">×</span>
                            </button>

                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-surface-soft">
                              {offer.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={offer.imageUrl}
                                  alt={offer.menuItemName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="px-2 text-center text-[11px] font-medium text-slate-500">
                                  пока ещё нет фото!
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 pr-10">
                              <div className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                                {offer.menuItemName}
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <QuantityControls
                                  quantity={quantity}
                                  onAdd={() => add(offer.id)}
                                  onRemove={() => remove(offer.id)}
                                  canAdd={!isSoldOut}
                                  size="md"
                                />

                                <div className="flex max-w-[120px] flex-col items-end gap-0.5 text-right">
                                  {lineOldPrice ? (
                                    <div className="whitespace-nowrap text-xs font-semibold text-slate-300 line-through tabular-nums">
                                      {formatMoney.format(lineOldPrice)} ₽
                                    </div>
                                  ) : (
                                    <div className="h-4" />
                                  )}
                                  <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-slate-900 tabular-nums">
                                    {formatMoney.format(lineTotal)} ₽
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Step 2: Address & Payment */
                <AddressPaymentStep
                  draft={draft}
                  onUpdateDraft={updateDraft}
                  onOpenAddressModal={() => setIsAddressModalOpen(true)}
                  totals={totals}
                />
              )}
            </div>
          </div>

          {/* Footer with summary and CTA */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 md:rounded-b-3xl md:px-6">
            {step === "summary" ? (
              <>
                <CheckoutSummary totals={totals} />
                <button
                  type="button"
                  onClick={handleContinueToAddress}
                  className="vilka-btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[28px] px-6 py-5 text-base font-semibold shadow-lg shadow-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98] transform-gpu"
                >
                  <span>Продолжить к адресу и оплате</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="vilka-btn-primary inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[28px] px-6 py-5 text-base font-semibold shadow-lg shadow-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98] transform-gpu"
              >
                <span>Ввести данные карты и оплатить {formatMoney.format(totals.totalPrice)} ₽</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reuse existing AddressModal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelectAddress={handleAddressSelected}
      />
    </>
  );
}
