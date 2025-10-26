import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PHONE_KEY = "user_phone_number";

export async function savePhoneSecurely(phone: string): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await SecureStore.setItemAsync(PHONE_KEY, phone, {
        requireAuthentication: false,
      });
    } else {
      // For iOS/web, no-op or store without requirement; adjust as needed
      await SecureStore.setItemAsync(PHONE_KEY, phone);
    }
  } catch (e) {
    // Swallow errors to avoid blocking UX
    console.warn("Failed to securely store phone number", e);
  }
}

export async function getPhoneSecurely(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PHONE_KEY);
  } catch (e) {
    console.warn("Failed to retrieve secure phone number", e);
    return null;
  }
}

export async function clearPhoneSecurely(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PHONE_KEY);
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
