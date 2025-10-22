import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

const PasswordProvider = Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      firstName: params.firstName as string,
      lastName: params.lastName as string,
      hasCompletedOnboarding: params.hasCompletedOnboarding as boolean,
    };
  },
  reset: ResendOTPPasswordReset,
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PasswordProvider],
});


