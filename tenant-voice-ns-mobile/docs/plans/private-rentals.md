# Plan: Private rentals (houses, rooms, basement suites, duplexes)

Status: **planned, not built.** Questions marked **Decide** need an answer
before building. Build on a branch, test on a Vercel preview, merge when
ready.

Started: November 4, 2026, from feedback on the Reddit post.

## Why

Renters said private rentals often have the worst problems, and warning
people about them is the main reason the site exists. Right now:

- Only HRM registry buildings with **4 or more units** were imported, and
  the policies page says this is so "a review can't single out the one or
  two tenants of a house or duplex".
- But renters can already add any address when they write a review, so
  small rentals can get in today, with no extra protection. One of the
  first 16 added was described by its writer as "Apartment/town house".

So the real choice isn't whether small rentals appear. It's whether they
appear with protections designed for them.

## What's different about small rentals

1. **The writer is easy to identify.** With one or two tenants, the
   landlord knows who wrote it. That opens the door to retaliation: a rent
   increase, a notice to leave, a kept deposit, a bad reference.
2. **The landlord is usually a private person**, and the address is often
   their own home. A review about a person carries more risk (privacy,
   defamation) than one about a company.
3. **Other people are easier to identify**: roommates, or the owner's
   family when you rent a room in their home.

## The data we already have

The HRM registry file (`.github/agents/Residential_Rental_Registry_*.csv`)
has **10,527 registrations with 1 to 3 units** that weren't imported. Each
one has a rental type: entire house (4,720), basement apartment (727),
bedroom only (384), apartments in a small building, backyard suites, and so
on.

Proposal: import them **unlisted**, the same way renter-added buildings
start hidden. No pages and no search results, so we don't publish 10,000
home addresses as a browsable list. When a renter types one of these
addresses, `find_or_suggest_property` already matches hidden properties.
The review then attaches to the registry entry with the type filled in.
The property is listed once a review for it is approved, as today.

## Decisions

| Question | Recommendation |
| --- | --- |
| **Decide:** Who can review a small rental? | **Former tenants only** at first. It's the simplest protection against retaliation. Current tenants get a short explanation ("come back after you move out; we'll keep your draft") instead of the form. Can be relaxed later. |
| **Decide:** What address is shown? | **The full street address, no unit number.** A warning is only useful if renters can match it to a listing. The address is already public in the HRM registry. |
| **Decide:** Show the landlord's name? | **Never** for private landlords. Shown as "Private landlord". The moderator already removes names, and the unused `landlords.type = 'private'` value shouldn't become named profiles. |
| How precise is the date? | **Year only** for small rentals ("Reviewed in 2026"), with "Lived here" still shown in ranges. This must be done in the database, not just on the page, because `reviews.created_at` can be read through the public API today. |
| **Decide:** Ask whether the landlord lived there too? | **Yes, and show it** ("Landlord lived on site"). It's useful for renters, and it changes what can go wrong. |
| New landlord rating categories? | **Add for everyone, optional:** "Respects your privacy (gives notice before entering)" and "Deposit handling". These are the most common complaints with private landlords. Existing reviews show N/A for them. |

## What renters see

### Review form
- When adding a property: **"What did you rent?"** Options: a whole house,
  a room in a shared home, a basement or in-law suite, a unit in a duplex
  or triplex, an apartment in a larger building. Filled in automatically
  when the address matches the registry.
- For small rentals: **"Do you still live there?"** If yes, show the
  explanation above instead of the form.
- For small rentals: **"Did the landlord live there too?"** Yes, no or not
  sure.
- A short note: "Leave out anything that could identify you, your
  roommates or the landlord's family."

### Property page
- A label: "Private rental · Entire house" (or Room, Basement suite and so
  on), plus "Landlord lived on site" when known.
- Review dates show the year only.

## Moderation

Small rentals get a flag in the admin queue and extra checklist items:
- No names of the landlord, their family or roommates.
- Nothing that identifies the writer, such as unusual details only they'd
  know about, their health or their family.
- Experiences, not accusations. "They kept my deposit and never explained
  why" is fine. "He's a thief" is not.

## Policies page

- Replace the "four or more units" sentence with a short section on houses,
  rooms and small rentals: who can review, what's shown, and why.
- Add how an owner can raise a concern about a review that breaks the
  guidelines. A review isn't removed just for being negative.
- Update "Last updated".

## Check before launch

- **Get advice from someone qualified** on reviews of private individuals
  (defamation and privacy exposure), for example a lawyer or a legal
  clinic. This plan doesn't assume an answer.
- **Check whether the Residential Tenancies Act covers room rentals** where
  the renter shares a kitchen or bathroom with the owner. If it doesn't, a
  short note for renters would help, but confirm it before writing it.

## Pages and code

- Migration: `properties.rental_kind` (`building`, `small_building`,
  `house`, `room`, `suite`), `properties.owner_occupied` (nullable).
  Coarsen the public date for small rentals: a view, or column privileges
  plus a `published_year`. New landlord rating categories.
- `scripts/registry-import/`: import 1 to 3 unit registrations as unlisted,
  mapping the registry's "Rental Unit Type" and "Building Type" to
  `rental_kind`.
- `find_or_suggest_property`: take `rental_kind` when a renter adds a
  property.
- `app/api/reviews/route.ts`: accept and check the new answers, and refuse
  current-tenant reviews of small rentals if that's the decision.
- `app/submit-review/`: the new questions.
- `app/properties/[slug]/page.tsx`: the label and year-only dates.
- `app/admin/` and `components/admin/ModerationChecklist.tsx`: the flag and
  checklist items.
- `app/policies/page.tsx`: the new section.

## Testing before it goes live

1. Type a small-rental address from the registry. It matches, the type is
   filled in, and no duplicate is created.
2. Small rental, "still live there": the review can't be submitted, and the
   draft is kept.
3. Approve a small-rental review. The page appears with the label and a
   year-only date, and the exact date can't be read through the public API.
4. Imported unlisted rentals never appear in search, the sitemap or Discover
   until they have an approved review.
5. A 4+ unit building review works exactly as before.
6. Check the phone layout of the new form questions.
