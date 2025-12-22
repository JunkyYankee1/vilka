-- Track stock (quantity) for menu items

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 100;

ALTER TABLE menu_items
  ADD CONSTRAINT IF NOT EXISTS menu_items_stock_qty_check CHECK (stock_qty >= 0);


