# AuthGuard Removal and Onboarding State Analysis

**Created**: 2025-10-01 10:04:11
**Branch**: fix/auto-navigation
**Related Commits**:
- `205b26d` - remove authguard on layout
- `b8d1983` - Fix auth session timing issues with AuthWrapper and schema updates
- `c311cb3` - fix. everything

---

## Executive Summary

This document analyzes the recent architectural changes to authentication flow, specifically the removal of the centralized AuthGuard component and the redundancy in onboarding completion state tracking.

### Key Changes
1. **Removed centralized AuthGuard** from `app/_layout.tsx`
2. **Implemented per-screen authentication** with session refresh mechanism
3. **Identified duplicate onboarding state** in two tables

---

## 1. What We Changed

### 1.1 Removed the AuthGuard Component (commit 205b26d)

**Before:**
```typescript
// app/_layout.tsx (old)
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Redirect to signin if not in auth pages
      if (!inAuthGroup && !inOnboarding) {
        router.replace("/auth/signin");
      }
    } else {
      // Redirect from signin/signup to dashboard if authenticated
      if (inAuthGroup && (currentRoute === "signin" || currentRoute === "signup")) {
        router.replace("/(tabs)/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // ... loading UI and children
}
```

**After:**
```typescript
// app/_layout.tsx (current)
export default function RootLayout() {
  const [providerKey, setProviderKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSession = () => {
    setIsRefreshing(true);
    setProviderKey(k => k + 1); // Remount provider
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <SessionRefreshContext.Provider value={{ refreshSession, isRefreshing }}>
      <ConvexAuthProvider key={providerKey} client={convex} storage={secureStorage}>
        <SafeAreaProvider>
          {/* No AuthGuard wrapper */}
          <Stack screenOptions={{ headerShown: false }}>
            {/* Direct screen declarations */}
          </Stack>
        </SafeAreaProvider>
      </ConvexAuthProvider>
    </SessionRefreshContext.Provider>
  );
}
```

### 1.2 Simplified to Direct Navigation

**Current Flow:**
```
index.tsx (splash 5s)
  ↓
Check isAuthenticated + user data
  ↓
├─ Authenticated → /(tabs)/dashboard
└─ Not Authenticated → /onboarding → /auth/signin
```

---

## 2. Why AuthGuard Was Removed

### 2.1 The Core Problem: Race Conditions

The AuthGuard created timing conflicts in the authentication flow:

**Problem Flow:**
```
User completes onboarding
  ↓
hasCompletedOnboarding: true updated in DB
  ↓
AuthGuard checks auth state
  ↓
useConvexAuth() hook still has STALE session data
  ↓
Incorrect routing decisions
  ↓
User stuck in redirect loop
```

### 2.2 Specific Conflicts

#### **Timing Issue**
When onboarding completed, the database was updated but the AuthGuard's cached session data wasn't refreshed immediately. This caused:
- Incorrect authentication state checks
- Stale user data being used for routing decisions
- Delays in reflecting `hasCompletedOnboarding` changes

#### **Fighting Navigation**
Multiple navigation controllers competed:
```
AuthGuard: "User authenticated → redirect to dashboard"
     vs
Onboarding Flow: "User signed up → go through onboarding steps"
```

#### **Double Redirects**
```
User signs up
  ↓
AuthGuard: "Authenticated! → /dashboard"
  ↓
BUT we want: /signup → /personal-info → /emergency → /medical → dashboard
```

### 2.3 The Solution

**Removed global guard, implemented:**
1. **Session Refresh Mechanism** - Remount ConvexAuthProvider to force session reload
2. **Per-Screen Checks** - Each protected screen handles its own auth
3. **Single Initial Router** - `index.tsx` handles first navigation only

---

## 3. Understanding hasCompletedOnboarding State

### 3.1 The Dual State Problem

We currently track onboarding completion in **TWO places**:

#### **Location 1: `users.hasCompletedOnboarding`**
```typescript
// convex/schema.ts:17
users: defineTable({
  email: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  hasCompletedOnboarding: v.optional(v.boolean()), // ← Active
  // ...
}).index("email", ["email"]),
```

**Usage:**
- Set to `false` during signup (`app/auth/signup.tsx:72`)
- Set to `true` in `completeOnboarding()` (`convex/model/userProfile.ts:151`)
- Returned in `getCurrentUser` query (`convex/users.ts:23`)
- Used for **quick authentication-level checks**

#### **Location 2: `userProfiles.onboardingCompleted`** (LEGACY)
```typescript
// convex/schema.ts:30
userProfiles: defineTable({
  userId: v.id("users"),
  // ... profile fields ...
  onboardingCompleted: v.boolean(), // ← Legacy, redundant
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("byUserId", ["userId"]),
```

**Usage:**
- Required in all `userProfiles` insert operations
- Set to `true` in `completeOnboarding()` (`convex/model/userProfile.ts:145`)
- **Marked as legacy** in schema comment
- **Not actually used** for routing decisions

### 3.2 Why Two Tables? Historical Context

**Evolution Timeline:**

**Phase 1: Early Architecture**
```
users table (auth only)
  ↓
userProfiles table (extended data + onboardingCompleted)
```

**Phase 2: Schema Enhancement (commit b8d1983)**
- Discovered ability to extend default `users` table
- Added custom fields directly to users table
- Added `hasCompletedOnboarding` to users table

**Phase 3: Current State**
```
users.hasCompletedOnboarding       ← Active, used for routing
userProfiles.onboardingCompleted   ← Legacy, kept for compatibility
```

### 3.3 Why Not Delete Legacy Field?

**Technical Constraint:**
```typescript
// convex/schema.ts:30
onboardingCompleted: v.boolean(), // NOT v.optional(v.boolean())
```

The field is **non-optional**, so:
- All `userProfiles` inserts require it (lines 38, 78, 119 in `userProfile.ts`)
- Existing database records have this field
- Removing requires database migration
- **Simpler to mark as legacy** and ignore

---

## 4. Current Authentication Flow

### 4.1 Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│ 1. App Launch → index.tsx (5s splash)                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        │                                   │
    isAuthenticated?                       NO
        │                                   ↓
       YES                          /onboarding → /auth/signin
        ↓                                   ↓
    /(tabs)/dashboard              /auth/signup
                                           ↓
                            hasCompletedOnboarding: false set
                                           ↓
                            /auth/personal-info
                                  ↓
                            userProfile created
                            onboardingCompleted: false (legacy)
                                  ↓
                            /auth/emergency-contact
                                  ↓
                            userProfile updated
                                  ↓
                            /auth/medical-history
                                  ↓
                            completeOnboarding() called
                                  ↓
                ┌─────────────────┴─────────────────┐
                │                                   │
        users.hasCompletedOnboarding: true         │
        (active - used for routing)                │
                │                                   │
        userProfiles.onboardingCompleted: true     │
        (legacy - ignored)                         │
                └─────────────────┬─────────────────┘
                                  ↓
                      refreshSession() called
                                  ↓
                      Provider remount (key change)
                                  ↓
                      index.tsx checks user
                                  ↓
                      Routes to /(tabs)/dashboard
```

### 4.2 Key Functions

#### **completeOnboarding() - `convex/model/userProfile.ts:129-155`**
```typescript
export async function completeOnboarding(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const existingProfile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (!existingProfile) {
    throw new Error("User profile not found. Cannot complete onboarding.");
  }

  // Updates BOTH locations (one is legacy)
  await ctx.db.patch(existingProfile._id, {
    onboardingCompleted: true,        // ← Legacy
    updatedAt: Date.now(),
  });

  await ctx.db.patch(userId, {
    hasCompletedOnboarding: true,     // ← Active
  });

  return existingProfile._id;
}
```

#### **getCurrentUser() - `convex/users.ts:4-26`**
```typescript
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasCompletedOnboarding: user.hasCompletedOnboarding, // ← Uses users table
    };
  },
});
```

---

## 5. Optimization Recommendations

### 5.1 Remove Duplicate State

**Priority: Medium**
**Effort: Low-Medium** (requires migration)

#### Change 1: Make Legacy Field Optional
```typescript
// convex/schema.ts:30
userProfiles: defineTable({
  userId: v.id("users"),
  // ... other fields ...
  onboardingCompleted: v.optional(v.boolean()), // ← Made optional
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("byUserId", ["userId"]),
```

#### Change 2: Remove from Inserts
```typescript
// convex/model/userProfile.ts - All insert operations
return await ctx.db.insert("userProfiles", {
  userId,
  ageRange: safeString(data.ageRange),
  location: safeString(data.location),
  // onboardingCompleted: false, ← REMOVE THIS LINE
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

#### Change 3: Simplify completeOnboarding()
```typescript
// convex/model/userProfile.ts:129-155
export async function completeOnboarding(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) {
    throw new Error("User profile not found");
  }

  // ONLY update users table (single source of truth)
  await ctx.db.patch(userId, {
    hasCompletedOnboarding: true,
  });

  return profile._id;
}
```

### 5.2 Clean Up Unused Queries

**Priority: Low**
**Effort: Low**

The `checkOnboardingStatus()` function in `convex/model/userProfile.ts:182-195` checks the legacy field:

```typescript
// CURRENT (uses legacy field)
export async function checkOnboardingStatus(
  ctx: QueryCtx,
  userId: Id<"users">
) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  return {
    isCompleted: profile?.onboardingCompleted ?? false, // ← Legacy field
    profile: profile ?? null,
  };
}
```

**Options:**
1. **Update to use users table:**
   ```typescript
   export async function checkOnboardingStatus(
     ctx: QueryCtx,
     userId: Id<"users">
   ) {
     const user = await ctx.db.get(userId);
     return {
       isCompleted: user?.hasCompletedOnboarding ?? false,
     };
   }
   ```

2. **Delete if unused** (check with `grep -r "checkOnboardingStatus"`)

### 5.3 Add Database Migration Script

**Priority: Medium**
**Effort: Low**

Create migration to clean existing records:

```typescript
// convex/migrations/removeOnboardingCompletedFromProfiles.ts
import { internalMutation } from "../_generated/server";

export const removeOnboardingCompletedField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();

    let updated = 0;
    for (const profile of profiles) {
      if ("onboardingCompleted" in profile) {
        await ctx.db.patch(profile._id, {
          onboardingCompleted: undefined, // Remove field
        });
        updated++;
      }
    }

    return { message: `Updated ${updated} profiles` };
  },
});
```

---

## 6. Benefits of Current Architecture

### 6.1 Advantages Over AuthGuard

✅ **No Race Conditions**
- Session refresh explicitly triggered when needed
- No competing navigation controllers

✅ **Predictable Flow**
- Clear, linear onboarding sequence
- No surprise redirects

✅ **Easier Debugging**
- Can log each navigation decision
- Clear separation of concerns

✅ **Better Performance**
- No continuous `useEffect` checks on every route change
- Auth check only on initial load

### 6.2 Single Source of Truth

Once legacy field removed:

✅ **No Duplicate State**
- Only `users.hasCompletedOnboarding` matters

✅ **Faster Queries**
- No need to join userProfiles for onboarding status
- Available directly from auth context

✅ **Simpler Code**
- Fewer DB operations in `completeOnboarding()`
- Clear data ownership

---

## 7. Related Files Reference

### Core Files
- `app/_layout.tsx` - Session refresh context and provider
- `app/index.tsx:1-79` - Initial routing logic
- `app/auth/signup.tsx:63-86` - Sets `hasCompletedOnboarding: false`
- `convex/schema.ts:5-34` - Table definitions
- `convex/model/userProfile.ts:129-155` - `completeOnboarding()` function
- `convex/users.ts:4-26` - `getCurrentUser()` query

### Related Documentation
- `docs/auth/session-refresh-workaround.md` - Session refresh pattern
- `docs/auth/session-timing-issue.md` - Original timing problem
- `docs/auth/profile-collection.md` - Profile data flow

---

## 8. Conclusion

The removal of AuthGuard and implementation of session refresh mechanism has resolved critical timing issues in the authentication flow. The duplicate onboarding state is a historical artifact that can be safely removed through the migration steps outlined above.

### Next Steps
1. ✅ Document current architecture (this document)
2. ⏳ Implement migration to remove legacy `onboardingCompleted` field
3. ⏳ Update or remove `checkOnboardingStatus()` function
4. ⏳ Add integration tests for onboarding flow

---

**Document Status**: Complete
**Review Status**: Pending
**Implementation Status**: Recommendations not yet implemented
