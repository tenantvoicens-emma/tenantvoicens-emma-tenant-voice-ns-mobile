# Plan: "Your reviews" — see, edit and delete your own reviews

Status: **planned, not built.** The current version of the site stays as is
while the first Reddit test group uses it. Build this on a branch, test it on
a Vercel preview deployment, and merge only when ready.

Decided: November 3, 2026.

## Why

Reviews are anonymous, so when a review breaks the guidelines (singles out a
staff member, states an accusation as fact, identifies other tenants) the
moderator has no way to tell the writer or ask for a change. Good
experiences get lost. Writers who submitted while signed in are already
privately linked to their reviews (`private.review_authorship`); this plan
uses that link to give them a second chance, and lets anyone with an
account keep their review up to date.

## Decisions

| Question | Decision |
| --- | --- |
| Can writers edit their reviews? | Yes, signed-in writers only, and every edit goes back through moderation. |
| Can writers delete their published reviews? | **Yes**, it's their experience. Deletion is immediate. |
| How long can a review be edited? | **Any time.** Reviews can be updated as a building changes. |
| Does a published review disappear while an edit is checked? | **No.** The current version stays live until the edit is approved. If the edit is rejected, the original stays up. |
| Do writers see the moderator's private note? | **No.** There's a separate "reason for the writer", kept apart from the private note. |

Not decided yet:
- Email the writer when a review or edit is published or not published?
  Uses the Resend allowance (100 a day on the free plan); fine at current
  volume. Suggest: off at first, add later.
- The exact list of preset reasons (draft below).

## What the writer sees

### Account page: "Your reviews"
A list of the signed-in writer's own reviews, newest first. Each shows the
building, the date and a status:

- **Pending:** "Waiting for the moderator. Usually within a day."
- **Published:** link to the building page. Actions: Edit, Delete.
- **Published, edit pending:** "Your changes are waiting for the moderator.
  The current version stays up until then." Actions: Edit again (replaces
  the pending edit), Cancel the edit, Delete.
- **Not published:** the reason for the writer (if given), plus guidance
  linking to the review guidelines. Actions: Edit and resubmit, Delete.
- **Published, edit not accepted:** "Your latest changes weren't
  published" plus the reason. The published version is unchanged.
  Actions: Edit again, Delete.

- **Published, edited by a moderator:** (moderator edits, which remove
  words only, were added on November 3, 2026.) Show "A moderator removed
  some words" with the removed words crossed out, so the writer learns the
  rules. Actions: Edit and resubmit, Delete (so a writer who doesn't like
  the edited version can withdraw it). Optionally email them when it
  happens.

Only the writer sees this list. Public pages stay exactly as anonymous as
today.

Reviews submitted without an account can't be claimed later (there's no
safe way to prove who wrote them). The form and the Reddit post should keep
saying "sign in if you might want to edit your review later".

### Editing
- Reuses the review form, filled in with the current text and ratings.
- The building can't be changed. To review a different building, write a
  new review.
- Same checks as a new review: Turnstile, validation and the rate limit
  (edits count toward the same hourly limit).
- After saving: "Thanks, your changes will appear once they're checked."

### Deleting
- Confirmation dialog: "Delete this review? It will be removed from the
  site straight away. This can't be undone."
- Removes the review, its ratings, any pending edit, the authorship link and
  its moderation history. The building's ratings update right away.
- A writer-added building that no longer has any review is removed too
  (same rule the 24-month clean-up already uses).

## What the moderator sees

- The Pending tab also lists **edits**, labelled "Edit to a published
  review" or "Resubmitted after rejection".
- Edits show **what changed**: the old and new text with changes
  highlighted, and any ratings that changed (old → new).
- Approve: the edit replaces the published version (or publishes a
  resubmitted review).
- Reject: the published version stays (or the review stays unpublished).
- The reject/unpublish dialog gets a second field, **"Reason shown to the
  writer"** (optional), with presets, next to the existing private note.
  It's only shown to the writer if the review is linked to an account; the
  dialog says so.
- Moderation history records edits and deletions ("Deleted by the writer"),
  except that a deleted review's history goes with it.

Draft preset reasons for the writer:
- Singles out a staff member or another person. Try "management" instead.
- States an accusation as fact. Describe what happened to you instead.
- Includes details that could identify you or other tenants.
- Includes threats, insults or personal attacks.
- Doesn't describe your own experience of renting there.

## Data changes (Supabase)

New migration, applied the usual way. Everything new stays in the
`private` schema and is reached only through `SECURITY DEFINER` functions,
like the existing authorship and moderation tables.

1. **`private.review_revisions`**: proposed edits.
   - `id`, `review_id` (FK → reviews, cascade delete), `review_text`,
     `occupancy_duration`, `would_live_again`, `property_ratings` (jsonb),
     `landlord_ratings` (jsonb), `status` (`pending` / `approved` /
     `rejected` / `cancelled`), `created_at`, `decided_at`.
   - At most one `pending` revision per review (partial unique index).
2. **Reason for the writer**: add `writer_reason text` (≤ 300 chars) to
   `private.moderation_events`, and a nullable `revision_id` so an event can
   be about an edit rather than the original.
3. **Functions** (all check `auth.uid()` against
   `private.review_authorship`):
   - `get_my_reviews()`: the caller's reviews with status, pending/rejected
     edit state, and the latest writer reason. Never returns private notes.
   - `submit_review_edit(review_id, …)`: called from a new server route
     (same Turnstile and rate-limit checks as `app/api/reviews`). For a
     published review it creates a pending revision; for a rejected review
     it updates the review in place and sets it back to `pending`.
   - `cancel_review_edit(review_id)`.
   - `delete_my_review(review_id)`.
4. **Moderator functions:**
   - `moderate_review` gains `p_writer_reason`.
   - New `moderate_review_revision(revision_id, status, note, writer_reason)`:
     approving copies the revision onto the review and replaces its ratings
     in one transaction.
   - The admin queue query includes pending revisions with the current
     published version for comparison.
5. **Retention:** rejected revisions follow the same 24-month rule as
   rejected reviews (extend `private.delete_old_rejected_reviews`).
6. **Account deletion:** unchanged. Published reviews stay up, anonymous and
   unlinked; with the link gone they can no longer be edited, and pending
   edits are discarded.

## Pages and code

- `app/account/AccountClient.tsx`: new "Your reviews" section (probably its
  own component under `components/account/`).
- `app/submit-review/page.tsx`: an edit mode (`?edit=<id>`) that loads the
  writer's review and saves through the new route. Doesn't touch the
  unfinished-review draft for new reviews.
- `app/api/reviews/[id]/route.ts` (new): edit and delete, signed-in only.
- `app/admin/page.tsx` and `components/admin/ModerationDialog.tsx`: edit
  labels, the text comparison, and the writer-reason field.
- `components/admin/ModerationChecklist.tsx`: add "Use the reason for the
  writer so they can fix and resubmit".
- Policies page: explain editing (edits are re-checked, the published
  version stays up meanwhile), deleting, and that writers see the reason
  for a rejection but not the moderator's private notes. Update the
  "Last updated" date.
- Review form note: change "linked to your account for future account
  features" to say what it now does: see, edit and delete your review.

## Testing before it goes live

On a preview deployment, with a test account:
1. Submit while signed in, then check that it appears as Pending in "Your
   reviews".
2. Reject with a reason. The writer sees "Not published" and the reason,
   but **not** the private note.
3. Edit and resubmit. It shows as Pending again in the queue, marked
   "Resubmitted". Approve it and check it publishes.
4. Edit the published review. The old version stays live; the queue shows
   the changes. Reject the edit: the original stays. Edit again and approve:
   the new version replaces it, and the building's ratings update.
5. Delete a published review. It's gone from the building page, the ratings
   update, and it's gone from the queue and history.
6. Signed out, and as a different account: the edit and delete routes and
   functions refuse to act on someone else's review.
7. Public pages and the public reviews table still contain no account
   details (repeat the column-privilege check).
8. Phone layout for "Your reviews", the edit form and the moderation
   comparison.
