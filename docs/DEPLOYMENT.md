# Wewala Stores - Production Deployment Guide

This document outlines end-to-end production deployment procedures for the **Wewala Stores** platform:
1. [Web Application (Vercel & Netlify)](#1-web-application-deployment)
2. [Supabase Edge Functions](#2-supabase-edge-functions-deployment)
3. [Supabase Auth & Security Configuration](#3-supabase-auth--security-configuration)
4. [Desktop Application Installers & Code Signing](#4-desktop-application-electron)

---

## 1. Web Application Deployment

The storefront web app is a high-performance React + Vite Single Page Application located in `apps/web`.

### A. Deploying to Vercel

1. **Connect Repository**: Import the Git repository in the Vercel dashboard.
2. **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.` (Monorepo root)
   - **Build Command**: `pnpm --filter @wewala/web build`
   - **Output Directory**: `apps/web/dist`
   - **Install Command**: `pnpm install`

3. **SPA Routing Configuration (`apps/web/vercel.json`)**:
   Ensure client-side routing rewrites are configured:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

4. **Environment Variables**:
   Add the following in **Project Settings -> Environment Variables**:
   ```ini
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi... (anon key only, NEVER service_role)
   ```

---

### B. Deploying to Netlify

1. **Connect Repository**: Create a new site from your Git provider.
2. **Build Settings**:
   - **Base directory**: `.`
   - **Build command**: `pnpm --filter @wewala/web build`
   - **Publish directory**: `apps/web/dist`

3. **SPA Redirects (`apps/web/netlify.toml` or `public/_redirects`)**:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

4. **Environment Variables**:
   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Site configuration -> Environment variables**.

---

## 2. Supabase Edge Functions Deployment

Edge Functions reside in `supabase/functions/` and run on the Deno runtime. They handle Stripe payment session creation and webhook signature validation securely without exposing secret keys to the browser.

### A. Prerequisites
Install the Supabase CLI and log in:
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-id>
```

### B. Deploy Functions
Deploy both functions:
```bash
# 1. Payment session generator
supabase functions deploy create-payment-session --no-verify-jwt

# 2. Stripe payment webhook listener
supabase functions deploy payment-webhook --no-verify-jwt
```

### C. Set Edge Function Secrets
Secrets must be stored **exclusively** in the Supabase Edge Function environment:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_51...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```
*(Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected into the Edge Function runtime by Supabase).*

> [!IMPORTANT]
> **Strict Zero-Trust Rule**: Never include `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in frontend `.env` files or client bundles. They are used solely within Edge Functions.

### D. Stripe Webhook Configuration
In the **Stripe Dashboard -> Developers -> Webhooks**:
1. Click **Add endpoint**.
2. **Endpoint URL**: `https://<your-project-id>.supabase.co/functions/v1/payment-webhook`
3. **Events to listen to**: `checkout.session.completed`
4. Copy the **Signing secret** (`whsec_...`) and save it via `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.

---

## 3. Supabase Auth & Security Configuration

### A. Redirect URLs Configuration
In the **Supabase Dashboard -> Authentication -> URL Configuration**:

- **Site URL**:
  - `https://your-domain.com` (Your production storefront)

- **Redirect URLs** (Add all applicable environments):
  - `http://localhost:5173/**` (Local development storefront)
  - `http://localhost:5174/**` (Local desktop dev / alternate port)
  - `https://your-domain.com/**` (Production storefront)
  - `https://*-your-team.vercel.app/**` (Vercel preview branches)
  - `wewala-desktop://auth/callback` (Desktop app custom deep link)

### B. Email & Auth Providers
1. **Google OAuth**:
   - In Google Cloud Console, configure OAuth Client ID for Web.
   - Authorized redirect URI: `https://<your-project-id>.supabase.co/auth/v1/callback`
   - Paste Client ID and Client Secret into Supabase -> Auth -> Providers -> Google.
2. **SMTP Settings**:
   - In production, configure custom SMTP (e.g. Resend, SendGrid, Amazon SES) in Supabase -> Auth -> SMTP Settings to avoid built-in email rate limits.

---

## 4. Desktop Application (Electron)

The administration desktop app is located in `apps/desktop`. It communicates directly with Supabase using Row Level Security (RLS) and requires an authenticated profile with `role = 'admin'`.

### A. Building the Application
Run the build from the project root:
```bash
# 1. Typecheck and build React renderer
pnpm --filter @wewala/desktop build

# 2. Package desktop executable
pnpm --filter @wewala/desktop package
```

### B. Platform Installers

#### Windows (NSIS Installer & Portable .exe)
```bash
pnpm --filter @wewala/desktop build:win
```
Outputs installer to `apps/desktop/release/Wewala-Admin-Setup-1.0.0.exe`.

#### macOS (DMG / Zip)
```bash
pnpm --filter @wewala/desktop build:mac
```
Outputs `.dmg` installer and `.app` bundle to `apps/desktop/release/`.

#### Linux (AppImage & .deb)
```bash
pnpm --filter @wewala/desktop build:linux
```

---

### C. Code Signing

Code signing prevents Windows SmartScreen and macOS Gatekeeper security warnings.

#### Windows Authenticode Signing
Set the following environment variables in your CI/CD pipeline (e.g., GitHub Actions):
```bash
CSC_LINK=path/to/certificate.pfx   # Or base64 encoded certificate string
CSC_KEY_PASSWORD=your_certificate_password
```
`electron-builder` automatically signs the NSIS setup and executable with RFC 3161 timestamps.

#### macOS Signing & Apple Notarization
1. Export Developer ID Application certificate as `.p12`:
   ```bash
   CSC_LINK=path/to/developer_id.p12
   CSC_KEY_PASSWORD=certificate_password
   ```
2. For Apple Notarization, set:
   ```bash
   APPLE_ID=developer@wewala.com
   APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop
   APPLE_TEAM_ID=XXXXXXXXXX
   ```

---

### D. Automated Updates (electron-updater)

The desktop app includes `electron-updater` configured in `electron-builder.json`.

1. **GitHub Releases Provider**:
   ```json
   "publish": {
     "provider": "github",
     "owner": "wewala-stores",
     "repo": "wewala-desktop"
   }
   ```
2. In your CI/CD pipeline, publishing a GitHub release with tag `v1.0.1` uploads `latest.yml`, `latest-mac.yml`, and setup binaries.
3. The desktop app checks for updates on launch and downloads them in the background, prompting the administrator to restart and install.

---

## 5. Security & Pre-Launch Checklist

- [x] **RLS Enabled**: Verified on all 14 tables.
- [x] **Anon Key Only in Frontend**: Neither `apps/web` nor `apps/desktop` contains `service_role` keys.
- [x] **Edge Function Webhook Verification**: `payment-webhook` verifies Stripe signature header with `STRIPE_WEBHOOK_SECRET`.
- [x] **Database Indexes**: Foreign keys (`user_id`, `product_id`, `order_id`), status columns, and compound search indexes created.
- [x] **Input Validation**: Zod schemas validate checkout shipping forms, contact submissions, and product editor inputs.
- [x] **Error Boundaries**: Implemented in both web and desktop apps to catch renderer exceptions gracefully.
- [x] **Automated Tests**: Unit tests for cart store and financial calculation utilities passing cleanly (`pnpm test`).

