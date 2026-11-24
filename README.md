# MyPantryPal

**Know your fridge. Save your money. Eat better.**

MyPantryPal is a smart kitchen assistant for people who live alone. It keeps track of the food you have, warns you before it expires, suggests recipes from your own ingredients, watches your grocery budget and shows your nutrition, spending and food-waste progress.

Created by: **Daria Pugacheva**
© 2026 MyPantryPal. All rights reserved.

---

## Features

| Section | What it does |
| --- | --- |
| **Home** | Greeting, fridge / budget / nutrition / food-saved cards, daily tip, "Use These Soon!", recommended recipes, smart shopping reminder, today's vitamin reminders |
| **My Fridge** | Scan a photo (AI suggestions with confidence and "Is this milk or yogurt?" questions), upload, or add manually. Filters, search, sort, edit, delete, mark as used, discard with a reason, duplicate check |
| **Cook** | "What Can I Cook Today?" ranking by available ingredients, expiring food, protein goal, time, cost and your ratings. Filters, recipe detail, step-by-step cooking mode with timers, "add missing ingredients", save and rate. A meal is only logged after you confirm you cooked and ate it |
| **Shop & Budget** | Weekly and monthly budget with warnings at 75%, 90% and 100%. Shopping list by category with duplicate detection ("You already have eggs in your fridge!"). Smart suggestions, cheaper alternatives, "Deals Near You", receipt scanning with review before saving, spending insights |
| **Progress** | Calories, protein, carbs, fat and water. Meal history, protein and spending charts, food-waste analytics, weekly report and achievements |
| **Me** | Profile, nutrition goals, allergies (strict exclusions), diets, cuisines, vitamin reminders |
| **Settings** | Budget, currency, stores, notification switches, view and copy your data, sample data, sign out, delete account |

Onboarding has 7 steps with Pip the penguin. A demo account (**Julian, 21**, a student) is available from the sign-in page and is clearly separated from real accounts.

## Honest by design

- **Expiration dates from photos are estimates** based on food type and storage, and are always labelled that way.
- **No unconfirmed AI result is saved.** Fridge scans and receipts are always reviewed and confirmed first.
- **Allergies are hard exclusions.** AI recipes are re-checked on the device before they are shown.
- **Coupons marked DEMO are demonstration data** from fictional stores. "Mark as used" only tracks use inside MyPantryPal. Real offers appear only when a store partner API is connected.
- **Sample prices are labelled as estimates.**
- **Vitamin reminders are not medical advice.** The app only reminds you about what you added.

## Tech stack

Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS · Lucide icons · Zod · Supabase (Auth, PostgreSQL with Row Level Security, Storage) · OpenAI (vision, OCR, text) · USDA FoodData Central

```
app/                 routes: (auth), onboarding, (dashboard) pages, api/* route handlers
components/          ui kit, penguin mascot, layout, fridge, shop, recipes, views (one per screen)
lib/
  ai/                server-only OpenAI client and prompts, offline tips
  analytics/         budget, nutrition, waste, reports, achievements, notifications
  auth/              AuthProvider (Supabase or browser accounts, demo account)
  data/              DataProvider + repositories (browser storage or Supabase)
  etl/               product name normalization, unit and category mapping
  nutrition/         shelf-life estimates, local nutrition table
  recipes/           recipe library (18 recipes) and ranking engine
  validations/       Zod schemas for every AI response and form
supabase/            migrations (schema, RLS, storage policies) and seed.sql
tests/               unit tests (normalization, allergies, budget levels, waste)
demo/, scripts/      single-file presentation build, seed generator, test runner
```

## Run it locally

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local     # optional: every key is optional
npm run dev                    # http://localhost:3000
```

With no keys the app runs in **demo mode**: accounts and data are stored in the browser, and AI features show manual fallbacks (type what you see, paste receipt lines, built-in recipes, tips and nutrition table).

Other commands:

```bash
npm run typecheck     # TypeScript
npm test              # unit tests
npm run build         # production build
npm run build:demo    # one self-contained HTML file in demo-dist/ (for presentations)
npm run seed:sql      # regenerate supabase/seed.sql from the recipe library and demo coupons
```

## Connect the real services

### 1. Supabase (accounts, database, photos)
1. Create a project at supabase.com.
2. In **SQL Editor**, run `supabase/migrations/20261123000000_init.sql`, then `supabase/seed.sql`.
   (Or with the Supabase CLI: `supabase db push` and `supabase db seed`.)
3. In **Authentication → URL configuration**, add your site URL and `<site>/reset-password` as a redirect URL.
4. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

Every user table has Row Level Security so people can only read and change their own rows. Photos go to the private `uploads` bucket in a folder named after the user id. `delete_my_account()` removes the user, their rows and their photos.

### 2. OpenAI (fridge recognition, receipts, AI recipes and tips)
Set `OPENAI_API_KEY` (server-side only). Models can be changed with `OPENAI_VISION_MODEL` and `OPENAI_TEXT_MODEL`. When Supabase is connected, AI routes require a signed-in user.

### 3. USDA FoodData Central (nutrition)
Get a free key and set `USDA_API_KEY`. Without it, a built-in table of common foods is used.

### 4. Grocery partner (optional)
Set `GROCERY_PARTNER_API_URL` / `GROCERY_PARTNER_API_KEY`. The app expects `GET {url}/coupons` to return `{ "coupons": Coupon[] }`. Without it, demo coupons are shown with a DEMO label.

You can check which services are live on **Help & About → Connected services**.

## Deploy (Vercel)

1. Push the project to a Git repository and import it in Vercel (framework: Next.js).
2. Add the environment variables from `.env.example` in **Project → Settings → Environment Variables**.
3. Deploy. Add the Vercel URL to Supabase's allowed redirect URLs.

## Security notes

- API keys are read only in server route handlers (`app/api/*`, `lib/ai/openai.ts` is `server-only`). Nothing secret uses the `NEXT_PUBLIC_` prefix.
- All AI output is validated with Zod before it is shown; invalid output is rejected with a friendly error.
- Images are checked for type (JPG, PNG, WEBP) and size (8 MB) and resized on the device before upload.
- The demo environment uses only fictional data (Julian, fictional stores).

## Future features (not built yet)

Real store partnerships and live coupons, barcode scanning, shared household fridges, smart-fridge camera integration, push notifications on phones, meal-plan calendar.

---

Created by: Daria Pugacheva · © 2026 MyPantryPal. All rights reserved.
