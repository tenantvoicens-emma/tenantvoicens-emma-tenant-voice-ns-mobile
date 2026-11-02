// The one account that can moderate reviews. The database checks the same
// address (in its row-level security policies and moderation functions),
// so changing it means a database migration too.
export const MODERATOR_EMAIL = "tenantvoicens@gmail.com";

export function isModeratorEmail(email: string | null | undefined) {
  return email?.toLowerCase() === MODERATOR_EMAIL;
}
