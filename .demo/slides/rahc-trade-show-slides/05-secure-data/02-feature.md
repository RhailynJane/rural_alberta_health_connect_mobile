# Secure Data Storage Feature

---

## What We Protect

🔒 **Encrypted Storage:**
- Phone numbers
- Emergency contacts
- Personal health information
- User credentials

🔑 **User-Namespaced:**
- Each user's data stored separately
- No cross-account leakage
- Safe on shared devices

---

## How It Works

**Android:** Keystore encryption
**iOS:** Keychain encryption
**Technology:** Expo SecureStore

---

## Security Layers

**Layer 1: Device-Level Encryption**
- Uses OS-level secure storage
- Hardware-backed keys (when available)

**Layer 2: User Namespace**
- Data tagged with user ID
- `phone_number:user123` vs `phone_number:user456`
- Prevents cross-contamination

**Layer 3: Secure Transmission**
- HTTPS for all network requests
- Auth tokens encrypted

---

## Compliance

✅ PIPEDA compliant
✅ Data minimization (only store what's needed)
✅ User controls data (can delete anytime)

