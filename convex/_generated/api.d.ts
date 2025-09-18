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
import type * as emergencyContact_index from "../emergencyContact/index.js";
import type * as http from "../http.js";
import type * as medicalHistory_index from "../medicalHistory/index.js";
import type * as model_user from "../model/user.js";
import type * as model_userProfile from "../model/userProfile.js";
import type * as personalInfo_info from "../personalInfo/info.js";
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
  "emergencyContact/index": typeof emergencyContact_index;
  http: typeof http;
  "medicalHistory/index": typeof medicalHistory_index;
  "model/user": typeof model_user;
  "model/userProfile": typeof model_userProfile;
  "personalInfo/info": typeof personalInfo_info;
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
