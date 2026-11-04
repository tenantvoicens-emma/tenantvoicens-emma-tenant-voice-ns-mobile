# Tenant Voice NS (web app)

Moderated, anonymous reviews of rental buildings and landlords by Nova
Scotia renters. Built with Next.js (App Router, Cache Components) and
Supabase, deployed on Vercel.

## Run it locally

1. Copy `.env.example` to `.env.local` and fill in the values from the
   Supabase project (API settings) and Cloudflare Turnstile.
2. Install and start:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000.

Before pushing, run `npm run lint` and `npm run build`.

## How it fits together

- **Pages** live in `app/`: Discover (`/`), property pages
  (`/properties/[slug]`), the review form (`/submit-review`), Sign in /
  account (`/account`), Policies (`/policies`) and moderation (`/admin`).
- **The browser reads** public data straight from Supabase with the anon
  key. Row-level security only exposes approved reviews and listed
  buildings.
- **Writes go through the server**: `app/api/reviews` (submit a review:
  Cloudflare Turnstile check, rate limit, validation) and `app/api/account`
  (delete your account). Both use the Supabase service role key, which
  must never reach the browser.
- **Moderation** is limited to one account (`lib/moderator.ts`); the
  database enforces the same address in its policies and functions.
- **Database changes** are SQL files in `supabase/migrations/`, applied in
  order. A nightly `pg_cron` job deletes rejected reviews after 24 months.
- **Building list**: the Halifax Regional Municipality Residential Rental
  Registry plus OpenStreetMap names (`scripts/registry-import/`). Buildings
  with 4 or more units are listed. Houses, suites, rooms, duplexes and
  condos (`properties.rental_kind`, `is_small_rental`) are kept hidden
  until a review for one is approved, as are places renters add. Small
  rentals show "Private landlord" and only the year of each review
  (`reviews.published_on`); the exact time is readable only by the
  moderator.
- **Private landlords are never named.** `public.landlords` can be read by
  anyone, so a private landlord's name must never be stored there. If
  landlord pages are added (following a landlord across properties), link
  them with IDs kept out of public view.
- **Plans** for features not built yet are in `docs/plans/`.

## Environment variables

See `.env.example`. On Vercel, set them under Project Settings →
Environment Variables. `SUPABASE_SERVICE_ROLE_KEY` and
`TURNSTILE_SECRET_KEY` are secrets.
