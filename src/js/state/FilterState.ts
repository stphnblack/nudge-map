import { isEqual } from "lodash-es";
import { PlaceId, ProcessedCoreEntry, ProcessedPlace } from "../model/types";
import Observable from "./Observable";

export const POPULATION_INTERVALS: Array<[string, number]> = [
  ["100", 100],
  ["5k", 5000],
  ["25k", 25000],
  ["50k", 50000],
  ["100k", 100000],
  ["500k", 500000],
  ["1M", 1000000],
  ["75M", 750000000],
];

// Note that this only tracks state set by the user.
// Computed values are handled elsewhere.
//
// This is a single unified global view of the state, even though we
// have multiple datasets like 'remove parking minimums'. Some of the
// option groups are not relevant to certain datasets; for example,
// "any parking reform" will ignore `scope`. Likewise, certain values
// within an option group are irrelevant to certain data sets; for example,
// while all datasets have 'country', their entries usually only have a subset
// of the total set of countries across all datsets. Nevertheless,
// we unify the state so that it persists when changing the policy type.
//
// Keep key names in alignment with DataSetSpecificOptions in filter-features/options.ts
export interface FilterState {
  searchInput: string | null;
  country: Set<string>;
}

interface PlaceMatchSearch {
  type: "search";
}

interface PlaceMatchAnyPolicy {
  type: "any";
}

type PlaceMatch = PlaceMatchSearch | PlaceMatchAnyPolicy;

// This allows us to avoid recomputing computed state when the FilterState has not changed.
interface CacheEntry {
  state: FilterState;
  matchedPlaces: Record<PlaceId, PlaceMatch>;
  matchedCountries: Set<string>;
}

export class PlaceFilterManager {
  private readonly state: Observable<FilterState>;

  readonly entries: Record<PlaceId, ProcessedCoreEntry>;

  private cache: CacheEntry | null = null;

  constructor(
    entries: Record<PlaceId, ProcessedCoreEntry>,
    initialState: FilterState,
  ) {
    this.entries = entries;
    this.state = new Observable("FilterState", initialState);
  }

  get totalNumPlaces(): number {
    return Object.keys(this.entries).length;
  }

  get matchedPlaces(): Record<PlaceId, PlaceMatch> {
    return this.ensureCache().matchedPlaces;
  }

  get placeIds(): Set<PlaceId> {
    return new Set(Object.keys(this.matchedPlaces));
  }

  get matchedCountries(): Set<string> {
    return this.ensureCache().matchedCountries;
  }

  getState(): FilterState {
    return this.state.getValue();
  }

  update(changes: Partial<FilterState>): void {
    const priorState = this.state.getValue();
    this.state.setValue({ ...priorState, ...changes });
  }

  subscribe(id: string, observer: (state: FilterState) => void): void {
    this.state.subscribe(observer, id);
  }

  initialize(): void {
    this.state.initialize();
  }

  /// Recompute the CacheEntry if FilterState has changed.
  private ensureCache(): CacheEntry {
    const currentState = this.state.getValue();
    if (this.cache && isEqual(currentState, this.cache.state)) {
      return this.cache;
    }

    const matchedPlaces: Record<PlaceId, PlaceMatch> = {};
    const matchedCountries = new Set<string>();
    for (const placeId of Object.keys(this.entries)) {
      const match = this.getPlaceMatch(placeId);
      if (!match) continue;
      matchedPlaces[placeId] = match;
      matchedCountries.add(this.entries[placeId].place.country);
    }

    this.cache = {
      state: currentState,
      matchedPlaces,
      matchedCountries,
    };
    return this.cache;
  }

  private matchesPlace(place: ProcessedPlace): boolean {
    const filterState = this.state.getValue();

    const isCountry = filterState.country.has(place.country);
    if (!isCountry) return false;
    return true;
  }

  private getPlaceMatch(placeId: PlaceId): PlaceMatch | null {
    const filterState = this.state.getValue();
    const entry = this.entries[placeId];

    // Search overrides filter config.
    if (filterState.searchInput) {
      return filterState.searchInput === placeId
        ? {
            type: "search",
          }
        : null;
    }

    const isPlace = this.matchesPlace(entry.place);
    if (!isPlace) return null;

    return {
      type: "any",
    };
  }
}
