import { expect, test } from "@playwright/test";

import {
  FilterState,
  PlaceFilterManager,
} from "../../src/js/state/FilterState";
import { POPULATION_MAX_INDEX } from "../../src/js/filter-features/populationSlider";
import { PlaceId, ProcessedCoreEntry, Date } from "../../src/js/model/types";

test.describe("PlaceFilterManager.matchedPolicyRecords()", () => {
  function defaultState(): FilterState {
    return {
      searchInput: null,
      country: new Set(["United States", "Brazil"]),
    };
  }

  function defaultEntries(): Record<PlaceId, ProcessedCoreEntry> {
    return {
      "Place 1": {
        place: {
          name: "Place 1",
          state: "",
          country: "United States",
          encoded: "",
          coord: [0, 0],
          url: "",
        },
      },
      "Place 2": {
        place: {
          name: "Place 2",
          state: "",
          country: "Brazil",
          encoded: "",
          coord: [0, 0],
          url: "",
        },
      },
    };
  }

  test("search", () => {
    // Start with a state that does not match anything to prove that search overrides filters.
    const manager = new PlaceFilterManager(defaultEntries(), {
      ...defaultState(),
      country: new Set(),
    });
    expect(manager.matchedPlaces).toEqual({});

    manager.update({ searchInput: "Place 1" });
    expect(manager.matchedPlaces).toEqual({
      "Place 1": { type: "search" },
    });

    // Unrecognized search should match nothing (although, the UI should prevent this from happening anyways).
    manager.update({ searchInput: "Unknown" });
    expect(manager.matchedPlaces).toEqual({});
  });
});
