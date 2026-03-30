import type { ProcessedCoreEntry } from "../model/types";

export function radiusGivenZoom(options: { zoom: number }): number {
  const { zoom } = options;
  // This formula comes from Claude to go from radius 5 to 21 between zoom 3 to 10
  // with roughly linear growth.
  //
  // 21px radius => 42px diameter + 2px stroke == 4px. That meets the accessibility
  // requirement of 44px touch target size, while balancing the dot not being too big
  // on the screen when zoomed out.
  const base = Math.round(2.37 * zoom - 2.29) + 2;
  return base;
}
