import { isEqual } from "lodash-es";
import {
  ALL_NUDGE_TYPE,
  PlaceId,
  PlaceType,
  ProcessedCoreEntry,
  ProcessedPlace,
  NudgeStatus,
  NudgeType,
} from "../model/types";
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

export const ALL_NUDGE_TYPE_FILTER = ["any nudge", ...ALL_NUDGE_TYPE] as const;
export type NudgeTypeFilter = (typeof ALL_NUDGE_TYPE_FILTER)[number];

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
  nudgeTypeFilter: NudgeTypeFilter;
  status: NudgeStatus;
  placeType: Set<string>;
  includedNudges: Set<string>;
  country: Set<string>;
  year: Set<string>;
  orgCredit: Set<string>;
  // TODO: add impactSliderIndexes
}

interface PlaceMatchSearch {
  type: "search";
}

interface PlaceMatchSingleNudge {
  type: "single nudge";
  nudgeType: NudgeType;
  matchingIndexes: number[];
}

interface PlaceMatchAnyNudge {
  type: "any";
  // Note that we still record if a place has a certain policy type
  // even if the filter state is actively ignoring that policy.
  hasDefault: boolean;
  hasRatio: boolean;
  hasSub: boolean;
  hasTitles: boolean;
  hasPlacement: boolean;
  hasOther: boolean;
}

type PlaceMatch = PlaceMatchSearch | PlaceMatchSingleNudge | PlaceMatchAnyNudge;

// This allows us to avoid recomputing computed state when the FilterState has not changed.
interface CacheEntry {
  state: FilterState;
  matchedPlaces: Record<PlaceId, PlaceMatch>;
  matchedCountries: Set<string>;
  matchedNudgeTypesForAnyNudge: Set<NudgeType>;
  matchedPlaceTypes: Set<PlaceType>;
  matchedOrgCredits: Set<string>;
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
    const matchedNudgeTypes = new Set<NudgeType>();
    const matchedPlaceTypes = new Set<PlaceType>();
    const matchedOrgCredits = new Set<string>();
    for (const placeId of Object.keys(this.entries)) {
      const match = this.getPlaceMatch(placeId);
      if (!match) continue;
      matchedPlaces[placeId] = match;
      matchedCountries.add(this.entries[placeId].place.country);
      matchedPlaceTypes.add(this.entries[placeId].place.type);
      matchedOrgCredits.add(this.entries[placeId].place.orgCredit);
      // TODO: add nudge type matching
    }

    this.cache = {
      state: currentState,
      matchedPlaces,
      matchedCountries,
      matchedNudgeTypesForAnyNudge: matchedNudgeTypes,
      matchedPlaceTypes,
      matchedOrgCredits,
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

    // hard code for now, until proper filtering is set up
    return {
      type: "any",
      hasDefault: true,
      hasRatio: true,
      hasSub: true,
      hasTitles: true,
      hasPlacement: true,
      hasOther: true,
    };
  }
}
