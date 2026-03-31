import { expect, test } from "@playwright/test";

import {
  encodeFilterState,
  decodeFilterState,
  DEFAULT_FILTER_STATE,
  MERGED_STRING_SET_OPTIONS,
  COUNTRY_MAP,
  COUNTRY_NAME,
} from "../../src/js/state/urlEncoder";
import { FilterState } from "../../src/js/state/FilterState";

test.describe("encodeFilterState", () => {
  test("default state", () => {
    expect(encodeFilterState(DEFAULT_FILTER_STATE).size).toEqual(0);
  });

  test("set every value", () => {
    const state: FilterState = {
      ...DEFAULT_FILTER_STATE,
      country: new Set(["Mexico", "Brazil"]),
    };
    const result = encodeFilterState(state);
    expect(result.get("cntry")).toEqual("mx.br");

    // Check round-trip
    expect(decodeFilterState(result.toString())).toEqual(state);
  });
});

test.describe("decodeFilterState", () => {
  const assertDecode = (
    query: string,
    expected: FilterState,
    kwargs: { checkRoundTrip: boolean },
  ) => {
    const { checkRoundTrip } = kwargs;

    const decoded = decodeFilterState(query);
    expect(decoded).toEqual(expected);

    // Ensure round trip works.
    if (checkRoundTrip) {
      const reEncoded = encodeFilterState(decoded).toString();
      const originalAsParams = new URLSearchParams(query);
      originalAsParams.sort();
      expect(reEncoded).toEqual(originalAsParams.toString());
    }
  };

  test("default state", () => {
    assertDecode("", DEFAULT_FILTER_STATE, { checkRoundTrip: true });
  });

  test("set every value", () => {
    const url = ["cntry=mx.br"].join("&");
    assertDecode(
      url,
      {
        ...DEFAULT_FILTER_STATE,
        country: new Set(["Mexico", "Brazil"]),
      },
      { checkRoundTrip: true },
    );
  });

  test("illegal values", () => {
    const url = [COUNTRY_NAME].map((x) => `${x}=foo`).join("&");
    assertDecode(url, DEFAULT_FILTER_STATE, {
      checkRoundTrip: false,
    });
  });

  test("some illegal array elements", () => {
    const url = ["cntry=foo.mx"].join("&");
    assertDecode(
      url,
      {
        ...DEFAULT_FILTER_STATE,
        country: new Set(["Mexico"]),
      },
      {
        checkRoundTrip: false,
      },
    );
  });
});

test.describe("mappers are fully comprehensive", () => {
  test("country", () => {
    expect(COUNTRY_MAP.keys()).toEqual(MERGED_STRING_SET_OPTIONS.country);
  });
});
