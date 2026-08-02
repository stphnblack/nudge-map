/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import nodeFetch, { RequestInfo, RequestInit, Response } from "node-fetch";
import NodeGeocoder from "node-geocoder";

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function fetch(
  url: RequestInfo,
  options: RequestInit = {},
): Promise<Response> {
  return nodeFetch(url, {
    ...options,
    headers: { "User-Agent": "better-food-foundation-update-map-data" },
  });
}

export function initGeocoder(): NodeGeocoder.Geocoder {
  return NodeGeocoder({ provider: "openstreetmap", fetch });
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

  // Ordered from most to least precise.
  const locationMethods: Array<() => string> = [];

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
    await sleep(1100);
    if (geocodeResults.length > 0) {
      const lat = geocodeResults[0].latitude;
      const long = geocodeResults[0].longitude;
      if (!lat || !long) continue;
      return [long, lat];
    }
  }
  return null;
}
