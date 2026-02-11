-- Add "Mistery box" (surprise box) support for restaurants.
-- We keep it as a special kind of menu_item so it works with cart/checkout/delivery.

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'menu_item';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_item_kind_check'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_item_kind_check
      CHECK (item_kind IN ('menu_item', 'mistery_box'));
  END IF;
END $$;

-- Ensure we have a dedicated category for Mistery box in ref_dish_categories.
INSERT INTO public.ref_dish_categories (parent_id, level, code, name, description, is_active, sort_order)
SELECT
  NULL,
  1,
  'mistery-box',
  'Mistery box',
  'Сюрприз-бокс от ресторана',
  TRUE,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.ref_dish_categories WHERE code = 'mistery-box'
);

