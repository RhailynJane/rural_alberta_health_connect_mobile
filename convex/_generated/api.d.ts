/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as dashboard_user from "../dashboard/user.js";
import type * as emergencyContact_update from "../emergencyContact/update.js";
import type * as http from "../http.js";
import type * as medicalHistory_update from "../medicalHistory/update.js";
import type * as model_user from "../model/user.js";
import type * as model_userProfile from "../model/userProfile.js";
import type * as personalInfo_update from "../personalInfo/update.js";
import type * as profile_index from "../profile/index.js";
import type * as utils_sanitize from "../utils/sanitize.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "dashboard/user": typeof dashboard_user;
  "emergencyContact/update": typeof emergencyContact_update;
  http: typeof http;
  "medicalHistory/update": typeof medicalHistory_update;
  "model/user": typeof model_user;
  "model/userProfile": typeof model_userProfile;
  "personalInfo/update": typeof personalInfo_update;
  "profile/index": typeof profile_index;
  "utils/sanitize": typeof utils_sanitize;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
