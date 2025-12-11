-- Дополнительные категории и блюда для dev-среды
-- Можно запускать повторно: используется ON CONFLICT DO NOTHING

INSERT INTO ref_dish_categories (id, parent_id, level, code, name, description, is_active, sort_order, created_at, updated_at)
VALUES
  (142, NULL, 1, 'brunch_tapas', 'Бранчи и тапас', NULL, TRUE, 130, now(), now()),
  (143, 142, 2, 'brunch.tostadas', 'Тосты и тостады', NULL, TRUE, 10, now(), now()),
  (144, 143, 3, 'brunch.tostadas.avocado', 'Тосты с авокадо', NULL, TRUE, 10, now(), now()),
  (145, 143, 3, 'brunch.tostadas.salmon', 'Тосты с лососем', NULL, TRUE, 20, now(), now()),
  (146, NULL, 1, 'asian_wok_fusion', 'Азиатский фьюжн', NULL, TRUE, 140, now(), now()),
  (147, 146, 2, 'asian.wok.noodles', 'Воки и лапша', NULL, TRUE, 10, now(), now()),
  (148, 147, 3, 'asian.wok.spicy', 'Острые воки', NULL, TRUE, 10, now(), now()),
  (149, NULL, 1, 'bowls_protein', 'Протеиновые боулы', NULL, TRUE, 150, now(), now()),
  (150, 149, 2, 'bowls.protein.chicken', 'Боулы с курицей', NULL, TRUE, 10, now(), now()),
  (151, 150, 3, 'bowls.protein.teriyaki', 'Боул терияки', NULL, TRUE, 10, now(), now()),
  (152, NULL, 1, 'desserts.modern', 'Современные десерты', NULL, TRUE, 160, now(), now()),
  (153, 152, 2, 'desserts.modern.mousse', 'Муссовые десерты', NULL, TRUE, 10, now(), now()),
  (154, 153, 3, 'desserts.modern.pistachio', 'Фисташковые муссы', NULL, TRUE, 10, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, restaurant_id, name, description, price, currency, is_active, is_available, image_url, created_at, updated_at, listing_mode, ref_category_id, is_brand_anonymous, base_price, discount_percent, discount_fixed, composition)
VALUES
  (10, 3, 'Тост с авокадо и микрозеленью', 'Хрустящий тост с кремом из авокадо и микрозеленью.', 320.00, 'RUB', TRUE, TRUE, NULL, now(), now(), 0, 144, FALSE, NULL, NULL, NULL, NULL),
  (11, 3, 'Тост с лососем и крем-чиз', 'Подкопчённый лосось, крем-чиз и огурец на зерновом хлебе.', 450.00, 'RUB', TRUE, TRUE, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe', now(), now(), 0, 145, FALSE, NULL, 15.00, NULL, NULL),
  (12, 3, 'Острый вок с креветкой', 'Пшеничная лапша, креветки, острый соус чили и овощи.', 520.00, 'RUB', TRUE, TRUE, 'https://images.unsplash.com/photo-1559057194-95f0d7b7d7c7', now(), now(), 0, 148, FALSE, NULL, 12.00, NULL, NULL),
  (13, 3, 'Терияки боул с курицей', 'Тёплый рис, курица терияки, эдамаме и кунжут.', 480.00, 'RUB', TRUE, TRUE, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783', now(), now(), 0, 151, FALSE, NULL, 8.00, NULL, NULL),
  (14, 3, 'Фисташковый мусс', 'Воздушный мусс с фисташковой пастой и белым шоколадом.', 260.00, 'RUB', TRUE, TRUE, NULL, now(), now(), 0, 154, FALSE, NULL, NULL, NULL, NULL),
  (15, 3, 'Шаурма по-домашнему', 'Сочное мясо, свежие овощи и фирменный соус в лаваше.', 350.00, 'RUB', TRUE, TRUE, NULL, now(), now(), 0, 89, FALSE, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- поправим последовательность, чтобы будущие вставки не конфликтовали
SELECT setval('public.menu_items_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM menu_items), nextval('public.menu_items_id_seq')), true);
SELECT setval('public.ref_dish_categories_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM ref_dish_categories), nextval('public.ref_dish_categories_id_seq')), true);

