# Plan: Rent tracker

Status: **planned, not built.** Questions marked **Decide** need an answer
before building. Build on a branch, test on a Vercel preview, merge when
ready.

Started: November 4, 2026, from feedback on the Reddit post.

## Why

Listing sites show **asking** rent. This would show what renters
**actually pay**, and how fast it goes up after they move in. Nobody else
has that. (The early project notes said rent prices were what other sites
focus on and this one wouldn't. That was about advertised prices; this is
renter-reported data, which fits "reliable rental intelligence".)

## Two ways to report rent

1. **In the review form**: an optional "Your rent" step.
2. **"Just the rent"**: a short standalone form, for when your rent changes,
   or if you reviewed before the tracker existed. No written review and no
   ratings. It doesn't affect a building's star scores.

Both save to the same place.

## What to ask

Keep to things renters know without looking anything up:

- **Monthly rent**, in whole dollars. For a room, the rent for your room.
  Otherwise, the total for the unit, not your share.
- **Size:** room only, bachelor or studio, 1, 2, 3, or 4+ bedrooms.
- **Included:** heat, hot water, electricity, parking, internet, furnished.
  Each one is yes, no or not sure. These explain much of the difference in
  rent between units.
- **When:** the year this rent started (dropdown), and an optional month.
  Plus "This is my rent now".
- **Optional: "What was it before?"** The previous rent, for anyone
  reporting an increase. This is what makes it a tracker.

## Privacy rules

Rent, unit size and year together can identify a tenant, so:

- **Individual amounts are never shown publicly.** Reports are stored in
  the `private` schema. The public only sees totals worked out by a
  database function.
- **Not linked publicly to a review.** A rent given in the review form is
  stored separately, so a review never shows "this person pays $X". The
  link is kept privately, for moderation and to catch duplicates.
- **Decide: when a building's numbers are shown.** Recommendation: only
  when there are **3 or more reports** for that building and unit size in
  the last 3 years. Show a range rounded to $25 ("$1,650 to $1,800 a
  month"), plus "based on N reports".
- **Small rentals** (see `private-rentals.md`) are never shown at the
  property level. One house is one tenant. Their reports only count toward
  area numbers ("2 bedrooms in Dartmouth").

## Data quality

"Bad data is worse than missing data":

- Amounts outside $100 to $10,000 a month are refused with a friendly
  message.
- Same Turnstile check and rate limit as reviews.
- **Decide: moderate every report, or only unusual ones?** Recommendation:
  accept reports automatically, and send any that are more than 50% away
  from the building's typical rent to the moderator. The moderator can
  remove any report. Checking every one would quickly outgrow the review
  queue, and reports have no written text to check.
- Signed in: one "current rent" per account per building. A new report
  replaces the old one as current, and the old one stays as history.
  Signed-out reports can't be checked for duplicates. That's accepted, and
  the outlier check covers the worst cases.

## What renters see

- **Property page: "What renters pay"**, for each unit size: the rounded
  range, the number of reports and the years covered. Once there's enough
  before-and-after data: "Rent here went up about X% a year." Below the
  threshold: "Not enough reports yet. Add yours", linking to "Just the
  rent".
- **Later:** area numbers on Discover or a separate page (median rent by
  size and community). Any wording about Nova Scotia's rent cap should be
  checked against the current rules before it's written.

## Existing reviewers

People who reviewed without an account can't be contacted, so the "Just
the rent" form is how they add their rent. Share it in a Reddit update.
Signed-in writers could see "Add your rent" next to their review once the
"Your reviews" plan (`your-reviews-and-editing.md`) is built.

## Policies page

What's collected, that individual amounts are never shown, the 3-report
rule, how long reports are kept, and that rent reports don't affect star
ratings. Update "Last updated".

## Pages and code

- Migration: `private.rent_reports` (property, optional review link,
  optional account link, amount, size, included items, start year and
  month, previous amount, is-current, status, created). A
  `public.property_rent_summary(slug)` function applies the threshold and
  rounding. Area totals later.
- `app/api/rent/route.ts` (new): Turnstile, validation, rate limit.
- `app/submit-rent/page.tsx` (new): "Just the rent", with the same property
  search and add-a-building step as reviews.
- `app/submit-review/`: the optional "Your rent" step.
- `app/properties/[slug]/page.tsx`: the "What renters pay" card.
- `app/admin/`: flagged reports, with a remove action.
- `app/policies/page.tsx`: the new section.

## Order with the private-rentals plan

Both add questions to the review form, and the rent privacy rules depend
on how small rentals are handled. Suggestion: settle the private-rentals
decisions first, then design both form changes together so the form only
changes once.

## Testing before it goes live

1. Submit a rent-only report and one through the review form. Both are
   stored, and neither appears individually anywhere public.
2. Two reports for a building: "Not enough reports yet". A third: the
   rounded range appears.
3. A small rental's report never appears on its page.
4. Out-of-range amounts are refused, and a far-off amount goes to the
   moderator.
5. The public API can't read `private.rent_reports` or any single amount.
6. Check the phone layout of both forms and the property card.
