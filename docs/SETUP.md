# FocusGuard Setup Guide

Complete guide to configure and deploy FocusGuard.

## Quick Start (5 minutes for basic setup)

### 1. Test Locally First
1. Open `chrome://extensions`
2. Enable "Developer mode"  
3. Click "Load unpacked" → select `focusguard` folder
4. Extension works immediately with local storage (no account needed)

---

## Full Setup (30 minutes)

### Step 1: Supabase Setup

1. Create account at [supabase.com](https://supabase.com)
2. Create new project "focusguard"
3. Go to **Settings > API**, copy:
   - Project URL → `config.js` → `SUPABASE_URL`
   - Anon key → `config.js` → `SUPABASE_ANON_KEY`
4. Go to **SQL Editor**, paste contents of `backend/supabase/schema.sql`, click Run

### Step 2: Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Go to **Developers > API Keys**, copy:
   - Publishable key → `config.js` → `STRIPE_PUBLISHABLE_KEY`
3. Go to **Products**, create "FocusGuard Pro":
   - Monthly: $4.99 → copy price_id
   - Yearly: $39.99 → copy price_id
4. Paste price IDs into `config.js`

### Step 3: Deploy Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_REF
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy stripe-webhook
```

### Step 4: Stripe Webhook

1. **Developers > Webhooks > Add endpoint**
2. URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Events: `customer.subscription.created`, `updated`, `deleted`

---

## Config Reference

```javascript
// config.js - fill these in
SUPABASE_URL: 'https://xxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJhbG...',
STRIPE_PUBLISHABLE_KEY: 'pk_live_...',
STRIPE_PRICE_ID_MONTHLY: 'price_xxx',
STRIPE_PRICE_ID_YEARLY: 'price_yyy',
```

---

## Publish to Chrome Web Store

1. Zip extension: `zip -r focusguard.zip . -x "backend/*" -x "docs/*"`
2. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay $5, upload ZIP, fill listing, submit
4. Review takes 1-3 days

---

## Support

Email: support@focusguard.app
