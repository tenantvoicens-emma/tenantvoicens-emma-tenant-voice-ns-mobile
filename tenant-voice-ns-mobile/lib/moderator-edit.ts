// Moderator edits may only remove whole words from a review, never add,
// change or reorder them. The database enforces this
// (private.is_removal_only in the moderator_removal_edits migration); this
// copy gives the moderation screen instant feedback. Keep the two in step.

function words(text: string) {
  const trimmed = text.trim();
  return trimmed === "" ? [] : trimmed.split(/\s+/);
}

export function isRemovalOnly(original: string, edited: string) {
  const editedWords = words(edited);
  if (editedWords.length === 0) {
    return false;
  }
  let next = 0;
  for (const word of words(original)) {
    if (next < editedWords.length && word === editedWords[next]) {
      next += 1;
    }
  }
  return next === editedWords.length;
}

export type EditPiece = { text: string; removed: boolean };

// The original's words, each marked kept or removed, for showing what an
// edit takes out. Only meaningful when isRemovalOnly is true.
export function removedPieces(original: string, edited: string): EditPiece[] {
  const editedWords = words(edited);
  let next = 0;
  return words(original).map((word) => {
    const kept = next < editedWords.length && word === editedWords[next];
    if (kept) {
      next += 1;
    }
    return { text: word, removed: !kept };
  });
}

// What every edited review says, on the public site and in Policies.
export const MODERATOR_EDIT_NOTICE =
  "We only remove names, personal details and allegations of illegal conduct. We never add or change a writer’s words.";
