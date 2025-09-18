# Collecting Additional Data During Signup

This approach stores extra user information (like firstName, lastName) transactionally during account creation and works with all providers (Google, email/password, etc.).

## Implementation Steps

### 1. Customize the Schema

We redefine the users table to include additional fields while keeping standard auth fields.

**Original:**
```typescript
export default defineSchema({
  ...authTables,
  // users table is provided by authTables
});
```

**Customized:**
```typescript
export default defineSchema({
  ...authTables,
  users: defineTable({
    // Our additional fields
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    // Keep all standard auth fields
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  }).index("email", ["email"]),
});
```

### 2. Customize the Provider

Add the two fields to the profile function:

```typescript
const PasswordProvider = Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      firstName: params.firstName as string,
      lastName: params.lastName as string,
    };
  },
});
```

### 3. Pass Data from Frontend

Include additional fields in the signup call:

```typescript
await signIn("password", {
  email: values.email,
  password: values.password,
  firstName: values.firstName,
  lastName: values.lastName,
  flow: "signUp"
});
```

## Key Points

- **Use optional fields**: Prevents breaking with third-party providers
- **Provider gets all params**: Any field passed to `signIn()` is available in `profile()`
- **Transactional safety**: All data saved atomically during account creation
- **Provider compatibility**: Works with Google, GitHub, etc. (they just won't have firstName/lastName)

## When to Use This vs. Separate Mutations

**Use during signup for:**
- Basic user identity (name, core info)
- Data that should exist from account creation

**Use separate mutations for:**
- Complex profile data
- Medical information
- User preferences
- Data that requires multi-step collection