# Role-Based Access Control (RBAC)

## What is RBAC?

RBAC controls what users can do in your app. Different users have different roles. Each role has different permissions.

Examples:
- **Admin**: Can see all patient data, manage users
- **Doctor**: Can see patient data, write prescriptions  
- **Patient**: Can only see their own data
- **Guest**: Can only view public information

## The Problem

We need to give users different permissions. We tried putting roles directly in the user table. This caused problems:

- Convex Auth doesn't support custom required fields
- Social login (Google, Facebook) doesn't provide role information
- App crashes when role is missing
- Hard to change roles later

## What We Learned

Don't put roles in the user table. Convex recommends using a separate table for roles and permissions.

## Our Solution

We use a separate table to track user roles:

### Database Setup

Three tables:
- **users**: Email and password only
- **userRoles**: Connects users to their roles
- **permissions**: Defines what each role can do (optional)

### userRoles Table Structure

```
userId: Link to user
role: "admin", "doctor", "patient", "guest"
teamId: Which organization/clinic (optional)
status: "active", "suspended", "pending"
```

## How It Works

### When User Signs Up
1. User creates account (basic info only)
2. App assigns default role (usually "patient")
3. App creates entry in userRoles table

### When User Logs In
1. App checks userRoles table
2. App loads user's current role
3. App shows/hides features based on role

### Checking Permissions
```javascript
// Check if user is admin
const userRole = await getUserRole(ctx, userId);
if (userRole !== "admin") {
  throw new Error("Not authorized");
}
```

## Role Examples for Healthcare App

### Patient
- View own medical records
- Book appointments
- Message their doctor
- Update personal profile

### Doctor
- View patient records (assigned patients)
- Write prescriptions
- Schedule appointments
- Send messages to patients

### Admin
- Manage all users
- View all data
- Create doctor accounts
- System settings

### Guest
- View public health information
- Sign up for account
- Contact support

## Trade-offs We Made

### Good Things
- Easy to change user roles
- Works with all login methods
- Can have multiple roles per user
- Fine-grained permission control
- Supports team/organization structure

### Bad Things
- More complex than simple role field
- Requires extra database queries
- Need to handle users without roles
- More code to maintain

## Best Practices

### 1. Always Give Default Role
Every user should have at least one role. Usually "patient" or "user".

### 2. Check Roles in Backend
Never trust the frontend. Always verify permissions on the server.

### 3. Use Descriptive Role Names
Use "healthcare_admin" instead of "admin". Be specific.

### 4. Handle Missing Roles
What happens if a user has no role? Usually treat as "guest".

### 5. Log Permission Changes
Track when roles change and who changed them.

## Technical Implementation

### Creating Role
```javascript
import { getAuthUserId } from "@convex-dev/auth/server";

// When user signs up or needs role assignment
const userId = await getAuthUserId(ctx);
if (!userId) throw new Error("Not authenticated");

await ctx.db.insert("userRoles", {
  userId, // Correct Convex user ID
  role: "patient",
  status: "active",
  createdAt: Date.now()
});
```

### Checking Role
```javascript
import { getAuthUserId } from "@convex-dev/auth/server";

// In any protected mutation/query
export const protectedAction = mutation({
  handler: async (ctx, args) => {
    const role = await getUserRole(ctx);
    if (role !== "admin") {
      throw new Error("Admin only");
    }
    // Do admin stuff
  }
});
```

### Getting User Role
```javascript
import { getAuthUserId } from "@convex-dev/auth/server";

async function getUserRole(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return "guest";
  
  const roleRecord = await ctx.db
    .query("userRoles")
    .withIndex("byUserId", q => q.eq("userId", userId))
    .first();
    
  return roleRecord?.role || "guest";
}
```

## Critical: Getting User ID Correctly

**Wrong way** (causes schema errors):
```javascript
const identity = await ctx.auth.getUserIdentity();
const userId = identity.subject; // This is NOT a Convex user ID!

await ctx.db.insert("userRoles", {
  userId, // Will fail v.id("users") validation
  role: "patient"
});
```

**Right way**:
```javascript
import { getAuthUserId } from "@convex-dev/auth/server";

const userId = await getAuthUserId(ctx);
if (!userId) throw new Error("Not authenticated");

await ctx.db.insert("userRoles", {
  userId, // Correct Convex user ID
  role: "patient"
});
```

**Why this matters**: `identity.subject` contains session data with pipe separators. Only `getAuthUserId()` returns the real Convex user ID that works with `v.id("users")`.

## When to Use RBAC

Use RBAC when:
- Different users need different permissions
- You have admin users
- You need to control data access
- Multiple organizations use your app
- Security is important

Don't use RBAC when:
- All users have same permissions
- Very simple app
- No sensitive data
- Only one type of user

## Security Tips

1. **Default to least permission**: Users can only do basic things unless given more access
2. **Check permissions on every action**: Don't assume user has permission
3. **Use database queries**: Don't store permissions in local storage
4. **Audit role changes**: Keep track of who changed what
5. **Regular reviews**: Check if users still need their roles