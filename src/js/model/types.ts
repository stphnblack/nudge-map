import { DateTime } from "luxon";

export class Date {
  readonly raw: string;

  readonly parsed: DateTime<true>;

  constructor(raw: string) {
    this.raw = raw;
    const parsed = DateTime.fromISO(raw);
    if (!parsed.isValid) {
      throw new Error(`Invalid date string: ${raw}`);
    }
    this.parsed = parsed;
  }

  static fromNullable(dateStr: string | undefined): Date | undefined {
    return dateStr ? new this(dateStr) : undefined;
  }

  format(): string {
    if (this.raw.length === 4) return this.raw;
    if (this.raw.length === 7) return this.parsed.toFormat("LLL yyyy");
    return this.parsed.toFormat("LLL d, yyyy");
  }

  preposition(): "in" | "on" {
    return this.raw.length === 10 ? "on" : "in";
  }
}

export type PlaceId = string;

export interface RawPlace {
  // Full name of the place.
  name: string;
  // State or province abbreviation. Not set for countries.
  state: string | null;
  country: string;
  // The value used for the URL. Note that this may be an outdated value
  // so that we don't require a redirect.
  encoded: string;
  // [long, lat]
  coord: [number, number];
}
export type ProcessedPlace = RawPlace & { url: string };

export interface RawCoreEntry {
  place: RawPlace;
}

export interface ProcessedCoreEntry {
  place: ProcessedPlace;
}
export const UNKNOWN_YEAR = "unknown";

/// The types from `data/option-values.json`.
export interface OptionValues {
  country: string[];
}
