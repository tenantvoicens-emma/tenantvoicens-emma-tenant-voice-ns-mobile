# Tenant Voice NS (web app)

Moderated, anonymous reviews of rental properties by Nova Scotia renters.
Reviews are about the property only: landlords and property managers are not
rated or named. Built with Next.js (App Router, Cache Components) and
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
  Cloudflare Turnstile check, rate limit, validation),
  `app/api/review-reports` (report a published review: the same checks,
  with its own rate limit) and `app/api/account`
  (delete your account). Both use the Supabase service role key, which
  must never reach the browser.
- **Moderation** is limited to one account (`lib/moderator.ts`); the
  database enforces the same address in its policies and functions.
  Reports on published reviews are kept in `private.review_reports` and
  shown on the moderation page's Reports tab; a reported review stays up
  until the moderator decides, except a **"Legal concern"** report, which
  unpublishes the review at once (`submit_review_report` sets it to
  `rejected` and logs "system (automatic hide)"). The moderator then
  restores it or keeps it down.
- **Database changes** are SQL files in `supabase/migrations/`, applied in
  order. Apply a migration before deploying the app release that needs it:
  `20261108120000_property_only_reviews.sql` changes `submit_review`'s
  arguments, so the previous app release can't submit reviews after it. A nightly `pg_cron` job deletes rejected reviews after 24 months.
- **Building list**: the Halifax Regional Municipality Residential Rental
  Registry plus OpenStreetMap names (`scripts/registry-import/`). Buildings
  with 4 or more units are listed. Houses, suites, rooms, duplexes and
  condos (`properties.rental_kind`, `is_small_rental`) are kept hidden
  until a review for one is approved, as are places renters add. Small
  rentals show "Private landlord" and only the year of each review
  (`reviews.published_on`); the exact time is readable only by the
  moderator.
- **Property only.** Reviews carry a star rating, optional detailed
  property ratings, ticked problems (`reviews.issues`, the list in
  `lib/review-issues.ts`) and optional free text. There are no landlord
  ratings and no landlord-on-site question. Landlord ratings collected
  before November 8, 2026 are kept in `public.landlord_ratings` but are no
  longer readable through the public API.
- **Optional proof pictures.** A review can carry up to 3 JPEGs (resized in
  the browser, which also strips metadata). They live in
  `private.review_evidence`, are never public, are readable only by the
  moderator through `get_review_evidence`, and are deleted with their
  review (including the 24-month cleanup of rejected reviews).
- **Landlords are never named.** `public.landlords` can be read by anyone,
  so a landlord's name must never be stored there. If landlord pages are
  ever added, link them with IDs kept out of public view.
- **Plans** for features not built yet are in `docs/plans/`.

## Environment variables

See `.env.example`. On Vercel, set them under Project Settings →
Environment Variables. `SUPABASE_SERVICE_ROLE_KEY` and
`TURNSTILE_SECRET_KEY` are secrets.
