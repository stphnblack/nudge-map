import { encodedPlaceToUrl } from "./placeId";
import {
  PlaceId,
  ProcessedCoreEntry,
  RawCoreEntry,
  RawPlace,
  ProcessedPlace,
} from "./types";

export const COUNTRIES_PREFIXED_BY_THE = new Set([
  "United States",
  "United Kingdom",
  "Netherlands",
]);

export const COUNTRY_MAPPING: Partial<Record<string, string>> = {
  AU: "Australia",
  AT: "Austria",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CK: "Cook Islands",
  CN: "China",
  DE: "Germany",
  DK: "Denmark",
  FI: "Finland",
  FR: "France",
  IE: "Ireland",
  IN: "India",
  IL: "Israel",
  IS: "Iceland",
  KR: "Korea",
  MX: "Mexico",
  NL: "Netherlands",
  NZ: "New Zealand",
  SE: "Sweden",
  SG: "Singapore",
  UK: "United Kingdom",
  US: "United States",
  ZA: "South Africa",
};

export function processPlace(raw: RawPlace): ProcessedPlace {
  return {
    ...raw,
    url: encodedPlaceToUrl(raw.encoded),
  };
}

export function processRawCoreEntry(raw: RawCoreEntry): ProcessedCoreEntry {
  const result: ProcessedCoreEntry = {
    place: processPlace(raw.place),
  };
  return result;
}

export default async function readData(): Promise<
  Record<PlaceId, ProcessedCoreEntry>
> {
  const rawData = (await import("../../../data/core.json", {
    with: { type: "json" },
  })) as unknown as Record<PlaceId, RawCoreEntry>;
  return Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => [
      placeId,
      processRawCoreEntry(entry),
    ]),
  );
}

export function getFilteredIndexes<T>(
  array: T[],
  predicate: (value: T) => boolean,
): number[] {
  return array.reduce((indexes: number[], currentValue, currentIndex) => {
    if (predicate(currentValue)) {
      indexes.push(currentIndex);
    }
    return indexes;
  }, []);
}
