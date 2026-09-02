import { expect, test } from "@playwright/test";

import {
  radiusGivenZoom,
  determineIsPrimary,
} from "../../src/js/map-features/markerUtils";
import { ProcessedPlace } from "../../src/js/model/types";

test("determineIsPrimary", () => {
  const place: ProcessedPlace = {
    name: "",
    street: "",
    city: "",
    postal_code: "",
    state: "",
    country: "",
    type: "Cafe",
    encoded: "",
    consumer_base: 0,
    coord: [0, 0],
    url: "",
  };

  expect(determineIsPrimary({ place })).toEqual(false);

  // Plant-based default nudges are primary.
  expect(
    determineIsPrimary({
      place,
      default: [{ status: "adopted", date: undefined, org_credit: [] }],
    }),
  ).toEqual(true);
  expect(
    determineIsPrimary({
      place,
      default: [{ status: "pledged", date: undefined, org_credit: [] }],
    }),
  ).toEqual(true);
});

test.describe("radiusGivenZoom", () => {
  test("calculates radius correctly for zoom levels", () => {
    expect(radiusGivenZoom(3)).toBe(7);
    expect(radiusGivenZoom(7)).toBe(16);
    expect(radiusGivenZoom(10)).toBe(23);
  });
});
