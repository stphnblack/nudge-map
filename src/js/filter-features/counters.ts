import { isEqual } from "lodash-es";

import { FilterState, PlaceFilterManager } from "../state/FilterState";
import { PlaceId, ProcessedCoreEntry } from "../model/types";
import { COUNTRIES_PREFIXED_BY_THE } from "../model/data";
import { encodedPlaceToUrl } from "../model/placeId";
import type { ViewState } from "../layout/viewToggle";

export function determinePlaceDescription(
  numPlaces: number,
  matchedCountries: Set<string>,
): string {
  let country =
    matchedCountries.size === 1
      ? Array.from(matchedCountries)[0]
      : `${matchedCountries.size} countries`;
  if (COUNTRIES_PREFIXED_BY_THE.has(country)) {
    country = `the ${country}`;
  }

  const label = numPlaces === 1 ? "place" : "places";
  return `${numPlaces} ${label} in ${country}`;
}

export const SEARCH_RESET_HTML = `<button class="counter-search-reset" role="button" aria-label="reset search">reset search</button>`;
export const TABLE_DOWNLOAD_HTML = `<button class="counter-table-download" role="button" aria-label="download table as CSV">download as CSV</button>`;

export function determineSearch(
  view: ViewState,
  placeId: string,
  encodedPlace: string,
): string {
  const placeLink = `<a class="external-link" target="_blank" href=${encodedPlaceToUrl(
    encodedPlace,
  )}>${placeId} <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>`;

  if (view === "map") {
    return `Showing ${placeLink} — ${SEARCH_RESET_HTML}`;
  }

  const suffix = `in ${placeLink} — ${SEARCH_RESET_HTML}`;
  // TODO: replace with nudge switch statement
  return `Showing an overview of [status] [nudges] ${suffix}`;
}

export function determineHtml(
  view: ViewState,
  state: FilterState,
  entries: Record<PlaceId, ProcessedCoreEntry>,
  numPlaces: number,
  matchedCountries: Set<string>,
): string {
  if (!numPlaces) {
    return "No places selected — use the filter or search icons";
  }

  if (state.searchInput) {
    const placeId = state.searchInput;
    return determineSearch(view, placeId, entries[placeId].place.encoded);
  }

  const placeDescription = determinePlaceDescription(
    numPlaces,
    matchedCountries,
  );

  if (view === "table") {
    return `Showing ${placeDescription} - ${TABLE_DOWNLOAD_HTML}`;
  }

  return `Showing ${placeDescription}`;
}

function setUpResetButton(
  counterContainer: HTMLElement,
  manager: PlaceFilterManager,
): void {
  counterContainer.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.matches(".counter-search-reset")
    ) {
      manager.update({ searchInput: null });
    }
  });
}

export default function initCounters(manager: PlaceFilterManager): void {
  const mapCounter = document.getElementById("map-counter");
  const tableCounter = document.getElementById("table-counter");
  if (!mapCounter || !tableCounter) return;

  setUpResetButton(mapCounter, manager);
  setUpResetButton(tableCounter, manager);

  manager.subscribe("update counters", (state) => {
    mapCounter.innerHTML = determineHtml(
      "map",
      state,
      manager.entries,
      manager.placeIds.size,
      manager.matchedCountries,
    );
    tableCounter.innerHTML = determineHtml(
      "table",
      state,
      manager.entries,
      manager.placeIds.size,
      manager.matchedCountries,
    );
  });
}
