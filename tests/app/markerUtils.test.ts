import { expect, test } from "@playwright/test";

import { radiusGivenZoom } from "../../src/js/map-features/markerUtils";

test.describe("radiusGivenZoom", () => {
  test("calculates radius correctly for zoom levels", () => {
    expect(radiusGivenZoom({ zoom: 3 })).toBe(7);
    expect(radiusGivenZoom({ zoom: 7 })).toBe(16);
    expect(radiusGivenZoom({ zoom: 10 })).toBe(23);
  });
});
