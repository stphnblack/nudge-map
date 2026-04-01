// eslint-disable-next-line @typescript-eslint/ban-ts-comment


/** Config for Eleventy to generate the details pages. */

// @ts-ignore
import CleanCSS from "clean-css";
import { compileString as compileStringSass } from "sass";

import {
  readProcessedCompleteData,
} from "./scripts/lib/data.js";
import { determinesupplementalPlaceInfo } from "./src/js/model/placeId.js";

export default async function (eleventyConfig: any) {
  eleventyConfig.setLiquidOptions({
    jsTruthy: true,
  });

  eleventyConfig.addFilter(
    "scss_compile",
    (code: any) => compileStringSass(code).css,
  );
  eleventyConfig.addFilter(
    "cssmin",
    (code: any) => new CleanCSS({}).minify(code).styles,
  );

  const completeData = await readProcessedCompleteData();
  const entries = Object.entries(completeData).map(([placeId, entry]) => ({
    placeId,
    escapedPlaceId: entry.place.encoded,
    place: {
      name: entry.place.name,
      supplemental: determinesupplementalPlaceInfo(entry.place),
    },
  }));

  eleventyConfig.addGlobalData("entries", entries);

  return {
    dir: {
      input: "scripts/11ty",
      output: "city_detail",
    },
  };
}
