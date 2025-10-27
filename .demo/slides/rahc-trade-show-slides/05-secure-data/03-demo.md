# Demo: Secure Data Storage

---

## Live Demo Sequence

**Part 1: Store Encrypted Data**

1. **Open Profile → Personal Info** 👤
2. **Enter phone number**
   - e.g., (403) 123-4567
3. **Save** ✅
4. **Behind the scenes:**
   - Normalized to +1403123456 7
   - Encrypted
   - Stored as `phone_number:user_abc123`

---

**Part 2: Verify Security**

1. **Sign out** 🚪
2. **Sign in as different user**
3. **Check their personal info**
   - Previous user's phone NOT visible
   - Each user's data isolated

---

## What Makes It Secure

**Scenario 1: Shared Device**
- Grandpa logs out
- Grandson logs in
- Grandson CANNOT see Grandpa's phone number

**Scenario 2: Lost Phone**
- Phone stolen
- Thief cannot access encrypted health data
- SecureStore requires device unlock

**Scenario 3: Developer Access**
- Even developers can't decrypt user data
- Encryption keys managed by OS

---

## Screenshot Backup

![Personal Info Screen](../assets/personal-info.png)
*Phone input field*

![Secure Storage Indicator](../assets/secure-icon.png)
*Lock icon shows data is encrypted*

---

## Transparency

**Users are informed:**
- "Your data is encrypted and stored securely"
- Privacy policy link available
- Can delete data anytime

