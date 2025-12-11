-- Smart cart enrichment

ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS cart_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS delivery_slot text,
  ADD COLUMN IF NOT EXISTS tips_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_discount numeric(10,2) DEFAULT 0;

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS allow_replacement boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS favorite boolean DEFAULT false;

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

