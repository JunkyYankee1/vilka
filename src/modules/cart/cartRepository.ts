import { query } from "@/lib/db";
import { getRedis } from "@/lib/redis";

export type CartIdentity = {
  cartToken: string;
  userId: number | null;
};

export type CartLineInput = {
  offerId: number;
  quantity: number;
  comment?: string;
  allowReplacement?: boolean;
  isFavorite?: boolean;
};

export type CanonicalCartLine = {
  offerId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  discountPrice: number | null;
  comment: string | null;
  allowReplacement: boolean;
  isFavorite: boolean;
};

export type CanonicalCart = {
  id: number;
  cartToken: string;
  deliverySlot: string | null;
  items: CanonicalCartLine[];
  totals: {
    subtotal: number;
    discountTotal: number;
    total: number;
  };
};

export type CartChange = {
  type: "removed" | "price_changed";
  offerId: number;
  message: string;
};

const MIN_ORDER_SUM = 0; // TODO: load from restaurant-specific settings
const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes
const cacheKey = (cartToken: string) => `cart:${cartToken}`;

type OfferRow = {
  id: number;
  name: string;
  price: number;
  discount_percent: number | null;
  is_available: boolean;
};

async function getOffersMap(offerIds: number[]): Promise<Map<number, OfferRow>> {
  if (offerIds.length === 0) return new Map();
  const { rows } = await query<OfferRow>(
    `
    SELECT id, name, price, discount_percent, is_available
    FROM menu_items
    WHERE id = ANY($1::int[])
    `,
    [offerIds]
  );
  const map = new Map<number, OfferRow>();
  for (const row of rows) map.set(row.id, row);
  return map;
}

async function ensureCart(identity: CartIdentity): Promise<number> {
  const found = await query<{ id: number }>(
    `SELECT id FROM carts WHERE cart_token = $1 LIMIT 1`,
    [identity.cartToken]
  );
  if (found.rows[0]?.id) return found.rows[0].id;

  const created = await query<{ id: number }>(
    `
    INSERT INTO carts (cart_token, user_id, status, restaurant_id, created_at, updated_at)
    VALUES ($1, $2, 'active', 1, now(), now())
    RETURNING id
    `,
    [identity.cartToken, identity.userId ?? null]
  );
  return created.rows[0].id;
}

export async function getOrCreateCart(identity: CartIdentity): Promise<CanonicalCart> {
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey(identity.cartToken));
      if (cached) {
        return JSON.parse(cached) as CanonicalCart;
      }
    } catch (e) {
      console.error("[cart cache] read failed", e);
    }
  }

  const cartId = await ensureCart(identity);
  const { rows } = await query<{
    id: number;
    delivery_slot: string | null;
  }>(
    `SELECT id, delivery_slot FROM carts WHERE id = $1`,
    [cartId]
  );

  const itemsRows = await query<{
    menu_item_id: number;
    quantity: number;
    comment: string | null;
    allow_replacement: boolean | null;
    favorite: boolean | null;
  }>(
    `
    SELECT menu_item_id, quantity, comment, allow_replacement, favorite
    FROM cart_items
    WHERE cart_id = $1
    `,
    [cartId]
  );

  const offerIds = itemsRows.rows.map((r) => r.menu_item_id);
  const offersMap = await getOffersMap(offerIds);

  const items: CanonicalCartLine[] = [];
  let subtotal = 0;
  let discountTotal = 0;

  for (const row of itemsRows.rows) {
    const offer = offersMap.get(row.menu_item_id);
    if (!offer || !offer.is_available) continue;
    const unitPrice = offer.price;
    const discount =
      offer.discount_percent != null && offer.discount_percent > 0
        ? Math.round(unitPrice * (1 - offer.discount_percent / 100))
        : null;
    const finalPrice = discount ?? unitPrice;
    subtotal += unitPrice * row.quantity;
    discountTotal += (unitPrice - finalPrice) * row.quantity;

    items.push({
      offerId: row.menu_item_id,
      name: offer.name,
      quantity: row.quantity,
      unitPrice,
      discountPrice: discount,
      comment: row.comment,
      allowReplacement: row.allow_replacement ?? true,
      isFavorite: row.favorite ?? false,
    });
  }

  return {
    id: cartId,
    cartToken: identity.cartToken,
    deliverySlot: rows.rows[0]?.delivery_slot ?? null,
    items,
    totals: {
      subtotal,
      discountTotal,
      total: subtotal - discountTotal,
    },
  };
}

export async function validateAndPersistCart(
  identity: CartIdentity,
  input: { deliverySlot?: string | null; items: CartLineInput[] }
): Promise<{
  cart: CanonicalCart;
  changes: CartChange[];
  minOrderSum: number;
  isMinOrderReached: boolean;
}> {
  const cartId = await ensureCart(identity);
  const changes: CartChange[] = [];
  const offerIds = input.items.map((i) => i.offerId);
  const offersMap = await getOffersMap(offerIds);

  const filtered = input.items.filter((line) => {
    const offer = offersMap.get(line.offerId);
    if (!offer || !offer.is_available || line.quantity <= 0) {
      changes.push({
        type: "removed",
        offerId: line.offerId,
        message: "Товар недоступен и был удалён",
      });
      return false;
    }
    return true;
  });

  const subtotal = filtered.reduce((acc, line) => {
    const offer = offersMap.get(line.offerId)!;
    return acc + offer.price * line.quantity;
  }, 0);

  // sync DB
  await query("BEGIN");
  try {
    await query(
      `
      INSERT INTO carts (id, user_id, status, restaurant_id, delivery_slot, created_at, updated_at)
      VALUES ($1, $2, 'active', 1, $3, now(), now())
      ON CONFLICT (id) DO UPDATE SET delivery_slot = EXCLUDED.delivery_slot, updated_at = now()
      `,
      [cartId, identity.userId ?? null, input.deliverySlot ?? null]
    );

    const keepIds: number[] = [];
    for (const line of filtered) {
      const offer = offersMap.get(line.offerId)!;
      const discountPrice =
        offer.discount_percent && offer.discount_percent > 0
          ? Math.round(offer.price * (1 - offer.discount_percent / 100))
          : null;

    const existingRow = await query<{ id: number }>(
      `SELECT id FROM cart_items WHERE cart_id = $1 AND menu_item_id = $2 LIMIT 1`,
      [cartId, line.offerId]
    );
    const existingId = existingRow.rows[0]?.id;

    if (existingId) {
      await query(
        `
        UPDATE cart_items
        SET quantity = $1,
            item_name = $2,
            unit_price = $3,
            comment = $4,
            allow_replacement = $5,
            favorite = $6
        WHERE id = $7
        `,
        [
          line.quantity,
          offer.name,
          discountPrice ?? offer.price,
          line.comment ?? null,
          line.allowReplacement ?? true,
          line.isFavorite ?? false,
          existingId,
        ]
      );
      keepIds.push(existingId);
    } else {
      const inserted = await query<{ id: number }>(
        `
        INSERT INTO cart_items (cart_id, menu_item_id, quantity, item_name, unit_price, comment, allow_replacement, favorite)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        `,
        [
          cartId,
          line.offerId,
          line.quantity,
          offer.name,
          discountPrice ?? offer.price,
          line.comment ?? null,
          line.allowReplacement ?? true,
          line.isFavorite ?? false,
        ]
      );
      keepIds.push(inserted.rows[0].id);
    }
    }

    if (keepIds.length > 0) {
      await query(
        `DELETE FROM cart_items WHERE cart_id = $1 AND id NOT IN (${keepIds
          .map((_, idx) => `$${idx + 2}`)
          .join(",")})`,
        [cartId, ...keepIds]
      );
    } else {
      await query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
    }

    await query("COMMIT");
  } catch (e) {
    await query("ROLLBACK");
    throw e;
  }

  const cart = await getOrCreateCart(identity);
  const isMinOrderReached = cart.totals.total >= MIN_ORDER_SUM;

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(cacheKey(identity.cartToken), JSON.stringify(cart), {
        EX: CACHE_TTL_SECONDS,
      });
    } catch (e) {
      console.error("[cart cache] write failed", e);
    }
  }

  return {
    cart,
    changes,
    minOrderSum: MIN_ORDER_SUM,
    isMinOrderReached,
  };
}

