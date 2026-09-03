import type { ProcessedCoreEntry } from "../model/types";

export function determineIsPrimary(entry: ProcessedCoreEntry): boolean {
  const numAdoptedDefaults = entry.default?.length ?? 0;
  return numAdoptedDefaults > 0;
}

export function radiusGivenZoom(zoom: number, entry: ProcessedCoreEntry): number {
  // This formula comes from Claude to go from radius 5 to 21 between zoom 3 to 10
  // with roughly linear growth.
  //
  // 21px radius => 42px diameter + 2px stroke == 4px. That meets the accessibility
  // requirement of 44px touch target size, while balancing the dot not being too big
  // on the screen when zoomed out.
  const baseRadius = Math.round(2.37 * zoom - 2.29) + 2;

  const minConsumerBase = 100;
  const maxConsumerBase = 10_000_000;

  const logMin = Math.log10(minConsumerBase);
  const logMax = Math.log10(maxConsumerBase);

  const clampedValue = Math.max(
    minConsumerBase,
    Math.min(entry.place.consumer_base, maxConsumerBase)
  );

  const normalized =
    (Math.log10(clampedValue) - logMin) /
    (logMax - logMin);

  // Multiply normalized value by a factor to adjust the impact of consumer base on marker size
  // Multiplying by a value less than one will decrease the amount consumer base impacts size
  const consumerBaseMultiplier = 1 + normalized * 1.0;

  return Math.round(baseRadius * consumerBaseMultiplier);
}
