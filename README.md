# Wewala Stores - E-Commerce Platform

A production-ready e-commerce platform for **Wewala Stores**, built with a **100% Supabase backend (no custom server)**, Row Level Security (RLS), atomic database functions, and a modern TypeScript monorepo architecture.

---

## 📁 Monorepo Structure

```
Wewala-Stores/
├── apps/
│   ├── web/                     # Customer-facing web storefront (Vite + React + TS)
│   └── desktop/                 # Desktop POS & store management portal (Vite + React + TS)
├── packages/
│   └── shared/                  # Shared TypeScript types, database definitions, RPC client
├── supabase/
│   ├── config.toml              # Supabase CLI local development configuration
│   ├── migrations/              # SQL migrations
│   │   └── 20240101000000_wewala_schema.sql  # Complete schema, RLS, functions & bucket
│   └── seed.sql                 # 3 Categories, 12 sample products, images & promo coupons
├── package.json                 # Monorepo root workspace scripts
├── pnpm-workspace.yaml          # pnpm workspace configuration
└── README.md                    # Setup and documentation
```

---

## 🗄️ Database Architecture & Migrations

All backend business logic and security reside in Postgres inside Supabase.

### 1. Tables Included
- **`profiles`**: `id` references `auth.users(id) on delete cascade`, `full_name`, `phone`, `avatar_url`, `role` (`customer` | `admin`), `created_at`.
  - **Trigger (`handle_new_user`)**: Listens to `AFTER INSERT ON auth.users` and automatically creates a corresponding profile with `role = 'customer'`.
- **`categories`**: `id`, `name`, `slug` (unique), `description`, `image_url`, `is_active`, timestamps.
- **`products`**: `id`, `name`, `slug` (unique), `description`, `price`, `compare_at_price`, `sku` (unique), `stock`, `low_stock_threshold`, `category_id`, `is_active`, timestamps.
- **`product_images`**: `id`, `product_id` (refs `products.id`), `url`, `sort_order`.
- **`addresses`**: `id`, `user_id` (refs `profiles.id`), `recipient_name`, `phone`, `street_address`, `city`, `state`, `postal_code`, `country`, `is_default`.
- **`coupons`**: `id`, `code` (unique), `discount_type` (`percentage` | `fixed`), `discount_value`, `min_order_amount`, `max_discount`, `expires_at`, `usage_limit`, `used_count`, `is_active`.
- **`orders`**: `id`, `user_id`, `status` (`pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`), `payment_method` (`card`, `cod`), `payment_status`, `subtotal`, `shipping`, `discount`, `total`, `shipping_address` (JSONB), `coupon_code`, timestamps.
- **`order_items`**: `id`, `order_id`, `product_id`, `name_snapshot`, `price_snapshot`, `quantity`.
- **`payments`**: `id`, `order_id`, `user_id`, `amount`, `currency`, `provider`, `status`, `transaction_id`, `metadata`.
- **`reviews`**: `id`, `product_id`, `user_id`, `rating` (1-5), `comment`, `is_approved`, `UNIQUE(product_id, user_id)`.
- **`wishlist`**: `id`, `user_id`, `product_id`, `UNIQUE(user_id, product_id)`.
- **`cart_items`**: `id`, `user_id`, `product_id`, `quantity`, `UNIQUE(user_id, product_id)`.
- **`contact_messages`**: `id`, `name`, `email`, `phone`, `subject`, `message`, `is_read`.
- **`inventory_movements`**: `id`, `product_id`, `change` (+/-), `reason`, `order_id`, `created_by`, `created_at`.

### 2. Helper Security Function `is_admin()`
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;
```
Runs under `SECURITY DEFINER` with fixed `search_path = public` to prevent privilege escalation and ensure fast, recursive-safe RLS evaluations.

### 3. Row Level Security (RLS) Rules
- **Public / Customers**:
  - Can read **active** products and categories (`is_active = true`).
  - Can read **approved** reviews (`is_approved = true`) and their own reviews.
  - Can manage (**SELECT**, **INSERT**, **UPDATE**, **DELETE**) **only their own** cart, addresses, wishlist, and orders.
  - Can submit contact messages.
- **Admins** (via `is_admin()`):
  - Have full access (**SELECT**, **INSERT**, **UPDATE**, **DELETE**) across all tables, including unapproved reviews, inventory movements, and customer orders.

### 4. Atomic Checkout RPC: `place_order()`
Runs as a single ACID transaction (`SECURITY DEFINER`):
1. Verifies caller authentication (`auth.uid()`).
2. Locks required product rows (`SELECT ... FOR UPDATE`) to prevent concurrent inventory overselling.
3. Validates stock availability. If insufficient, rolls back and raises an exception.
4. Decrements `products.stock` and logs the audit trail into `inventory_movements`.
5. Validates and applies coupon code (checking expiration date, usage limits, and minimum order amount).
6. Computes shipping fee (e.g. Free shipping for orders &ge; Rs. 5,000).
7. Inserts the `orders` row and corresponding `order_items` (snapshotting live product name & price).
8. Removes purchased items from customer's `cart_items`.
9. Returns the created `order_id` (UUID).

### 5. Supabase Storage Bucket: `product-images`
- Bucket: `product-images` (public read, 5 MB file size limit, images MIME types).
- RLS Policies on `storage.objects`:
  - Public can view images.
  - Only admins (`public.is_admin()`) can upload, update, and delete images.

---

## 🚀 Getting Started & Applying Migrations

### Prerequisites
- Node.js &ge; 18
- `pnpm` &ge; 9 (or `npm`)
- Docker (only if running Supabase locally via CLI)

### 1. Install Dependencies
In the root directory, run:
```bash
pnpm install
```

---

### 2. Setting Up Supabase

You can run Supabase either **locally using the Supabase CLI** or on **Supabase Cloud**.

#### Option A: Local Supabase CLI (Recommended for Development)
1. Initialize and start Supabase local containers:
   ```bash
   npx supabase start
   ```
2. Apply the schema migration and seed data:
   ```bash
   npx supabase db reset
   ```
   > `supabase db reset` automatically executes all migration files in `supabase/migrations/` in order, followed by `supabase/seed.sql`.
3. Check your local API credentials:
   ```bash
   npx supabase status
   ```
   Note the `API URL` (usually `http://127.0.0.1:54321`) and `anon key`.

---

#### Option B: Supabase Cloud Project
1. Log into [supabase.com](https://supabase.com) and create a new project.
2. Go to the **SQL Editor** tab in the dashboard.
3. Open `supabase/migrations/20240101000000_wewala_schema.sql`, paste its content into the SQL Editor, and click **Run**.
4. Open `supabase/seed.sql`, paste its content into the SQL Editor, and click **Run**.
5. Go to **Project Settings** &rarr; **API** to copy your **Project URL** and **`anon` public API key**.

---

## 🔑 Setting Up Environment Variables

Create `.env` files in:
1. Root `.env` (optional for scripts)
2. `apps/web/.env`
3. `apps/desktop/.env`

Use `.env.example` as a template:

### For Local Supabase:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Your local anon key from supabase status
```

### For Supabase Cloud:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

---

## 💻 Running the Applications

### Run Web Storefront (`/apps/web`)
```bash
pnpm dev:web
```
Opens at [http://localhost:5173](http://localhost:5173).
- Browse categories: *Grocery & Daily Staples*, *Fresh Farm Produce*, *Ceylon Teas & Beverages*.
- Search items by keyword or SKU.
- Add products to basket.
- Test coupons:
  - `WELCOME10` (10% off)
  - `WEWALA500` (Rs. 500 off orders over Rs. 3,500)
- Sign up with an email: trigger auto-creates profile in `public.profiles`.
- Click **Confirm Order** to trigger the `place_order` transaction.

### Run Desktop POS / Store Management (`/apps/desktop`)
```bash
pnpm dev:desktop
```
Opens at [http://localhost:5174](http://localhost:5174).
- View inventory levels and low-stock alerts.
- Quick restock buttons that insert into `inventory_movements`.
- View real-time customer orders placed through `place_order`.
- View RLS specifications and admin status.

### Build All Workspaces
```bash
pnpm build
```

### Typecheck All Workspaces
```bash
pnpm typecheck
```

---

## 📦 Using `@wewala/shared` in Code

The shared package provides typed Supabase clients and interfaces:

```typescript
import { createStoreSupabaseClient, invokePlaceOrder } from '@wewala/shared';

const supabase = createStoreSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Atomic checkout transaction
const { orderId, error } = await invokePlaceOrder(supabase, {
  items: [
    { product_id: '22222222-2222-2222-2222-222222222001', quantity: 2 },
  ],
  shipping_address: {
    recipient_name: 'Kasun Perera',
    phone: '0771234567',
    street_address: '142 Temple Road',
    city: 'Wewala',
    postal_code: '10300',
    country: 'Sri Lanka',
  },
  payment_method: 'cod',
  coupon_code: 'WELCOME10',
});

if (error) {
  console.error('Order placement failed:', error.message);
} else {
  console.log('Order created with ID:', orderId);
}
```

---

## 🛡️ Promoting a User to Admin

To test admin privileges (`is_admin()` = true):
In Supabase SQL Editor:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@example.com');
```
Once updated, the user will have full read/write access across all tables and the `product-images` storage bucket.
