export type Property = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;

  overallRating: number;
  reviewCount: number;
  wouldLiveAgain: number;

  strengths: string[];
  concerns: string[];
};

export type PropertyListing = Omit<
  Pick<Property, "id" | "slug" | "name" | "address" | "city">,
  "id"
> & {
  id: number;
  reviewCount?: number;
  propertyRating?: number | null;
  landlordRating?: number | null;
};