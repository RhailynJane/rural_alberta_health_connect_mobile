# Convex Auth Session Refresh Workaround

## Problem

Convex Auth in React Native Expo has session staleness issues with SecureStore.

After user completes onboarding:
- Mutations succeed 
- Auth state shows `isAuthenticated: true`
- Queries return data from previous user sessions
- Backend handlers never execute

This is a known Convex Auth + React Native + SecureStore issue.

## Root Cause

SecureStore caches auth tokens. After auth state changes, the Convex client still uses old cached tokens. New session data doesn't propagate to queries.

## Solution: Provider Remount Pattern

We force the ConvexAuthProvider to remount with a fresh client instance.

### Implementation

**1. Create Session Refresh Context**
```typescript
// _layout.tsx
const SessionRefreshContext = createContext<SessionRefreshContextType | null>(null);

export const useSessionRefresh = () => {
  const context = useContext(SessionRefreshContext);
  if (!context) {
    throw new Error('useSessionRefresh must be used within SessionRefreshProvider');
  }
  return context;
};
```

**2. Add Provider Key State**
```typescript
// _layout.tsx
const [providerKey, setProviderKey] = useState(0);

const refreshSession = () => {
  console.log('🔄 Refreshing session via provider remount...');
  setProviderKey(k => k + 1);
};

return (
  <SessionRefreshContext.Provider value={{ refreshSession }}>
    <ConvexAuthProvider key={providerKey} client={convex} storage={secureStorage}>
      {/* app content */}
    </ConvexAuthProvider>
  </SessionRefreshContext.Provider>
);
```

**3. Use After Critical Mutations**
```typescript
// medical-history.tsx
const { refreshSession } = useSessionRefresh();

const handleCompleteSetup = async () => {
  await updateCompleteUserOnboarding();
  
  // Force session refresh
  refreshSession();
  
  // Wait for backend state to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  router.push("/(tabs)/dashboard");
};
```

## How It Works

1. `setProviderKey(k => k + 1)` changes the React key
2. React unmounts old ConvexAuthProvider
3. React mounts new ConvexAuthProvider with fresh client
4. New client fetches current auth session from SecureStore
5. Queries now use fresh session data

## Alternative Approaches Tried

### AuthWrapper Pattern
- Added component to gate queries on auth state
- Still returned stale session data
- Didn't solve core token cache issue

### Manual Delays
- Added delays between mutations and navigation
- Session staleness persisted
- Not a reliable solution

### Sign-out/Sign-in Cycle
- Considered forcing re-authentication
- Too disruptive to user experience
- Provider remount is cleaner

## When to Use

Use session refresh after mutations that change user auth state:
- User onboarding completion
- Profile updates that affect auth
- Role changes
- Any mutation that should be reflected in auth queries

## Known Limitations

- 2-second delay needed for backend propagation
- Provider remount resets all Convex client state
- Not needed for regular data mutations

## Future Improvements

- Monitor for official Convex Auth fixes
- Consider react-native-keychain instead of SecureStore
- Implement more targeted session refresh if API becomes available

## Files Modified

- `app/_layout.tsx` - Session refresh provider
- `app/auth/medical-history.tsx` - Usage after onboarding
- `app/(tabs)/dashboard.tsx` - Use getCurrentUser instead of getUserWithProfile
- `convex/model/user.ts` - Fix userName field mapping