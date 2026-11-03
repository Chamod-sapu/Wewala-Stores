-- ==============================================================================
-- Wewala Stores - Comprehensive Database Seed Script
-- Populates categories, products, images, coupons, reviews, and contact messages
-- ==============================================================================

-- 1. Insert Categories
INSERT INTO public.categories (id, name, slug, description, image_url, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Ceylon Teas', 'ceylon-teas', 'Single-estate pure Ceylon black, green, and artisanal specialty teas from Nuwara Eliya and Dimbula.', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600', true),
  ('c1000000-0000-0000-0000-000000000002', 'Spices & Seasonings', 'spices-seasonings', 'Sun-dried Ceylon cinnamon, black pepper, cardamom, and authentic roasted curry powders.', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600', true),
  ('c1000000-0000-0000-0000-000000000003', 'Rice & Grains', 'rice-grains', 'Heirloom red rice, aromatic samba, and whole grain nutrition cultivated by local farmers.', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600', true),
  ('c1000000-0000-0000-0000-000000000004', 'Pantry & Coconut', 'pantry-coconut', 'Cold-pressed virgin coconut oil, coconut milk, and pantry staples straight from the coconut triangle.', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600', true),
  ('c1000000-0000-0000-0000-000000000005', 'Island Sweets & Treats', 'island-sweets', 'Pure Kithul treacle, jaggery, traditional island confectionery, and sweet preserves.', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=600', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url;

-- 2. Insert Products
INSERT INTO public.products (id, category_id, name, slug, description, price, compare_at_price, sku, stock, is_active, is_featured)
VALUES
  (
    'p1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Pure Ceylon BOPF Black Tea 500g',
    'pure-ceylon-bopf-black-tea-500g',
    'Full-bodied, rich and brisk highland BOPF tea packed fresh from the misty slopes of Nuwara Eliya. Ideal for your morning milk tea or strong black brew.',
    1250.00,
    1450.00,
    'TEA-BOPF-500',
    85,
    true,
    true
  ),
  (
    'p1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'Ceylon Green Tea with Jasmine 250g',
    'ceylon-green-tea-jasmine-250g',
    'Subtle, soothing green tea leaves delicately scented with fresh jasmine blossom petals. Packed with natural antioxidants.',
    1650.00,
    1850.00,
    'TEA-GRN-250',
    42,
    true,
    true
  ),
  (
    'p1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000002',
    'Organic Ceylon Cinnamon Sticks (Alba Grade) 100g',
    'ceylon-cinnamon-sticks-alba-100g',
    'True Ceylon Cinnamon (Cinnamomum verum) quill sticks harvested in southern Sri Lanka. Delicate sweet aroma with low coumarin levels.',
    1850.00,
    2200.00,
    'SPICE-CIN-100',
    60,
    true,
    true
  ),
  (
    'p1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000002',
    'Roasted Jaffna Curry Powder 250g',
    'roasted-jaffna-curry-powder-250g',
    'Authentic dark roasted spice blend ground with coriander, cumin, fennel, and chili. The secret to rich meat, seafood, and jackfruit curries.',
    750.00,
    null,
    'SPICE-JAF-250',
    110,
    true,
    false
  ),
  (
    'p1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000002',
    'Whole Black Peppercorns Hand-Picked 200g',
    'whole-black-peppercorns-200g',
    'Bold and pungent sun-dried black peppercorns with high piperine content, sourced from the central spice gardens of Matale.',
    650.00,
    null,
    'SPICE-PEP-200',
    75,
    true,
    false
  ),
  (
    'p1000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000003',
    'Heirloom Suwandel Aromatic Rice 1kg',
    'heirloom-suwandel-rice-1kg',
    'Traditional Sri Lankan fragrant white rice renowned in Ayurvedic tradition for its rich fragrance, sweet taste, and nutritional balance.',
    890.00,
    980.00,
    'RICE-SUW-1KG',
    35,
    true,
    true
  ),
  (
    'p1000000-0000-0000-0000-000000000007',
    'c1000000-0000-0000-0000-000000000003',
    'Organic Kuruluthuda Red Rice 1kg',
    'organic-kuruluthuda-red-rice-1kg',
    'Unpolished indigenous red rice with rich dietary fiber and low glycemic index. Great for daily wholesome wellness meals.',
    820.00,
    null,
    'RICE-KUR-1KG',
    50,
    true,
    false
  ),
  (
    'p1000000-0000-0000-0000-000000000008',
    'c1000000-0000-0000-0000-000000000004',
    'Cold-Pressed Extra Virgin Coconut Oil 500ml',
    'virgin-coconut-oil-500ml',
    '100% pure cold-pressed unrefined coconut oil extracted from fresh coconut milk without heat or chemicals. Ideal for raw cooking, keto, and skincare.',
    1450.00,
    1700.00,
    'COC-VCO-500',
    48,
    true,
    true
  ),
  (
    'p1000000-0000-0000-0000-000000000009',
    'c1000000-0000-0000-0000-000000000004',
    'Pure Ceylon Goraka Paste 200g',
    'pure-ceylon-goraka-paste-200g',
    'Concentrated natural Garcinia Cambogia paste, essential for authentic sour fish ambul thiyal and tenderizing red meats.',
    450.00,
    null,
    'PAN-GOR-200',
    65,
    true,
    false
  ),
  (
    'p1000000-0000-0000-0000-000000000010',
    'c1000000-0000-0000-0000-000000000005',
    'Pure Kithul Palm Treacle 750ml',
    'pure-kithul-palm-treacle-750ml',
    'Traditional wood-fired pure kithul sap reduction from the rainforest borders of Sinharaja. No added sugar or glucose syrup.',
    2150.00,
    2500.00,
    'SWT-KIT-750',
    28,
    true,
    true
  ),
  (
    'p1000000-0000-0000-0000-000000000011',
    'c1000000-0000-0000-0000-000000000005',
    'Roasted Whole Cashew Nuts (Lightly Salted) 250g',
    'roasted-cashew-nuts-salted-250g',
    'Jumbo grade island cashew nuts oven-roasted to golden crunch with natural sea salt.',
    2400.00,
    2800.00,
    'SWT-CSH-250',
    18,
    true,
    false
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active;

-- 3. Insert Product Images
INSERT INTO public.product_images (product_id, url, sort_order)
VALUES
  ('p1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=800', 1),
  ('p1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=800', 0),
  ('p1000000-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1569460275715-702b4892c974?auto=format&fit=crop&q=80&w=800', 0)
ON CONFLICT DO NOTHING;

-- 4. Insert Promotional Coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, max_discount, is_active, expires_at)
VALUES
  ('WELCOME10', 'percentage', 10.00, 1500.00, 1500.00, true, timezone('utc'::text, now() + interval '90 days')),
  ('AVURUDU20', 'percentage', 20.00, 4000.00, 2500.00, true, timezone('utc'::text, now() + interval '30 days')),
  ('FLAT500', 'fixed', 500.00, 3000.00, null, true, timezone('utc'::text, now() + interval '60 days')),
  ('EXPIRED50', 'percentage', 50.00, 1000.00, 1000.00, false, timezone('utc'::text, now() - interval '10 days'))
ON CONFLICT (code) DO UPDATE SET
  discount_value = EXCLUDED.discount_value,
  is_active = EXCLUDED.is_active;

-- 5. Insert Realistic Sample Contact Messages
INSERT INTO public.contact_messages (id, name, email, phone, subject, message, is_read, status, admin_notes, created_at)
VALUES
  (
    'm1000000-0000-0000-0000-000000000001',
    'Nuwan Jayasinghe',
    'nuwan.j@example.com',
    '+94 77 123 4567',
    'Wholesale inquiry for Ceylon Cinnamon',
    'Hello Wewala team, We run a specialty bakery in Kandy and are looking to purchase 10kg of Alba grade cinnamon sticks monthly. Do you offer bulk wholesale rates?',
    false,
    'unread',
    null,
    timezone('utc'::text, now() - interval '3 hours')
  ),
  (
    'm1000000-0000-0000-0000-000000000002',
    'Amara Weerasinghe',
    'amara.w@example.com',
    '+94 71 987 6543',
    'Delivery coverage in Galle Fort',
    'Hi there, could you confirm if your courier delivers to residential addresses inside Galle Fort? Looking to order tea gift packs for the holidays.',
    true,
    'read',
    'Sent courier confirmation via email. Prompt customer to place order online.',
    timezone('utc'::text, now() - interval '1 day')
  ),
  (
    'm1000000-0000-0000-0000-000000000003',
    'Kasun Senanayake',
    'kasun.s@example.com',
    '+94 76 555 4321',
    'Kithul Treacle batch confirmation',
    'Wanted to verify if the current batch of Sinharaja Kithul treacle is 100% pure sap without sugar syrup. Thanks!',
    true,
    'resolved',
    'Called customer and verified pure sap test certification. Customer placed an order for 2 bottles.',
    timezone('utc'::text, now() - interval '3 days')
  )
ON CONFLICT DO NOTHING;
