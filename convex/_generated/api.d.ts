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
import type * as emergencyContactOnboarding_update from "../emergencyContactOnboarding/update.js";
import type * as http from "../http.js";
import type * as medicalHistoryOnboarding_update from "../medicalHistoryOnboarding/update.js";
import type * as model_personalInfomation from "../model/personalInfomation.js";
import type * as model_user from "../model/user.js";
import type * as model_userProfile from "../model/userProfile.js";
import type * as personalInfoOnboarding_update from "../personalInfoOnboarding/update.js";
import type * as users from "../users.js";
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
  "emergencyContactOnboarding/update": typeof emergencyContactOnboarding_update;
  http: typeof http;
  "medicalHistoryOnboarding/update": typeof medicalHistoryOnboarding_update;
  "model/personalInfomation": typeof model_personalInfomation;
  "model/user": typeof model_user;
  "model/userProfile": typeof model_userProfile;
  "personalInfoOnboarding/update": typeof personalInfoOnboarding_update;
  users: typeof users;
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
