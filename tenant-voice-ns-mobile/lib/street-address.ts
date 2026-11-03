// Spells out an abbreviated street type in an address a renter typed, so
// buildings they add read like the registry's ("70 Ochterloney St" becomes
// "70 Ochterloney Street"). Only the street type is touched: the last word,
// or the one before a compass direction ("Main St W"). Anything after a
// comma is left alone. Search already treats both forms alike (see
// normalize_search_text), so this is only about how the address looks.

const STREET_TYPES: Record<string, string> = {
  st: "Street",
  rd: "Road",
  dr: "Drive",
  ave: "Avenue",
  av: "Avenue",
  blvd: "Boulevard",
  ln: "Lane",
  crt: "Court",
  ct: "Court",
  cres: "Crescent",
  pl: "Place",
  terr: "Terrace",
  ter: "Terrace",
  hwy: "Highway",
  pkwy: "Parkway",
  cir: "Circle",
  sq: "Square",
};

const DIRECTIONS = new Set([
  "n", "s", "e", "w", "ne", "nw", "se", "sw",
  "north", "south", "east", "west",
]);

function bare(word: string) {
  return word.replace(/\.$/, "").toLowerCase();
}

export function expandStreetType(address: string) {
  const commaAt = address.indexOf(",");
  const street = commaAt === -1 ? address : address.slice(0, commaAt);
  const rest = commaAt === -1 ? "" : address.slice(commaAt);

  const words = street.trim().split(/\s+/);
  // The number plus at least one word of street name come first.
  let index = words.length - 1;
  if (index >= 2 && DIRECTIONS.has(bare(words[index]))) {
    index -= 1;
  }
  if (index < 2) {
    return address;
  }

  const full = STREET_TYPES[bare(words[index])];
  if (!full) {
    return address;
  }
  words[index] = full;
  return words.join(" ") + rest;
}
