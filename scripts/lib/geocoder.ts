/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import nodeFetch, { RequestInfo, RequestInit, Response } from "node-fetch";
import NodeGeocoder from "node-geocoder";

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Wraps an async function so consecutive calls are spaced at least
 * `minDelayMs` apart, measured from the end of one call to the start
 * of the next — equivalent to geopy's RateLimiter(min_delay_seconds=...).
 */
function rateLimit<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  minDelayMs: number,
): (...args: Args) => Promise<R> {
  let lastCallEnded = 0;

  return async (...args: Args): Promise<R> => {
    const elapsed = Date.now() - lastCallEnded;
    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed);
    }
    try {
      return await fn(...args);
    } finally {
      lastCallEnded = Date.now();
    }
  };
}

export async function customFetch(
  url: RequestInfo,
  options: RequestInit = {},
): Promise<Response> {
  return nodeFetch(url, {
    ...options,
    headers: { "User-Agent": "better-food-foundation-update-map-data" },
  });
}

export function initGeocoder(): NodeGeocoder.Geocoder {
  const geocoder = NodeGeocoder({
    provider: "openstreetmap",
    fetch: customFetch,
  });

  const throttledGeocode = rateLimit(geocoder.geocode.bind(geocoder), 1100);
  geocoder.geocode = throttledGeocode as NodeGeocoder.Geocoder["geocode"];

  return geocoder;
}

export async function getLongLat(
  placeName: string,
  street: string | null,
  city: string,
  state: string | null,
  postalCode: string | null,
  countryCode: string,
  geocoder: NodeGeocoder.Geocoder,
): Promise<[number, number] | null> {
  const stateQuery = state ? `${state}, ` : "";
  const streetQuery = street ? `${street}, ` : "";
  const postalQuery = postalCode ? `${postalCode}, ` : "";

  const locationMethods: Array<() => string> = [];

  // Ordered from most to least precise.

  if (placeName && street) {
    locationMethods.push(
      () =>
        `${placeName}, ${streetQuery}${city}, ${stateQuery}${postalQuery}${countryCode}`,
    );
  }

  if (street) {
    locationMethods.push(
      () => `${streetQuery}${city}, ${stateQuery}${postalQuery}${countryCode}`,
    );
  }

  if (placeName) {
    locationMethods.push(
      () => `${placeName}, ${city}, ${stateQuery}${countryCode}`,
    );
  }

  locationMethods.push(() => `${city}, ${stateQuery}${countryCode}`);

  if (placeName) {
    locationMethods.push(() => placeName);
  }

  locationMethods.push(() => city);

  for (const getLocationString of locationMethods) {
    const locationString = getLocationString();
    const geocodeResults = await geocoder.geocode(locationString);
    if (geocodeResults.length > 0) {
      const lat = geocodeResults[0].latitude;
      const long = geocodeResults[0].longitude;
      if (!lat || !long) continue;
      return [long, lat];
    }
  }
  return null;
}
