import { isEqual } from "lodash-es";

import type { FilterState } from "./FilterState";
import { FILTER_OPTIONS } from "../filter-features/options";
import { COUNTRY_MAPPING } from "../model/data";

export const MERGED_STRING_SET_OPTIONS = {
  country: new Set(FILTER_OPTIONS.merged.country),
};

export const DEFAULT_FILTER_STATE: FilterState = {
  searchInput: null,
  ...MERGED_STRING_SET_OPTIONS,
};

const ARRAY_DELIMITER = ".";
const BOOL_TRUE = "y";
const BOOL_FALSE = "n";

class BidirectionalMap<K extends string, V extends string> {
  private constructor(
    private encodeMap: Record<K, V>,
    private decodeMap: Record<V, K>,
  ) {
    this.encodeMap = encodeMap;
    this.decodeMap = decodeMap;
  }

  static from<const T extends ReadonlyArray<readonly [string, string]>>(
    entries: T,
  ) {
    type Entry = T[number];
    const encodeMap = Object.fromEntries(entries) as Record<Entry[0], Entry[1]>;
    const decodeMap = Object.fromEntries(
      entries.map(([a, b]) => [b, a]),
    ) as Record<Entry[1], Entry[0]>;

    return new BidirectionalMap(encodeMap, decodeMap);
  }

  keys(): Set<string> {
    return new Set(Object.keys(this.encodeMap));
  }

  encode(key: K): V {
    return this.encodeMap[key];
  }

  encodeSet(keys: Set<string>): string {
    return Array.from(keys)
      .map((key) => this.encode(key as K))
      .join(ARRAY_DELIMITER);
  }

  decode(value: string | null): K | null {
    if (value === null) return null;
    return this.decodeMap[value as V] ?? null;
  }

  decodeSet(value: string | null, fallback: Set<string>): Set<string> {
    if (value === null) return fallback;
    const parsed = new Set(
      value
        .split(ARRAY_DELIMITER)
        .map((v) => this.decode(v))
        .filter((v) => v !== null),
    );
    return parsed.size ? parsed : fallback;
  }
}
export const COUNTRY_NAME = "cntry";
export const COUNTRY_MAP = BidirectionalMap.from(
  Object.entries(COUNTRY_MAPPING).map(([code, country]) => [
    country!,
    code.toLowerCase(),
  ]),
);

export function encodeFilterState(filterState: FilterState): URLSearchParams {
  const result = new URLSearchParams();

  if (!isEqual(filterState.country, DEFAULT_FILTER_STATE.country)) {
    result.append(COUNTRY_NAME, COUNTRY_MAP.encodeSet(filterState.country));
  }

  result.sort();
  return result;
}

export function queryStringToParams(queryString: string): URLSearchParams {
  const cleanQuery = queryString.startsWith("?")
    ? queryString.slice(1)
    : queryString;
  return new URLSearchParams(cleanQuery);
}

export function decodeFilterState(queryString: string): FilterState {
  const params = queryStringToParams(queryString);
  return {
    searchInput: DEFAULT_FILTER_STATE.searchInput,
    country: COUNTRY_MAP.decodeSet(
      params.get(COUNTRY_NAME),
      DEFAULT_FILTER_STATE.country,
    ),
  };
}
