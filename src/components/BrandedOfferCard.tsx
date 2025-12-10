"use client";

type BrandedOfferCardProps = {
  itemName: string;
  brand?: string;
  price: number;
  oldPrice?: number;
  tag?: string;      // доп. текст плашки, если нет скидки
  subtitle?: string; // вторая строка под названием
  imageUrl?: string | null; // картинка

  // 🔽 новое для счётчика
  quantity?: number;
  onAdd?: () => void;
  onRemove?: () => void;
};

const BrandedOfferCard = ({
  itemName,
  brand,
  price,
  oldPrice,
  tag,
  subtitle,
  imageUrl,
  quantity = 0,
  onAdd,
  onRemove,
}: BrandedOfferCardProps) => {
  const discount =
    oldPrice && oldPrice > price
      ? `-${Math.round(((oldPrice - price) / oldPrice) * 100)}%`
      : tag;

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onAdd?.();
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-[24px] bg-white shadow-sm">
      {/* Верхняя часть: фото + плашка скидки */}
      <div className="relative h-32 w-full rounded-t-[24px] bg-slate-100">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={itemName}
            className="h-full w-full object-cover"
          />
        )}

        {discount && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/85 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            {discount}
          </span>
        )}
      </div>

      {/* Нижняя часть: бренд, название, цена */}
      <div className="px-3 pb-3 pt-2">
        {brand && (
          <div className="line-clamp-1 text-[11px] font-medium text-slate-500">
            {brand}
          </div>
        )}
        <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">
          {itemName}
        </div>
        {subtitle && (
          <div className="mt-1 text-[12px] text-slate-500">
            {subtitle}
          </div>
        )}

        {/* ценовая капсула как была, только внутри теперь счётчик */}
        <div className="mt-3 flex items-center justify-between rounded-full bg-emerald-50 px-3 py-1.5">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              {oldPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {oldPrice} ₽
                </span>
              )}
              <span className="text-base font-semibold text-slate-900">
                {price} ₽
              </span>
            </div>
          </div>

          {/* справа: либо один белый плюс, либо – qty + */}
          {quantity > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemove}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-semibold leading-none text-slate-700 hover:bg-emerald-50"
              >
                –
              </button>
              <span className="text-sm font-semibold text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleAdd}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-semibold leading-none text-emerald-500 hover:bg-emerald-50"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-semibold leading-none text-emerald-500 hover:bg-emerald-50"
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default BrandedOfferCard;
