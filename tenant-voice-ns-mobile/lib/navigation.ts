export function getPropertyHref(slug: string, searchTerm: string) {
  const params = new URLSearchParams({ from: "discover" });
  const normalizedSearchTerm = searchTerm.trim();

  if (normalizedSearchTerm) {
    params.set("q", normalizedSearchTerm);
  }

  return `/properties/${encodeURIComponent(slug)}?${params.toString()}`;
}