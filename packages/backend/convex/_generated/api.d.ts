/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as exercises from "../exercises.js";
import type * as importStrong from "../importStrong.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_normalize from "../lib/normalize.js";
import type * as lib_readModels from "../lib/readModels.js";
import type * as lib_units from "../lib/units.js";
import type * as model from "../model.js";
import type * as openai from "../openai.js";
import type * as programs from "../programs.js";
import type * as sessions from "../sessions.js";
import type * as templates from "../templates.js";
import type * as utils from "../utils.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  exercises: typeof exercises;
  importStrong: typeof importStrong;
  "lib/auth": typeof lib_auth;
  "lib/normalize": typeof lib_normalize;
  "lib/readModels": typeof lib_readModels;
  "lib/units": typeof lib_units;
  model: typeof model;
  openai: typeof openai;
  programs: typeof programs;
  sessions: typeof sessions;
  templates: typeof templates;
  utils: typeof utils;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
