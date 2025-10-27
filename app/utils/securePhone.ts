import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PHONE_KEY = "user_phone_number";

// Compose a per-user storage key to avoid cross-account leakage on shared devices
function keyFor(userId?: string | null): string {
  return userId ? `${PHONE_KEY}:${userId}` : PHONE_KEY; // legacy fallback when userId is not provided
}

export async function savePhoneSecurely(phone: string, userId?: string | null): Promise<void> {
  try {
    const storageKey = keyFor(userId);
    if (Platform.OS === "android") {
      await SecureStore.setItemAsync(storageKey, phone, {
        requireAuthentication: false,
      });
    } else {
      // For iOS/web, no-op or store without requirement; adjust as needed
      await SecureStore.setItemAsync(storageKey, phone);
    }
  } catch (e) {
    // Swallow errors to avoid blocking UX
    console.warn("Failed to securely store phone number", e);
  }
}

export async function getPhoneSecurely(userId?: string | null): Promise<string | null> {
  try {
    const storageKey = keyFor(userId);
    return await SecureStore.getItemAsync(storageKey);
  } catch (e) {
    console.warn("Failed to retrieve secure phone number", e);
    return null;
  }
}

export async function clearPhoneSecurely(userId?: string | null): Promise<void> {
  try {
    const storageKey = keyFor(userId);
    await SecureStore.deleteItemAsync(storageKey);
  } catch (e) {
    console.warn("Failed to clear secure phone number", e);
  }
}

export function normalizeNanpToE164(input: string): string {
  const digits = (input || "").replace(/\D+/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return input.trim();
}
