# 🛡️ FocusGuard

**Block Distractions. Stay Focused.**

A professional Chrome extension for blocking distracting websites with account system, Pro subscriptions, and cloud sync.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

### Free
- 🎯 One-click Focus Mode toggle
- 📱 Quick block presets (Social, Video, News, Shopping, Gaming)
- 🔗 Block up to 5 custom websites
- 📊 Basic statistics (blocks today, total, streak)
- 💬 Motivational quotes on blocked pages

### Pro ($4.99/month)
- ♾️ Unlimited blocked sites
- ⏰ Focus scheduling (auto-enable during work hours)
- 🔐 Password protection (prevent disabling)
- ☁️ Cloud sync across devices
- 📈 Advanced analytics & history
- 🎨 All category presets

---

## 🚀 Quick Start

### Test Locally (No Setup Required)
```bash
1. Clone/download this folder
2. Open chrome://extensions
3. Enable "Developer mode"
4. Click "Load unpacked" → select this folder
5. Done! Extension works with local storage
```

### Full Setup (With Accounts & Payments)
See [docs/SETUP.md](docs/SETUP.md) for complete instructions.

---

## 📁 Project Structure

```
focusguard/
├── manifest.json       # Extension config
├── config.js           # API keys (fill in before publishing)
├── background.js       # Service worker
├── api.js              # Supabase client
├── popup.html/js       # Extension popup
├── auth.html/js        # Sign in/up page
├── blocked.html        # Blocked site page
├── options.html/js     # Settings page
├── privacy.html        # Privacy policy
├── icons/              # Extension icons
├── backend/
│   ├── supabase/
│   │   └── schema.sql  # Database schema
│   └── functions/      # Stripe edge functions
├── docs/
│   ├── SETUP.md        # Setup guide
│   └── STORE_LISTING.md # Chrome Web Store listing
└── landing/            # Marketing website
```

---

## ⚙️ Configuration

Edit `config.js` with your API keys:

```javascript
SUPABASE_URL: 'https://xxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJ...',
STRIPE_PUBLISHABLE_KEY: 'pk_live_...',
STRIPE_PRICE_ID_MONTHLY: 'price_...',
STRIPE_PRICE_ID_YEARLY: 'price_...',
```

---

## 🔧 Tech Stack

- **Extension:** Manifest V3, Vanilla JS, Chrome APIs
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Payments:** Stripe (Subscriptions, Customer Portal)
- **Auth:** Email/Password, Google OAuth

---

## 📱 Screenshots

[Add screenshots here]

---

## 🛡️ Privacy

- All data stored locally by default
- No browsing history collection
- Optional cloud sync (user-controlled)
- Payments via Stripe (we never see card details)

See [privacy.html](privacy.html) for full policy.

---

## 📝 License

MIT License - feel free to modify and use.

---

## 💬 Support

- Email: support@focusguard.app
- Issues: [GitHub Issues]

---

Made with ❤️ for productivity
