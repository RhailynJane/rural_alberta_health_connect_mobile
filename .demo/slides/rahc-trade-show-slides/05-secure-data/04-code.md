# Code: Secure Data Storage Implementation

---

## 1. Save Encrypted Phone Number

```typescript
// app/utils/securePhone.ts
import * as SecureStore from 'expo-secure-store';

function keyFor(userId: string): string {
  return `user_phone_number:${userId}`;
}

export async function savePhoneSecurely(
  phone: string,
  userId: string
): Promise<void> {
  const storageKey = keyFor(userId);

  if (Platform.OS === 'android') {
    await SecureStore.setItemAsync(storageKey, phone, {
      requireAuthentication: false,
    });
  } else {
    await SecureStore.setItemAsync(storageKey, phone);
  }
}
```

**What this does:**
- Namespaces key by user ID
- Encrypts data automatically
- Platform-specific security

---

## 2. Retrieve Encrypted Data

```typescript
export async function getPhoneSecurely(
  userId: string
): Promise<string | null> {
  const storageKey = keyFor(userId);
  return await SecureStore.getItemAsync(storageKey);
}
```

**What this does:**
- Retrieves data for specific user
- Decrypts automatically
- Returns null if no data (secure default)

---

## 3. Delete Securely

```typescript
export async function clearPhoneSecurely(
  userId: string
): Promise<void> {
  const storageKey = keyFor(userId);
  await SecureStore.deleteItemAsync(storageKey);
}
```

**What this does:**
- Securely deletes data
- Called when user signs out
- No traces left

---

## 4. Normalize Phone Format

```typescript
export function normalizeNanpToE164(input: string): string {
  const digits = input.replace(/\D+/g, '');  // Remove non-digits

  if (digits.length === 10) {
    return '+1' + digits;  // (403) 123-4567 → +14031234567
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  return input.trim();
}
```

**What this does:**
- Standardizes phone format before storing
- Easier to process and validate
- Consistent data format

---

## Security by Design

**3 lines to encrypt anything:**

```typescript
const key = `data_type:${userId}`;
await SecureStore.setItemAsync(key, sensitiveData);
const retrieved = await SecureStore.getItemAsync(key);
```

**That's it!** OS handles encryption/decryption.

---

## Why This Matters

**Without secure storage:**
```typescript
await AsyncStorage.setItem('phone', phone);  // Plain text!
```

**With secure storage:**
```typescript
await SecureStore.setItemAsync('phone', phone);  // Encrypted!
```

**Same simplicity. Infinitely more secure.**

