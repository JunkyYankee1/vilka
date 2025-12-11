# Smart Cart & Saved Sets — Plan and Phasing

## Goals (short)
- Saved carts (“sets”) with a name; repeat set restores cart with current prices/availability.
- Per-line kitchen comment + replacement policy.
- Delivery slot on cart.
- Mini-cart in header (already done).
- Promo/tips/upsell later.
- Persistent cart (user/guest), validation endpoint, shareable carts.

## Proposed data model (Postgres)
- `carts` add columns:
  - `delivery_slot text` (e.g. `asap`, `by-1930`, free text).
  - `tips_amount numeric(10,2) NULL`.
  - `promo_code text NULL`, `promo_discount numeric(10,2) DEFAULT 0`.
- `cart_items` add columns:
  - `comment text NULL`,
  - `allow_replacement boolean DEFAULT true`,
  - `favorite boolean DEFAULT false` (flag when hearted from cart).
- New tables:
  - `saved_carts (id bigserial, user_id bigint, name text, payload jsonb, created_at timestamptz)` — payload stores item ids/qty + options; applies current prices on restore.
  - `favorite_items (user_id bigint, menu_item_id bigint, created_at timestamptz)` — for “favorites” tab and cart hearts.
  - `cart_shares (id bigserial, token text UNIQUE, payload jsonb, created_at, created_by)` — for share links/templates.
  - `cart_events (id bigserial, cart_id bigint, user_id bigint NULL, event_type text, payload jsonb, created_at timestamptz)` — analytics.

## API / server actions (outline)
- `POST /api/cart/validate` — input: cart_id or payload; output: canonical cart, price updates, unavailable items list, validation errors (min order, etc.).
- `POST /api/cart/save` — saves current cart as named set (auth required).
- `GET /api/cart/saved` — list saved sets.
- `POST /api/cart/apply-saved` — apply saved set to current cart.
- `POST /api/cart/share` — returns short token/link; payload persisted in `cart_shares`.
- `GET /api/cart/share/:token` — returns shared payload (view or clone).
- `POST /api/cart/update-line` — accept comment / allow_replacement / favorite toggle.
- `POST /api/cart/update-slot` — set delivery slot.
- `POST /api/cart/apply-promo` — validate promo, return discount line.

## Redis usage
- Store active cart payloads (user_id or guest cart_id) for speed; Postgres as source of truth on save/checkout/share.
- Cache share payloads and promo rules if needed.

## Phasing
1) Cart enrichments (MVP):
   - DB migration for `delivery_slot`, `comment`, `allow_replacement`, `favorite`.
   - `/api/cart/update-line` and `/api/cart/update-slot` to persist UI fields.
   - `/api/cart/validate` stub that re-fetches offers and returns canonical totals (prices only).
2) Saved sets & favorites:
   - `saved_carts`, `favorite_items` tables.
   - Endpoints to save/apply sets; heart from cart writes to `favorite_items`.
3) Sharing + template:
   - `cart_shares` table; share/apply endpoints.
4) Promos, tips, upsell:
   - `promo_code`, `promo_discount`, `tips_amount`; `/apply-promo`; upsell block fed by static rules.
5) Persistence / multi-device:
   - Store cart in Redis+Postgres keyed by user_id or guest cart_id cookie; hydrate cart on load; share same validation endpoint.

## Minimal migration sketch (SQL to apply via a migration tool)
```sql
ALTER TABLE carts ADD COLUMN IF NOT EXISTS delivery_slot text;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS tips_amount numeric(10,2);
ALTER TABLE carts ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS promo_discount numeric(10,2) DEFAULT 0;

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS comment text;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS allow_replacement boolean DEFAULT true;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS favorite boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS saved_carts (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_items (
  user_id bigint NOT NULL,
  menu_item_id bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS cart_shares (
  id bigserial PRIMARY KEY,
  token text UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by bigint
);

CREATE TABLE IF NOT EXISTS cart_events (
  id bigserial PRIMARY KEY,
  cart_id bigint NOT NULL,
  user_id bigint,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
```

## UI hooks (already in place to wire)
- Mini-cart dropdown, per-line comment/replacement toggle, delivery slot selector are present in `CatalogPageClient.tsx` with TODOs to persist.

## Next coding tasks
- Add a migration file applying the SQL above.
- Add `/api/cart/update-line`, `/api/cart/update-slot`, `/api/cart/validate` routes (typed, using existing catalog query for pricing).
- Persist mini-cart state server-side when endpoints are ready.
- Add “Save this cart” button (uses `/api/cart/save`) and “Repeat set” list UI.
- Add heart icon to cart lines (write to `favorite_items`).
```

