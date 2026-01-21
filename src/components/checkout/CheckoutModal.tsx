"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

import { useCart } from "@/modules/cart/cartContext";
import { QuantityControls } from "@/components/QuantityControls";
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

const ANIM_MS = 500;

// аккордеон корзины
const CART_PREVIEW_COUNT = 3;

// ширины модалки (desktop)
const WIDE_MAX_W = 1100; // широкий вид (корзина + скидки)
const NARROW_MAX_W = 620; // узкий вид (адрес/оплата)

const STEP_FADE_MS = 180;

type InputMode =
  | "none"
  | "text"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal"
  | "search";

function Thumb({ src }: { src?: string | null }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return <div className="h-9 w-9 rounded-xl border border-white bg-slate-200" aria-hidden="true" />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      className="h-9 w-9 rounded-xl border border-white object-cover bg-slate-100"
      onError={() => setBroken(true)}
    />
  );
}

/** Поле как в AddressModal: серый фон + float-label + зелёный focus */
function FloatingInput({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: InputMode;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder=" "
        className={[
          "peer h-12 w-full rounded-full bg-slate-100 px-5",
          "pt-6 pb-2 text-sm font-semibold text-slate-900",
          "placeholder:font-semibold placeholder:text-slate-400",
          "border border-transparent focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100",
        ].join(" ")}
      />
      <label
        htmlFor={id}
        className={[
          "pointer-events-none absolute left-5",
          "top-3 translate-y-0",
          "text-[11px] font-semibold text-slate-400 transition-all duration-200",
          "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm",
          "peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[11px]",
        ].join(" ")}
      >
        {label}
      </label>
    </div>
  );
}

/** Текстовое поле как в AddressModal: серый фон + float-label + зелёный focus (компактное) */
function FloatingTextarea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        rows={1}
        className={[
          "peer w-full resize-none rounded-[26px] bg-slate-100 px-5",
          "pt-6 pb-2 text-sm font-semibold text-slate-900",
          "placeholder:font-semibold placeholder:text-slate-400",
          "border border-transparent focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100",
          "min-h-[52px]",
        ].join(" ")}
      />
      <label
        htmlFor={id}
        className={[
          "pointer-events-none absolute left-5",
          "top-3 translate-y-0",
          "text-[11px] font-semibold text-slate-400 transition-all duration-200",
          "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm",
          "peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[11px]",
        ].join(" ")}
      >
        {label}
      </label>
    </div>
  );
}

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

  // open/close animation
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [closing, setClosing] = useState(false);

  const timerRef = useRef<number | null>(null);

  // width mode + fade between steps
  const [layoutMode, setLayoutMode] = useState<"wide" | "narrow">("wide");
  const [contentFade, setContentFade] = useState<"in" | "out">("in");

  const scrollPositionRef = useRef<number>(0);
  const leftScrollRef = useRef<HTMLDivElement | null>(null);

  // корзина аккордеон
  const [cartExpanded, setCartExpanded] = useState(true);
  const [cartShowAll, setCartShowAll] = useState(false);

  useEffect(() => setMounted(true), []);

  // Init draft address
  useEffect(() => {
    if (isOpen && currentAddressLabel && currentAddressLabel !== "Указать адрес доставки" && !draft.addressLabel) {
      updateDraft({ addressLabel: currentAddressLabel });
    }
  }, [isOpen, currentAddressLabel, draft.addressLabel, updateDraft]);

  // reset step on close
  useEffect(() => {
    if (!isOpen) setStep("summary");
  }, [isOpen]);

  // open/close lifecycle
  useEffect(() => {
    if (!mounted) return;

    if (isOpen) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    
      setShouldRender(true);
      setClosing(false);
    
      // старт всегда с "summary"
      setStep("summary");
      setLayoutMode("wide");
      setContentFade("in");
    
      // reset scroll
      requestAnimationFrame(() => {
        leftScrollRef.current?.scrollTo({ top: 0 });
      });
    
      // если позиций много — корзина по умолчанию свернута
      const many = entries.length > CART_PREVIEW_COUNT;
      setCartExpanded(!many);
      setCartShowAll(false);
    
      return;
    }
    

    if (!isOpen && shouldRender) {
      setClosing(true);
    
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
      }, ANIM_MS);
    }
    
  }, [isOpen, mounted, shouldRender, entries.length]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // lock page scroll while rendered
  useEffect(() => {
    if (!shouldRender) return;

    scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, [shouldRender]);

  const formatMoney = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  const titleAddress =
    (draft.addressLabel && draft.addressLabel !== "Указать адрес доставки" ? draft.addressLabel : "") ||
    (currentAddressLabel && currentAddressLabel !== "Указать адрес доставки" ? currentAddressLabel : "") ||
    "Указать адрес доставки";

  const thumbs = entries.slice(0, 3).map((e) => e.offer.imageUrl);
  const thumbsMore = Math.max(0, entries.length - 3);

  const hiddenCount = Math.max(0, entries.length - CART_PREVIEW_COUNT);
  const shownEntries = cartShowAll ? entries : entries.slice(0, CART_PREVIEW_COUNT);

  const recommend = (baseItems ?? []).slice(0, 18);

  // чтобы спокойно писать произвольные поля в draft (apartment/floor/entrance/...)
  const setDraftField = (key: string, value: any) => {
    updateDraft({ [key]: value } as any);
  };

  const selectedAddressLabel =
    (draft.addressLabel && draft.addressLabel !== "Указать адрес доставки" ? draft.addressLabel : "") ||
    (currentAddressLabel && currentAddressLabel !== "Указать адрес доставки" ? currentAddressLabel : "");

  const handleAddressSelected = (label: string) => {
    updateDraft({ addressLabel: label });
    onAddressSelected(label);
    setIsAddressModalOpen(false);
  };

  // ✅ Клик по пустой области: закрыть модалку
  const handleBackdropClick = () => {
    if (window.innerWidth < 768) return;
    onClose();
  };



  // ✅ Плавный переход summary -> addressPayment с сужением
  const goToAddressPayment = () => {
    if (step !== "summary") return;

    setLayoutMode("narrow");
    setContentFade("out");
    window.setTimeout(() => {
      setStep("addressPayment");
      setContentFade("in");
    }, STEP_FADE_MS);
  };

  // ✅ Назад: расширяем и возвращаем summary
  const goBackToSummary = () => {
    if (step !== "addressPayment") return;

    setLayoutMode("wide");
    setContentFade("out");
    window.setTimeout(() => {
      setStep("summary");
      setContentFade("in");
      requestAnimationFrame(() => leftScrollRef.current?.scrollTo({ top: 0 }));
    }, STEP_FADE_MS);
  };

  // ESC
  useEffect(() => {
    if (!shouldRender) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === "addressPayment") goBackToSummary();
      else onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [shouldRender, step, onClose]);

  if (!mounted || !shouldRender) return null;

  const maxW = layoutMode === "wide" ? WIDE_MAX_W : NARROW_MAX_W;

  return createPortal(
    <div className="fixed inset-0 z-40">
  {/* overlay — как у твоих drawer-модалок */}
  <div
    className={["profile-drawer-overlay absolute inset-0 bg-black/40", closing ? "closing" : ""].join(" ")}
    onClick={handleBackdropClick}
    aria-hidden="true"
  />

  {/* panel справа — как у твоих drawer-модалок */}
  <div
    className={[
      "profile-drawer-panel absolute inset-y-0 right-0 w-full p-4 sm:p-6",
      closing ? "closing" : "",
    ].join(" ")}
    onClick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-label="Оформление заказа"
    style={{
      maxWidth: maxW,
      transitionProperty: "max-width",
      transitionDuration: "500ms",
      transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    }}
  >

        <div className="relative flex h-full flex-col overflow-hidden rounded-[40px] bg-white shadow-vilka-soft">
          {/* Header */}
          <div className="shrink-0 bg-white px-6 pb-4 pt-6 sm:px-8 sm:pb-5 sm:pt-7">
            {step === "addressPayment" ? (
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={goBackToSummary}
                  className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                  aria-label="Назад"
                  title="Назад"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <h2 className="px-14 text-center text-[24px] font-semibold tracking-tight text-slate-900">
                  Адрес и оплата
                </h2>

                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                  aria-label="Закрыть"
                  title="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="min-w-0 truncate text-[24px] font-semibold tracking-tight text-slate-900">
                    {titleAddress}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                  aria-label="Закрыть"
                  title="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-hidden bg-surface-soft px-6 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
            {/* fade between steps */}
            <div
              className={[
                "h-full transition-opacity duration-200",
                contentFade === "out" ? "opacity-0" : "opacity-100",
              ].join(" ")}
            >
              {step === "summary" ? (
                // ======= WIDE SUMMARY (2 columns) =======
                <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
                  {/* LEFT */}
                  <div ref={leftScrollRef} className="min-h-0 overflow-y-auto overscroll-contain pr-1">
                    {/* CART (аккордеон) */}
                    <div className="rounded-[32px] bg-white shadow-sm border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setCartExpanded((v) => !v)}
                        className="w-full rounded-[32px] px-6 py-5 text-left"
                        title={cartExpanded ? "Свернуть корзину" : "Развернуть корзину"}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-[20px] font-semibold text-slate-900">Доставка 15 минут</div>
                            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
                              <span className="tabular-nums">{formatMoney.format(totals.totalPrice)} ₽</span>
                              <span className="text-slate-300">•</span>
                              <span className="tabular-nums">{entries.length} поз.</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="hidden items-center -space-x-2 sm:flex">
                              {thumbs.map((src, idx) => (
                                <Thumb key={idx} src={src} />
                              ))}
                              {thumbsMore > 0 && (
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-xs font-semibold text-slate-700 border border-white">
                                  +{thumbsMore}
                                </div>
                              )}
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft">
                              {cartExpanded ? (
                                <ChevronUp className="h-5 w-5 text-slate-600" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-slate-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      <div
                        className={[
                          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
                          cartExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
                        ].join(" ")}
                      >
                        <div className="px-6 pb-6">
                          {entries.length === 0 ? (
                            <div className="py-8 text-center text-sm font-semibold text-slate-500">Ваша корзина пуста</div>
                          ) : (
                            <>
                              <div className="space-y-4">
                                {shownEntries.map(({ offer, quantity, lineTotal, lineOldPrice }) => {
                                  const isSoldOut = ((offerStocks[offer.id] ?? offer.stock) ?? 0) <= 0;

                                  return (
                                    <div
                                      key={offer.id}
                                      className="flex items-center gap-4 rounded-[24px] bg-surface-soft p-4"
                                    >
                                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white border border-slate-200/50">
                                        {offer.imageUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={offer.imageUrl}
                                            alt={offer.menuItemName}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <span className="px-2 text-center text-[11px] font-semibold text-slate-400">
                                            нет фото
                                          </span>
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="line-clamp-1 text-sm font-semibold text-slate-900">
                                          {offer.menuItemName}
                                        </div>

                                        <div className="mt-2 flex items-center gap-3">
                                          <QuantityControls
                                            quantity={quantity}
                                            onAdd={() => add(offer.id)}
                                            onRemove={() => remove(offer.id)}
                                            canAdd={!isSoldOut}
                                            size="md"
                                          />

                                          <button
                                            type="button"
                                            onClick={() => removeLine(offer.id)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                            aria-label="Удалить позицию"
                                            title="Удалить"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 flex-col items-end">
                                        {lineOldPrice ? (
                                          <div className="text-xs font-semibold text-slate-300 line-through tabular-nums">
                                            {formatMoney.format(lineOldPrice)} ₽
                                          </div>
                                        ) : (
                                          <div className="h-4" />
                                        )}
                                        <div className="text-sm font-semibold text-slate-900 tabular-nums">
                                          {formatMoney.format(lineTotal)} ₽
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {hiddenCount > 0 && !cartShowAll && (
                                <button
                                  type="button"
                                  onClick={() => setCartShowAll(true)}
                                  className="mt-4 w-full border-t border-slate-200 pt-4 text-center text-sm font-semibold text-slate-700 hover:text-slate-900"
                                >
                                  Показать ещё {hiddenCount}
                                </button>
                              )}

                              {entries.length > CART_PREVIEW_COUNT && cartShowAll && (
                                <button
                                  type="button"
                                  onClick={() => setCartShowAll(false)}
                                  className="mt-4 w-full border-t border-slate-200 pt-4 text-center text-sm font-semibold text-slate-500 hover:text-slate-700"
                                >
                                  Свернуть
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ADD TO ORDER */}
                    <div className="mt-6 rounded-[32px] bg-white p-6 shadow-sm border border-slate-200/60">
                      <div className="mb-4 text-[20px] font-semibold text-slate-900">Добавить к заказу?</div>

                      {recommend.length === 0 ? (
                        <div className="rounded-3xl bg-surface-soft p-6 text-sm font-semibold text-slate-500">
                          Здесь можно показать рекомендации.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          {recommend.map((r) => (
                            <div key={r.id} className="rounded-[26px] bg-surface-soft p-4">
                              <div className="mb-3 h-24 w-full rounded-[22px] bg-white border border-slate-200/50" />
                              <div className="line-clamp-2 text-sm font-semibold text-slate-900">{r.name}</div>

                              <div className="mt-3 flex items-center justify-between">
                                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 border border-slate-200/50">
                                  — ₽
                                </div>
                                <button
                                  type="button"
                                  disabled
                                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-300 border border-slate-200/50"
                                  aria-label="Добавить"
                                  title="Добавить (позже подключим данные)"
                                >
                                  <span className="text-2xl leading-none">+</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="h-6" />
                  </div>

                  {/* RIGHT */}
                  <div className="min-h-0">
                    <div className="h-full rounded-[32px] bg-white p-6 shadow-sm border border-slate-200/60 flex flex-col">
                      <div className="text-[20px] font-semibold text-slate-900">Скидки и выгода</div>
                      <div className="mt-4 h-px w-full bg-slate-200" />

                      <div className="divide-y divide-slate-200">
                        <button type="button" className="flex w-full items-center justify-between py-4 text-left">
                          <div className="text-sm font-semibold text-slate-900">
                            Скидка или промокод <span className="text-slate-900">●</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        </button>

                        <div className="flex items-start justify-between gap-4 py-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              СберСпасибо <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-400">
                              Войдите по Сбер ID, чтобы получать и списывать бонусы
                            </div>
                          </div>

                          <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Закрыть блок"
                            title="Закрыть"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-auto pt-8">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-500">Итого</div>
                          <div className="text-lg font-semibold text-slate-900 tabular-nums">
                            {formatMoney.format(totals.totalPrice)} ₽
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={goToAddressPayment}
                          className="vilka-btn-primary mt-5 w-full rounded-full px-6 py-5 text-base font-semibold shadow-lg shadow-black/10 transition active:scale-[0.99]"
                        >
                          <div className="leading-tight">Продолжить</div>
                          <div className="-mt-0.5 text-xs font-semibold opacity-80">К адресу и оплате</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // ======= NARROW ADDRESS/PAYMENT (БЕЗ СКРОЛЛА, всё умещается) =======
                <div className="h-full">
                  <div className="h-full rounded-[32px] bg-white p-4 sm:p-5 shadow-sm border border-slate-200/60 flex flex-col">
                    {/* Адрес (компактно) */}
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-[18px] font-semibold leading-tight text-slate-900">
                          {selectedAddressLabel || "Указать адрес доставки"}
                        </div>
                        {selectedAddressLabel ? (
                          <div className="mt-1 text-xs font-semibold text-slate-400">Доставка ~ 15 минут</div>
                        ) : null}
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </button>

                    {/* Поля — как в AddressModal (float-label + зелёный focus) */}
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FloatingInput
                        id="chk-apartment"
                        label="Квартира/офис"
                        value={(draft as any).apartment ?? ""}
                        onChange={(v) => setDraftField("apartment", v)}
                      />
                      <FloatingInput
                        id="chk-floor"
                        label="Этаж"
                        value={(draft as any).floor ?? ""}
                        onChange={(v) => setDraftField("floor", v)}
                        inputMode="numeric"
                      />
                      <FloatingInput
                        id="chk-entrance"
                        label="Подъезд"
                        value={(draft as any).entrance ?? ""}
                        onChange={(v) => setDraftField("entrance", v)}
                        inputMode="numeric"
                      />
                      <FloatingInput
                        id="chk-intercom"
                        label="Домофон"
                        value={(draft as any).intercom ?? ""}
                        onChange={(v) => setDraftField("intercom", v)}
                      />
                    </div>

                    <div className="mt-3">
                      <FloatingTextarea
                        id="chk-comment"
                        label="Комментарий"
                        value={(draft as any).comment ?? ""}
                        onChange={(v) => setDraftField("comment", v)}
                      />
                    </div>

                    {/* Оставить у двери (компактно) */}
                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">Оставить у двери</div>
                        <div className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-slate-400">
                          Товары 18+ оставить у двери не получится. Нам нужно проверить ваш возраст
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDraftField("leaveAtDoor", !(draft as any).leaveAtDoor)}
                        className={[
                          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
                          (draft as any).leaveAtDoor ? "bg-slate-900" : "bg-slate-200",
                        ].join(" ")}
                        aria-label="Оставить у двери"
                        aria-pressed={Boolean((draft as any).leaveAtDoor)}
                      >
                        <span
                          className={[
                            "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                            (draft as any).leaveAtDoor ? "translate-x-5" : "translate-x-1",
                          ].join(" ")}
                        />
                      </button>
                    </div>

                    {/* Оплата (компактно) */}
                    <div className="mt-3 h-px w-full bg-slate-200" />
                    <button type="button" className="flex w-full items-center justify-between py-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-10 items-center justify-center rounded-lg bg-slate-100 border border-slate-200/70 text-[11px] font-bold text-emerald-600">
                          мир
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {(draft as any).paymentText ?? "Оплата картой •••• 7136"}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>

                    {/* Низ: итого + кнопка (всегда внизу, без скролла) */}
                    <div className="mt-auto pt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-500">Итого</div>
                        <div className="text-lg font-semibold text-slate-900 tabular-nums">
                          {formatMoney.format(totals.totalPrice)} ₽
                        </div>
                      </div>

                      <button
                        type="button"
                        className="vilka-btn-primary mt-3 w-full rounded-full px-6 py-5 text-base font-semibold shadow-lg shadow-black/10 transition active:scale-[0.99]"
                      >
                        Оплатить
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AddressModal */}
              <AddressModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                onSelectAddress={handleAddressSelected}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
