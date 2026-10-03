-- =============================================================================
-- DMS seed data — default categories, shop settings and sample products.
-- Safe to re-run: existing rows (matched by slug) are left alone.
-- Sample photos use keys starting with "demo/", which the site serves from its
-- own /public/demo folder, so the shop looks complete before anything is
-- uploaded to R2.
-- =============================================================================

insert into public.shop_settings (
  id, shop_name, tagline, hero_headline, hero_subtext,
  facebook_url, messenger_username, instagram_username, tiktok_url,
  other_links, phone, email, hours, location,
  how_to_order, payment_notes, shipping_notes, quick_replies
) values (
  1, 'DMS', 'Direct Message Us', 'Cropped. Cozy. Couture.',
  'Fur & faux-fur cropped jackets, made for soft-luxe days. Tap any piece and slide into our DMs 💌',
  'https://www.facebook.com/DMSPHIL', 'DMSPHIL', 'dmsphil', null,
  '[{"label":"Shopee","url":"https://shopee.ph/yourshop","enabled":false},{"label":"Lazada","url":"https://lazada.com.ph/shop/yourshop","enabled":false}]'::jsonb,
  '0917 000 0000', 'hello@dms.shop', 'Mon–Sat, 10AM–8PM', 'Metro Manila, Philippines',
  'Browse and tap a piece you love, then message us on Messenger, Instagram or Direct Ask. We''ll confirm size, price and delivery with you.',
  'GCash, Maya, bank transfer, or COD (selected areas).',
  'Free pick-up at our drop-off points in Baguio, La Trinidad & nearby towns. Nationwide shipping via J&T Express or LBC, sent within 1–3 days of payment.',
  array[
    'Yes, available! 💕',
    'Sizes left: ',
    'Payment options: GCash / Maya / Bank transfer / COD (selected areas).',
    'Shipping is ₱100 within Metro Manila, ₱180 provincial. Ships in 1–3 days.',
    'Thank you for ordering with DMS! 💌'
  ]
) on conflict (id) do nothing;

insert into public.categories (name, slug, description, sort_order, cover_image_key) values
  ('Cropped Fur Jackets', 'cropped-fur-jackets', 'Our signature: plush fur & faux-fur cropped jackets.', 0, 'demo/cat-fur.webp'),
  ('Cropped Jackets',     'cropped-jackets',     'Denim, leather, tweed and more, all cropped to flatter.', 1, 'demo/cat-jackets.webp'),
  ('Tops',                'tops',                'Knits, blouses and layering tops.', 2, 'demo/cat-tops.webp'),
  ('Dresses',             'dresses',             'Day-to-night dresses.', 3, 'demo/cat-dresses.webp'),
  ('Bottoms',             'bottoms',             'Skirts, trousers and jeans.', 4, 'demo/cat-bottoms.webp'),
  ('Accessories',         'accessories',         'Scarves, hair clips and the little extras.', 5, 'demo/cat-accessories.webp'),
  ('Bags',                'bags',                'Fluffy totes, minis and shoulder bags.', 6, 'demo/cat-bags.webp'),
  ('Others',              'others',              'Everything else we love.', 7, 'demo/cat-others.webp')
on conflict (slug) do nothing;

-- Sample products ------------------------------------------------------------
with data (cat, name, slug, description, price, sale_price, show_price, sizes, colors, material,
           stock_status, stock_qty, is_featured, is_new, is_best_seller, img_count, age_days) as (
  values
  ('cropped-fur-jackets', 'Cloud Cream Faux Fur Crop', 'cloud-cream-faux-fur-crop',
   'Our bestselling cloud-soft faux fur jacket, cropped at the waist with a cozy shawl collar. Fully lined, hook closure, and endlessly huggable.',
   1250, null, true, array['XS','S','M','L'], array['Cream','Ivory'], 'Faux fur, satin lining',
   'available', 12, true, true, true, 3, 1),
  ('cropped-fur-jackets', 'Blush Teddy Cropped Jacket', 'blush-teddy-cropped-jacket',
   'A sweet blush-pink teddy jacket with a boxy cropped fit and oversized pockets. Pairs with everything from denim to slip dresses.',
   1390, 1150, true, array['S','M','L'], array['Blush','Dusty Rose'], 'Teddy faux fur',
   'few_left', 3, true, true, false, 3, 2),
  ('cropped-fur-jackets', 'Mocha Shearling Crop', 'mocha-shearling-crop',
   'Rich mocha suede-feel shell with plush faux shearling trim. A cropped moto silhouette for cool-weather layering.',
   null, null, false, array['S','M','L','XL'], array['Mocha','Camel'], 'Faux suede, faux shearling',
   'available', 8, true, false, true, 3, 5),
  ('cropped-fur-jackets', 'Champagne Fluffy Bolero', 'champagne-fluffy-bolero',
   'An ultra-cropped fluffy bolero in shimmering champagne. Made for parties, weddings and every twirl in between.',
   990, null, true, array['Free Size'], array['Champagne','White'], 'Faux fox fur',
   'available', 10, true, true, false, 2, 3),
  ('cropped-fur-jackets', 'Noir Luxe Faux Mink Crop', 'noir-luxe-faux-mink-crop',
   'Sleek black faux mink with a high collar and cropped hem. Instant evening glam.',
   1650, null, true, array['S','M','L'], array['Black'], 'Faux mink',
   'sold_out', 0, false, false, false, 2, 20),
  ('cropped-fur-jackets', 'Dusty Rose Shaggy Crop', 'dusty-rose-shaggy-crop',
   'Long-pile shaggy faux fur in a muted dusty rose. Soft, statement-making and photo-ready.',
   null, null, false, array['XS','S','M'], array['Dusty Rose'], 'Shaggy faux fur',
   'few_left', 2, false, true, false, 2, 4),
  ('cropped-jackets', 'Ivory Tweed Cropped Jacket', 'ivory-tweed-cropped-jacket',
   'Classic boucle tweed with gold-tone buttons and fringe edges. Quiet luxury, cropped.',
   1450, null, true, array['S','M','L'], array['Ivory','Pink'], 'Boucle tweed',
   'available', 6, false, false, true, 2, 12),
  ('cropped-jackets', 'Washed Denim Crop Jacket', 'washed-denim-crop-jacket',
   'Light-wash denim cropped jacket with a relaxed fit. Your everyday layer.',
   850, null, true, array['S','M','L','XL'], array['Light Wash','Mid Wash'], 'Cotton denim',
   'available', 15, false, false, false, 2, 15),
  ('tops', 'Angora Knit Cardigan Top', 'angora-knit-cardigan-top',
   'Fuzzy angora-blend knit with pearl buttons. Wear it open or buttoned as a top.',
   690, null, true, array['Free Size'], array['Cream','Blush','Lilac'], 'Angora blend knit',
   'available', 20, false, true, false, 2, 6),
  ('dresses', 'Satin Slip Midi Dress', 'satin-slip-midi-dress',
   'Bias-cut satin slip dress that layers perfectly under a cropped fur jacket.',
   null, null, false, array['XS','S','M','L'], array['Champagne','Mocha'], 'Satin',
   'available', 9, false, false, false, 2, 9),
  ('bags', 'Fluffy Mini Shoulder Bag', 'fluffy-mini-shoulder-bag',
   'A cloud-soft faux fur mini bag with a gold chain strap. The perfect match for your crop.',
   590, 490, true, array[]::text[], array['Cream','Blush','Black'], 'Faux fur, gold-tone hardware',
   'available', 14, true, false, true, 2, 7),
  ('accessories', 'Faux Fur Hair Clip Set', 'faux-fur-hair-clip-set',
   'Set of 3 fluffy claw clips in our signature colors.',
   250, null, true, array[]::text[], array['Mixed'], 'Faux fur, acrylic',
   'available', 30, false, true, false, 1, 3)
),
inserted as (
  insert into public.products (
    category_id, name, slug, description, price, sale_price, show_price, sizes, colors, material,
    stock_status, stock_qty, is_featured, is_new, is_best_seller, view_count, created_at
  )
  select c.id, d.name, d.slug, d.description, d.price, d.sale_price, d.show_price, d.sizes, d.colors,
         d.material, d.stock_status, d.stock_qty, d.is_featured, d.is_new, d.is_best_seller,
         (random() * 300)::int, now() - make_interval(days => d.age_days)
  from data d
  join public.categories c on c.slug = d.cat
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_images (product_id, r2_key, sort_order, is_main)
select i.id, 'demo/' || i.slug || '-' || n || '.webp', n - 1, n = 1
from inserted i
join data d on d.slug = i.slug
cross join lateral generate_series(1, 4) as n;

-- Top-up: give every sample product all 4 sample photos (front, close-up,
-- three-quarter, styled). Safe to re-run; adds only the ones that are missing.
insert into public.product_images (product_id, r2_key, sort_order, is_main)
select p.id, 'demo/' || p.slug || '-' || n || '.webp', n - 1, n = 1
from public.products p
cross join generate_series(1, 4) as n
where p.slug in (
  'cloud-cream-faux-fur-crop', 'blush-teddy-cropped-jacket', 'mocha-shearling-crop', 'champagne-fluffy-bolero',
  'noir-luxe-faux-mink-crop', 'dusty-rose-shaggy-crop', 'ivory-tweed-cropped-jacket', 'washed-denim-crop-jacket',
  'angora-knit-cardigan-top', 'satin-slip-midi-dress', 'fluffy-mini-shoulder-bag', 'faux-fur-hair-clip-set'
)
and not exists (
  select 1 from public.product_images i
  where i.product_id = p.id and i.r2_key = 'demo/' || p.slug || '-' || n || '.webp'
);

-- Sample drop-off points & partners (requires 0002_drop_points.sql) ----------
-- Names are placeholders: replace them with your real partner shops in
-- Admin → Drop-offs. Coordinates sit in the right neighbourhoods.
insert into public.drop_points (name, kind, area, address, landmark, schedule, notes, lat, lng, sort_order)
select * from (values
  ('Session Road Drop Point', 'drop_point', 'Baguio City', 'Session Road', 'Upper Session Road, near the Post Office end', 'Mon–Sat, 10AM–6PM', 'Message us first so we can prepare your item.', 16.4114, 120.5985, 0),
  ('Burnham Park Meet-up', 'drop_point', 'Baguio City', 'Burnham Park', 'By the lake, Harrison Road side', 'Sat–Sun, 2PM–5PM', 'Scheduled meet-ups only.', 16.4122, 120.5940, 1),
  ('Legarda Road Partner Shop', 'partner', 'Baguio City', 'Legarda Road', 'Near the Legarda–Session junction', 'Mon–Sat, 9AM–7PM', 'Pick-up & drop-off. Bring your order name.', 16.4087, 120.5928, 2),
  ('Luneta Hill Drop Point', 'drop_point', 'Baguio City', 'Luneta Hill', 'Upper Session / Luneta Hill area', 'Daily, 11AM–7PM', null, 16.4097, 120.6003, 3),
  ('Mines View Partner', 'partner', 'Baguio City', 'Mines View', 'Mines View Park area', 'Daily, 8AM–5PM', 'Great for tourists picking up before heading home.', 16.4197, 120.6286, 4),
  ('La Trinidad Town Center', 'drop_point', 'La Trinidad', 'Km. 5, La Trinidad', 'Near the Municipal Hall', 'Mon–Fri, 9AM–5PM', null, 16.4554, 120.5878, 5),
  ('BSU Gate Drop Point', 'drop_point', 'La Trinidad', 'Benguet State University', 'Main gate, Km. 6', 'Mon–Fri, 12NN–5PM', 'Student-friendly pick-up.', 16.4460, 120.5905, 6),
  ('Strawberry Farm Partner', 'partner', 'La Trinidad', 'Strawberry Farm area', 'Betag, La Trinidad', 'Daily, 8AM–5PM', null, 16.4632, 120.5888, 7),
  ('Tuba (Marcos Highway) Partner', 'partner', 'Tuba', 'Marcos Highway', 'Along Marcos Highway', 'Mon–Sat, 9AM–5PM', null, 16.3880, 120.5640, 8),
  ('Itogon (Tuding) Drop Point', 'drop_point', 'Itogon', 'Tuding', 'Tuding, near the Baguio boundary', 'Sat, 10AM–4PM', null, 16.4138, 120.6440, 9),
  ('Sablan Partner', 'partner', 'Sablan', 'Poblacion', 'Sablan Poblacion', 'By appointment', 'Message us to schedule.', 16.4960, 120.4870, 10),
  ('Tublay Drop Point', 'drop_point', 'Tublay', 'Poblacion', 'Tublay Poblacion', 'By appointment', 'Message us to schedule.', 16.5130, 120.6290, 11)
) as v(name, kind, area, address, landmark, schedule, notes, lat, lng, sort_order)
where not exists (select 1 from public.drop_points);

update public.shop_settings
set shipping_notes = 'Free pick-up at our drop-off points in Baguio, La Trinidad & nearby towns. Nationwide shipping via J&T Express or LBC, sent within 1–3 days of payment.'
where id = 1 and shipping_notes like 'Ships nationwide via J&T / LBC%';
