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
import type * as BrevoOTPPasswordReset from "../BrevoOTPPasswordReset.js";
import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as aiAssessment from "../aiAssessment.js";
import type * as auth from "../auth.js";
import type * as dashboard_user from "../dashboard/user.js";
import type * as emergencyContactOnboarding_update from "../emergencyContactOnboarding/update.js";
import type * as healthEntries from "../healthEntries.js";
import type * as http from "../http.js";
import type * as locationServices from "../locationServices.js";
import type * as medicalHistoryOnboarding_update from "../medicalHistoryOnboarding/update.js";
import type * as model_user from "../model/user.js";
import type * as model_userProfile from "../model/userProfile.js";
import type * as notificationExamples from "../notificationExamples.js";
import type * as notifications from "../notifications.js";
import type * as passwordReset from "../passwordReset.js";
import type * as personalInfoOnboarding_update from "../personalInfoOnboarding/update.js";
import type * as profile_ensureProfileExists from "../profile/ensureProfileExists.js";
import type * as profile_personalInformation from "../profile/personalInformation.js";
import type * as profile_reminders from "../profile/reminders.js";
import type * as sync from "../sync.js";
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
  BrevoOTPPasswordReset: typeof BrevoOTPPasswordReset;
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  aiAssessment: typeof aiAssessment;
  auth: typeof auth;
  "dashboard/user": typeof dashboard_user;
  "emergencyContactOnboarding/update": typeof emergencyContactOnboarding_update;
  healthEntries: typeof healthEntries;
  http: typeof http;
  locationServices: typeof locationServices;
  "medicalHistoryOnboarding/update": typeof medicalHistoryOnboarding_update;
  "model/user": typeof model_user;
  "model/userProfile": typeof model_userProfile;
  notificationExamples: typeof notificationExamples;
  notifications: typeof notifications;
  passwordReset: typeof passwordReset;
  "personalInfoOnboarding/update": typeof personalInfoOnboarding_update;
  "profile/ensureProfileExists": typeof profile_ensureProfileExists;
  "profile/personalInformation": typeof profile_personalInformation;
  "profile/reminders": typeof profile_reminders;
  sync: typeof sync;
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
