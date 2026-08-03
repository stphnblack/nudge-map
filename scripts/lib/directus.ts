/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */

import {
  createDirectus,
  rest,
  authentication,
  DirectusClient as DirectusClientUntyped,
  RestClient,
  RegularCollections,
  CollectionType,
  ReadItemOutput,
  readItems,
  readFiles,
  ReadFileOutput,
  DirectusFile,
  IfAny,
  QueryFilter,
} from "@directus/sdk";

import { NudgeType, PlaceType, NudgeStatus } from "../../src/js/model/types.js";

export const CITATIONS_FILES_FOLDER = "1de1a366-4c32-40f7-9dbe-8d4293c359c2";

// ------------------------------------------------------------------------------
// Generic types
// ------------------------------------------------------------------------------

interface Metadata {
  id: number;
  user_created: string;
  date_created: "datetime";
  user_updated: string;
  date_updated: "datetime";
}

type NudgeRecord = {
  institution: number;
  type: NudgeType;
  status: NudgeStatus;
  date: string | null;
  archived: boolean;
  last_verified_at: string | null;
  summary: string;
  reporter: string | null;
  org_credit: string | null;
  org_credit_expanded: string | null;
  notes: string | null;
  citations: number[];
} & Metadata;

interface Coordinates {
  type: "Point";
  coordinates: [number, number];
}

// ------------------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------------------

export interface Schema {
  institutions: Institution[];
  citations: Citation[];
  nudges: Nudge[];
  citations_files: CitationsFileJunction[];
  nudges_citations: NudgeCitationJunction[];
}

export type Institution = {
  type: PlaceType;
  name: string;
  street: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country_code: string;
  coordinates: Coordinates | null;
  consumer_base: number;
} & Metadata;

export type Citation = {
  source_description: string;
  notes: string | null;
  url: string | null;
  broken_url: boolean;
  attachments: number[];
} & Metadata;

export type Nudge = NudgeRecord;
export interface CitationsFileJunction {
  id: number;
  citations_id: number;
  directus_files_id: string;
}

export interface NudgeCitationJunction {
  id: number;
  nudge_id: number;
  citations_id: number;
}

// ------------------------------------------------------------------------------
// Client
// ------------------------------------------------------------------------------

export type DirectusClient = DirectusClientUntyped<Schema> & RestClient<Schema>;

export async function initDirectus(): Promise<DirectusClient> {
  const email = process.env.DIRECTUS_EMAIL;
  if (!email) throw new Error("Must set the env var DIRECTUS_EMAIL");
  delete process.env.DIRECTUS_EMAIL;

  const password = process.env.DIRECTUS_PASSWORD;
  if (!password) throw new Error("Must set the env var DIRECTUS_PASSWORD");
  delete process.env.DIRECTUS_PASSWORD;

  const client = createDirectus("https://plant-based-nudge-map.directus.app")
    .with(rest())
    .with(authentication());
  await client.login(email, password);
  return client;
}

export async function readItemsBatched<
  Collection extends RegularCollections<Schema>,
  Fields extends (keyof CollectionType<Schema, Collection> & string)[],
>(
  client: DirectusClient,
  collection: Collection,
  fields: Fields,
  batchSize: number = 100,
  filter:
    | IfAny<
        Schema,
        Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
        QueryFilter<Schema, CollectionType<Schema, Collection>>
      >
    | undefined = undefined,
): Promise<ReadItemOutput<Schema, Collection, { fields: Fields }>[]> {
  const allItems = [];
  let offset = 0;
  while (true) {
    console.log(
      `Getting '${collection}' records ${offset}-${offset + batchSize}`,
    );
    const batch = await client.request(
      readItems(collection, {
        fields,
        limit: batchSize,
        offset,
        ...(filter && { filter }),
      }),
    );

    allItems.push(...batch);
    if (batch.length < batchSize) {
      break;
    } else {
      offset += batchSize;
    }
  }
  return allItems;
}

export async function readCitationsFilesBatched<
  Fields extends (keyof DirectusFile<Schema> & string)[],
>(
  client: DirectusClient,
  fields: Fields,
  batchSize: number = 100,
): Promise<ReadFileOutput<Schema, { fields: Fields }>[]> {
  const allItems = [];
  let offset = 0;
  while (true) {
    console.log(
      `Getting 'directus_files' records ${offset}-${offset + batchSize}`,
    );
    const batch = await client.request(
      readFiles({
        fields,
        filter: { folder: { _eq: CITATIONS_FILES_FOLDER } },
        limit: batchSize,
        offset,
      }),
    );

    allItems.push(...batch);
    if (batch.length < batchSize) {
      break;
    } else {
      offset += batchSize;
    }
  }
  return allItems;
}
