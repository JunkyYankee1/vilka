"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  MapPin,
  User,
  Search,
  Clock,
  ChevronRight,
} from "lucide-react";

import AuthModal from "../components/AuthModal";
import AddressModal from "../components/AddressModal";
import AnonymousOfferCard from "../components/AnonymousOfferCard";
import BrandedOfferCard from "../components/BrandedOfferCard";

/* ===== Типы данных ===== */

type Category = {
  id: string; // level1_code
  name: string;
  isPromo?: boolean;
};

type Subcategory = {
  id: string; // level1_code:level2_code
  name: string;
  categoryId: string;
};

type BaseItem = {
  id: string; // ref_category_id как строка
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
};

type Offer = {
  id: string;
  baseItemId: string;
  isAnonymous: boolean;
  brand?: string;
  price: number; // уже со скидкой
  oldPrice?: number; // старая цена
  tag?: string;
  etaMinutes?: number;
  imageUrl?: string | null;
  menuItemName: string; // название блюда из menu_items
};

type CatalogData = {
  categories: Category[];
  subcategories: Subcategory[];
  baseItems: BaseItem[];
  offers: Offer[];
};

/** Простая «картинка» для категории 1 уровня: эмодзи по коду */
function getCategoryEmoji(code: string): string {
  if (code.startsWith("bakery")) return "🥐";
  if (code.startsWith("breakfasts")) return "🍳";
  if (code.startsWith("snacks")) return "🥨";
  if (code.startsWith("salads")) return "🥗";
  if (code.startsWith("soups")) return "🥣";
  if (code.startsWith("pizza")) return "🍕";
  if (code.startsWith("burgers")) return "🍔";
  if (code.startsWith("hot")) return "🍽️";
  if (code.startsWith("pasta")) return "🍝";
  if (code.startsWith("desserts")) return "🍰";
  if (code.startsWith("drinks")) return "🥤";
  if (code.startsWith("combos")) return "🧺";
  return "🍴";
}

/* ===== Главная страница ===== */

export default function HomePage() {
  // данные каталога
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [baseItems, setBaseItems] = useState<BaseItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // текущий выбор
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] =
    useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // какие категории раскрыты в левом дереве
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);

  // строка поиска
  const [searchQuery, setSearchQuery] = useState("");

  // корзина: offerId -> количество
  const [cart, setCart] = useState<Record<string, number>>({});

  // модалки / адрес
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [currentAddressLabel, setCurrentAddressLabel] =
    useState<string>("Указать адрес доставки");

  /* ===== Загрузка каталога из БД ===== */
  useEffect(() => {
    const loadCatalog = async () => {
      setIsCatalogLoading(true);
      setCatalogError(null);
      try {
        const res = await fetch("/api/catalog/data");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setCatalogError(
            (data as any).error ?? "Не удалось загрузить каталог"
          );
          return;
        }

        const data: CatalogData = await res.json();
        setCategories(data.categories);
        setSubcategories(data.subcategories);
        setBaseItems(data.baseItems);
        setOffers(data.offers);

        // начальные значения выбора
        if (data.categories.length > 0) {
          const firstCatId = data.categories[0].id;
          setActiveCategoryId(firstCatId);
          setExpandedCategoryIds([firstCatId]);

          const subsForCat = data.subcategories.filter(
            (s) => s.categoryId === firstCatId
          );
          const firstSub = subsForCat[0];
          if (firstSub) {
            setActiveSubcategoryId(firstSub.id);
            const itemsForSub = data.baseItems.filter(
              (i) => i.subcategoryId === firstSub.id
            );
            const firstItem = itemsForSub[0];
            if (firstItem) {
              setActiveItemId(firstItem.id);
            }
          }
        }
      } catch (e) {
        console.error(e);
        setCatalogError("Ошибка загрузки каталога");
      } finally {
        setIsCatalogLoading(false);
      }
    };

    loadCatalog();
  }, []);

  /* Категория → валидная подкатегория */
  useEffect(() => {
    if (!activeCategoryId) return;

    const subsForCat = subcategories.filter(
      (s) => s.categoryId === activeCategoryId
    );

    if (subsForCat.length === 0) {
      setActiveSubcategoryId(null);
      setActiveItemId(null);
      return;
    }

    if (!subsForCat.some((s) => s.id === activeSubcategoryId)) {
      setActiveSubcategoryId(subsForCat[0].id);
    }
  }, [activeCategoryId, subcategories, activeSubcategoryId]);

  /* Подкатегория → валидный базовый item */
  useEffect(() => {
    if (!activeSubcategoryId) return;

    const itemsForSub = baseItems.filter(
      (i) => i.subcategoryId === activeSubcategoryId
    );

    if (itemsForSub.length === 0) {
      setActiveItemId(null);
      return;
    }

    if (!itemsForSub.some((i) => i.id === activeItemId)) {
      setActiveItemId(itemsForSub[0].id);
    }
  }, [activeSubcategoryId, baseItems, activeItemId]);

  /* Поиск: по мере ввода пытаемся найти подходящую позицию
     и переключаем на неё дерево / центр каталога */
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (baseItems.length === 0) return;

    const matchedItem =
      baseItems.find((i) =>
        i.name.toLowerCase().includes(q)
      ) ||
      baseItems.find((i) =>
        (i.description ?? "").toLowerCase().includes(q)
      );

    if (!matchedItem) return;

    setActiveCategoryId(matchedItem.categoryId);
    setActiveSubcategoryId(matchedItem.subcategoryId);
    setActiveItemId(matchedItem.id);
    setExpandedCategoryIds((prev) =>
      prev.includes(matchedItem.categoryId)
        ? prev
        : [...prev, matchedItem.categoryId]
    );
  }, [searchQuery, baseItems]);

  /* === Handlers для дерева слева === */

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    toggleCategoryExpanded(categoryId);
  };

  const handleSubcategoryClick = (subcategoryId: string) => {
    const sub = subcategories.find((s) => s.id === subcategoryId);
    if (!sub) return;

    setActiveCategoryId(sub.categoryId);
    setActiveSubcategoryId(sub.id);
    setExpandedCategoryIds((prev) =>
      prev.includes(sub.categoryId) ? prev : [...prev, sub.categoryId]
    );

    const itemsForSub = baseItems.filter((i) => i.subcategoryId === sub.id);
    if (itemsForSub.length > 0) {
      setActiveItemId(itemsForSub[0].id);
    }
  };

  const handleItemClickFromTree = (itemId: string) => {
    const item = baseItems.find((i) => i.id === itemId);
    if (!item) return;

    setActiveCategoryId(item.categoryId);
    setActiveSubcategoryId(item.subcategoryId);
    setActiveItemId(item.id);
    setExpandedCategoryIds((prev) =>
      prev.includes(item.categoryId) ? prev : [...prev, item.categoryId]
    );
  };

  /* === Корзина === */

  const handleAddToCart = (offerId: string) => {
    setCart((prev) => {
      const current = prev[offerId] ?? 0;
      return { ...prev, [offerId]: current + 1 };
    });
  };

  const handleRemoveFromCart = (offerId: string) => {
    setCart((prev) => {
      const current = prev[offerId] ?? 0;
      if (current <= 1) {
        const { [offerId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [offerId]: current - 1 };
    });
  };

  const cartEntries = Object.entries(cart)
    .map(([offerId, quantity]) => {
      const offer = offers.find((o) => o.id === offerId);
      if (!offer) return null;
      return { offer, quantity };
    })
    .filter(
      (x): x is { offer: Offer; quantity: number } => x !== null
    );

  const totalCount = cartEntries.reduce(
    (sum, { quantity }) => sum + quantity,
    0
  );

  const totalPrice = cartEntries.reduce(
    (sum, { offer, quantity }) => sum + offer.price * quantity,
    0
  );

  const cartButtonLabel = totalPrice > 0 ? `${totalPrice} ₽` : "0 ₽";

  /* === Текущие выборы / срезы === */

  const currentCategory = categories.find((c) => c.id === activeCategoryId);
  const currentSubcategory = subcategories.find(
    (s) => s.id === activeSubcategoryId
  );
  const currentItem = baseItems.find((i) => i.id === activeItemId);

  const subcategoriesForCategory = subcategories.filter(
    (s) => s.categoryId === activeCategoryId
  );
  const itemsForSubcategory = baseItems.filter(
    (i) => i.subcategoryId === activeSubcategoryId
  );

  const anonOffer = offers.find(
    (o) => o.baseItemId === activeItemId && o.isAnonymous
  );
  const brandedOffers = offers.filter(
    (o) => o.baseItemId === activeItemId && !o.isAnonymous
  );

  /* === UI === */

  return (
    <main className="flex flex-1 flex-col">
      {/* Шапка */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        {/* DESKTOP */}
        <div className="hidden md:block">
          <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
            <div className="flex w-full items-center gap-4 px-6 py-3">
              {/* Логотип + название */}
              <Link
                href="/"
                className="flex items-center gap-2 transition hover:opacity-80"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-light shadow-vilka-soft">
                  <span className="text-lg font-bold text-brand-dark">V</span>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-semibold text-slate-900">
                    Вилка
                  </span>
                  <span className="text-xs text-slate-600">
                    Еда из ресторанов и пекарен
                  </span>
                </div>
              </Link>

              {/* Поиск */}
              <div className="hidden flex-1 items-center md:flex">
                <div className="flex w-full items-center gap-3 rounded-full bg-surface-soft px-4 py-2 shadow-vilka-soft">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Найти ресторан или блюдо..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Адрес / профиль / корзина */}
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressOpen(true)}
                  className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 md:flex"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="max-w-[220px] truncate">
                    {currentAddressLabel}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 md:flex"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Войти</span>
                </button>

                <button className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Корзина • {cartButtonLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE */}
        <div className="md:hidden">
          {/* верхняя строка */}
          <div className="flex w-full items-center gap-3 bg-white px-4 pt-3 pb-2">
            <Link
              href="/"
              className="flex items-center gap-2 transition hover:opacity-80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-brand-light shadow-vilka-soft">
                <span className="text-base font-bold text-brand-dark">V</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsAddressOpen(true)}
              className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{currentAddressLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900"
            >
              <User className="h-4 w-4" />
            </button>

            <button className="flex h-8 items-center justify-center rounded-full bg-brand px-3 text-[11px] font-semibold text-white shadow-md shadow-brand/30 hover:bg-brand-dark">
              {cartButtonLabel}
            </button>
          </div>

          {/* липкий поиск */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur">
            <div className="px-4 pb-2">
              <div className="flex w-full items-center gap-3 rounded-full bg-surface-soft px-4 py-2 shadow-vilka-soft">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Найти ресторан или блюдо..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Основная сетка */}
      <section className="flex w-full flex-1 gap-4 px-6 py-4 md:py-6">
        {/* Левая колонка: дерево категорий */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="rounded-3xl bg-white p-3 shadow-vilka-soft">
            <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Категории
            </h2>
            {catalogError && (
              <p className="px-2 pb-2 text-xs text-red-500">{catalogError}</p>
            )}

            <nav className="flex flex-col gap-1">
              {categories.map((cat) => {
                const isCatActive = activeCategoryId === cat.id;
                const isExpanded = expandedCategoryIds.includes(cat.id);

                const subsForCat = subcategories.filter(
                  (s) => s.categoryId === cat.id
                );

                return (
                  <div key={cat.id} className="mb-0.5">
                    {/* Уровень 1 */}
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(cat.id)}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left transition",
                        isCatActive
                          ? "bg-white text-slate-900 font-semibold"
                          : "bg-white text-slate-800 hover:bg-surface-soft",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-soft text-lg">
                          {getCategoryEmoji(cat.id)}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm leading-tight">
                            {cat.name}
                          </span>
                          {cat.isPromo && (
                            <span className="mt-0.5 text-[10px] text-slate-500">
                              Акции и спецпредложения
                            </span>
                          )}
                        </span>
                      </span>
                      <ChevronRight
                        className={[
                          "h-4 w-4 text-slate-400 transition-transform",
                          isExpanded ? "rotate-90" : "",
                        ].join(" ")}
                      />
                    </button>

                    {/* Уровень 2 + 3 */}
                    {isExpanded && subsForCat.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-3">
                        {subsForCat.map((sub) => {
                          const isSubActive = activeSubcategoryId === sub.id;
                          const itemsForSub = baseItems.filter(
                            (i) => i.subcategoryId === sub.id
                          );

                          return (
                            <div key={sub.id}>
                              {/* уровень 2 */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleSubcategoryClick(sub.id)
                                }
                                className={[
                                  "flex w-full items-center justify-between rounded-2xl px-3 py-1.5 text-left text-xs transition",
                                  isSubActive
                                    ? "bg-surface-soft text-slate-900 font-medium"
                                    : "bg-transparent text-slate-700 hover:bg-surface-soft",
                                ].join(" ")}
                              >
                                <span>{sub.name}</span>
                              </button>

                              {/* уровень 3 — позиции; выбранная — серым текстом */}
                              {isSubActive && itemsForSub.length > 0 && (
                                <div className="mt-0.5 space-y-0.5 pl-4">
                                  {itemsForSub.map((item) => {
                                    const isItemActive =
                                      activeItemId === item.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() =>
                                          handleItemClickFromTree(item.id)
                                        }
                                        className={[
                                          "w-full rounded-2xl px-2 py-1 text-left text-[11px] transition",
                                          isItemActive
                                            ? "text-slate-400"
                                            : "text-slate-700 hover:text-slate-900",
                                        ].join(" ")}
                                      >
                                        {item.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {isCatalogLoading && categories.length === 0 && (
                <span className="px-2 py-1 text-xs text-slate-500">
                  Загрузка...
                </span>
              )}
            </nav>
          </div>
        </aside>

        {/* Центр: герой + сравнение аноним/бренд */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Герой */}
          <section className="overflow-hidden rounded-[var(--vilka-radius-xl)] border border-surface-soft bg-white shadow-vilka-soft">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-1 text-xs font-medium text-slate-800">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Горячая еда за 25–35 минут</span>
                </div>
                <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                  Рестораны и пекарни
                  <br />
                  в одной доставке.
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Заведения размещают свои блюда в Вилке и могут скрыть бренд.
                  Вы выбираете — анонимное предложение или конкретный ресторан
                  рядом.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-3xl bg-surface-soft p-4 text-sm sm:w-64">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    Минимальная сумма заказа
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    от 0 ₽
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    Доставка из заведений
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    от 0 ₽
                  </span>
                </div>
                <button className="mt-2 inline-flex items-center justify-center rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                  Посмотреть заведения
                </button>
              </div>
            </div>
          </section>

          {/* Блок выбора позиции */}
          <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-vilka-soft">
            {/* Хлебные крошки */}
            <div className="text-xs text-slate-500">
              {currentCategory?.name ?? "Категория"} <span>·</span>{" "}
              {currentSubcategory?.name ?? "Подкатегория"} <span>·</span>{" "}
              <span className="font-medium text-slate-800">
                {currentItem?.name ?? "Позиция"}
              </span>
            </div>

            {/* Подкатегории (центральные чипсы) */}
            <div className="flex flex-wrap gap-2">
              {subcategoriesForCategory.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSubcategoryClick(sub.id)}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    activeSubcategoryId === sub.id
                      ? "bg-slate-900 text-white"
                      : "bg-surface-soft text-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {sub.name}
                </button>
              ))}
              {isCatalogLoading && itemsForSubcategory.length === 0 && (
                <span className="text-xs text-slate-500">
                  Загрузка блюд…
                </span>
              )}
            </div>

            {/* Позиции внутри подкатегории */}
            <div className="flex flex-wrap gap-2">
              {itemsForSubcategory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveItemId(item.id)}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    activeItemId === item.id
                      ? "bg-brand text-white"
                      : "bg-surface-soft text-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Описание текущей позиции */}
            {currentItem && (
              <div className="rounded-2xl bg-surface-soft px-3 py-3 text-xs text-slate-600">
                {currentItem.description}
              </div>
            )}

            {/* Предложения */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              {/* Анонимное предложение */}
              {anonOffer ? (
                <AnonymousOfferCard
                  name={anonOffer.menuItemName}
                  price={anonOffer.price}
                  oldPrice={anonOffer.oldPrice}
                  tag={anonOffer.tag}
                  subtitle="Анонимное заведение. Подберём самый дешёвый и ближайший вариант"
                  imageUrl={anonOffer.imageUrl ?? undefined}
                />
              ) : (
                <div className="flex flex-col justify-center rounded-2xl border border-dashed border-slate-200 bg-surface-soft p-4 text-xs text-slate-500">
                  Для этой позиции пока нет анонимных предложений.
                </div>
              )}

              {/* Брендированные предложения */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    Из заведений рядом
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Заведения, которые показывают свой бренд
                  </span>
                </div>

                {brandedOffers.length === 0 ? (
                  <div className="rounded-2xl bg-surface-soft p-3 text-xs text-slate-500">
                    Пока нет брендированных предложений для этой позиции.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {brandedOffers.map((offer) => (
                      <BrandedOfferCard
                        key={offer.id}
                        itemName={offer.menuItemName}
                        brand={offer.brand}
                        price={offer.price}
                        oldPrice={offer.oldPrice}
                        tag={offer.tag}
                        subtitle="0,45 л"
                        imageUrl={offer.imageUrl ?? undefined}
                        quantity={cart[offer.id] ?? 0}
                        onAdd={() => handleAddToCart(offer.id)}
                        onRemove={() => handleRemoveFromCart(offer.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Правая колонка — корзина в стиле Самоката */}
        <aside className="hidden w-80 shrink-0 lg:block xl:w-96">
          <div className="flex h-full flex-col gap-3">
            {/* Основной блок корзины */}
            <div className="flex flex-1 flex-col rounded-3xl bg-white p-4 shadow-vilka-soft">
              <h2 className="text-base font-semibold text-slate-900">
                Доставка 15 минут
              </h2>

              {totalCount === 0 ? (
                <div className="mt-2 text-xs text-slate-600">
                  В вашей корзине пока пусто. Добавляйте блюда с карточек
                  справа, чтобы увидеть итог по заказу.
                </div>
              ) : (
                <>
                  {/* список позиций */}
                  <div className="mt-3 space-y-3">
                    {cartEntries.map(({ offer, quantity }) => {
                      const base = baseItems.find(
                        (i) => i.id === offer.baseItemId
                      );

                      const rowPrice = offer.price * quantity;
                      const rowOldPrice = offer.oldPrice
                        ? offer.oldPrice * quantity
                        : undefined;

                      return (
                        <div
                          key={offer.id}
                          className="flex items-center gap-3 rounded-2xl"
                        >
                          {/* мини-превью */}
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-surface-soft">
                            {offer.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={offer.imageUrl}
                                alt={offer.menuItemName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Фото
                              </span>
                            )}
                          </div>

                          {/* текст */}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                              {offer.menuItemName}
                            </div>
                            {base?.description && (
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {base.description}
                              </div>
                            )}
                          </div>

                          {/* счётчик + цена */}
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-3 rounded-full bg-surface-soft px-3 py-1.5">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(offer.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm text-slate-700 hover:bg-slate-100"
                              >
                                —
                              </button>
                              <span className="w-4 text-center text-sm font-medium text-slate-900">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(offer.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm text-slate-700 hover:bg-slate-100"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {rowOldPrice && (
                                <span className="text-xs text-slate-400 line-through">
                                  {rowOldPrice} ₽
                                </span>
                              )}
                              <span className="text-sm font-semibold text-slate-900">
                                {rowPrice} ₽
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Итого + кнопка */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-center text-xs text-slate-500">
                      Итого
                    </div>
                    <div className="text-center text-2xl font-semibold leading-tight text-slate-900">
                      {totalPrice} ₽
                    </div>
                    <button className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark">
                      Продолжить
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* нижний информер */}
            <div className="rounded-3xl bg-surface-soft p-3 text-xs text-slate-600 shadow-vilka-soft">
              <p className="font-semibold text-slate-800">
                Вилка пока не везде
              </p>
              <p className="mt-1">
                Укажите адрес, чтобы увидеть заведения, которые доставляют
                именно к вам.
              </p>
            </div>
          </div>
        </aside>
      </section>

      {/* Футер */}
      <footer className="border-t border-slate-200/70 bg-white/80">
        <div className="flex w-full flex-col gap-2 px-6 py-3 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} Вилка. Доставка еды из ресторанов и
            пекарен.
          </span>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900">
              Вопросы и поддержка
            </button>
            <button className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900">
              Условия сервиса
            </button>
            <a
              href="/business"
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
            >
              Для бизнеса
            </a>
          </div>
        </div>
      </footer>

      {/* Модалки */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <AddressModal
        isOpen={isAddressOpen}
        onClose={() => setIsAddressOpen(false)}
        onSelectAddress={(label) => setCurrentAddressLabel(label)}
      />
    </main>
  );
}
