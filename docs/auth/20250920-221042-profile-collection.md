# Collecting Optional Profile Information

**Created**: 2025-09-20 22:10:42
**Branch**: N/A
**Related Commits**: N/A

---

## What is this about?

When users sign up, we want to collect extra information like age, location, and medical history. This information helps us provide better healthcare services.

## The Problem

We tried to collect all information during signup. This broke our app. Here's why:

- Convex Auth only saves basic information (email, password) during signup
- Extra information gets lost
- The database schema doesn't allow custom fields in the user table

## What We Learned

Convex Auth has limits. You cannot pass extra data through the signup process. Only email and password work reliably.

## Our Solution

We use a two-step process:

1. **Step 1**: User creates account with email and password
2. **Step 2**: User fills out profile information separately

## How It Works

### Database Setup

We have two tables:

- **users table**: Only essencial ones like email and password (handled by Convex Auth)
- **userProfiles table**: Age, location, medical info, emergency contacts

### Code Flow

1. User clicks "Create Account"
2. App creates basic user account
3. App redirects user to profile form
4. User fills out health information
5. App saves profile data to userProfiles table

### Why This is Better

- Works with all login methods (Google, Facebook, email)
- App doesn't crash if profile is incomplete
- Users can update their profile later
- Follows industry best practices

## Trade-offs We Made

### Good Things

- App is more reliable
- Works with social login
- Users can skip profile and complete later
- Easy to add new profile fields

### Bad Things

- Not everything happens at once
- User might create account but never complete profile
- Two separate steps instead of one

## Technical Details

### Frontend Code

```javascript
// Step 1: Create account (simplified signup)
await signIn("password", {
  email,
  password,
  flow: "signUp",
});
router.push("/profile/complete");

// Step 2: Save profile (separate mutation call)
const updateProfile = useMutation(api.userProfile.updateUserProfile);
await updateProfile({
  ageRange: "25-34",
  location: "Rural Alberta",
  medicalConditions: "None",
});
```

### Backend Code

```javascript
import { getAuthUserId } from "@convex-dev/auth/server";

export const updateUserProfile = mutation({
  args: {
    ageRange: v.optional(v.string()),
    location: v.optional(v.string()),
    // ... other optional fields
  },
  handler: async (ctx, args) => {
    // Get correct Convex user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if profile exists, update or create
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        ...args,
        onboardingCompleted: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
```

## Important Lessons Learned

### Critical: Getting User ID Correctly

**Wrong way** (causes schema errors):

```javascript
const identity = await ctx.auth.getUserIdentity();
const userId = identity.subject; // This is NOT a Convex user ID!
```

**Right way**:

```javascript
import { getAuthUserId } from "@convex-dev/auth/server";

const userId = await getAuthUserId(ctx);
if (!userId) throw new Error("Not authenticated");
```

**Why this matters**: `identity.subject` contains session data with pipe separators. Only `getAuthUserId()` returns the real Convex user ID that works with `v.id("users")`.

## Best Practices

1. Keep user table simple (only email, password)
2. Put extra information in separate tables
3. Make profile completion optional
4. Let users update profiles anytime
5. Use separate API calls for profile data
6. **Always use `getAuthUserId(ctx)` for user references**
7. Use upsert pattern (update existing or create new)

## When to Use This Pattern

Use this pattern when:

- You need extra user information
- You support multiple login methods
- Profile information is optional
- You want flexible user onboarding
