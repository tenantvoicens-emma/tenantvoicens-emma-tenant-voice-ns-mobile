// What each detailed rating means. 5 is always the best outcome for a
// renter, so "Noise levels: 5" means quiet. Shared by the review form and the
// Policies page so they never disagree. The `value` keys are what's stored.
export type RatingGuideEntry = {
  value: string;
  label: string;
  high: string;
  low: string;
};

export const propertyRatingGuide: RatingGuideEntry[] = [
  { value: "cleanliness", label: "Cleanliness", high: "clean and well kept", low: "dirty or neglected" },
  { value: "safety", label: "Safety", high: "you felt safe and secure", low: "you often felt unsafe" },
  { value: "common_areas", label: "Common areas", high: "hallways, lobby and laundry are well kept and working", low: "neglected or often broken" },
  { value: "noise_levels", label: "Noise levels", high: "quiet", low: "very noisy" },
  { value: "parking", label: "Parking", high: "easy, with enough spaces", low: "hard to find or unreliable" },
  { value: "amenities", label: "Amenities", high: "useful amenities (gym, storage, laundry…) in good shape", low: "few amenities, or ones that are often broken" },
  { value: "building_condition", label: "Building condition", high: "well maintained and in good repair", low: "run-down" },
  { value: "pet_friendliness", label: "Pet friendliness", high: "welcoming to pets", low: "pets not allowed, or made difficult" },
];

export const landlordRatingGuide: RatingGuideEntry[] = [
  { value: "communication", label: "Communication", high: "responsive and clear", low: "hard to reach or unclear" },
  { value: "repair_speed", label: "Repair speed", high: "repairs done quickly", low: "very slow, or never done" },
  { value: "professionalism", label: "Professionalism", high: "respectful and reliable", low: "disrespectful or unreliable" },
  { value: "lease_transparency", label: "Lease transparency", high: "clear terms, no surprises", low: "unclear terms or surprise costs" },
  { value: "move_in_experience", label: "Move-in experience", high: "unit ready and as described", low: "not ready, or not as described" },
];
