# RAHC Trade Show - Quick Reference
**Your Cheat Sheet for Oct 31, 2025**

---

## The 30-Second Pitch

> "We built a healthcare app for rural Alberta that actually works when the internet doesn't. Everything from finding clinics to tracking symptoms works 100% offline. Let me show you."

---

## 6 Features = 6 Stories

### 1. 🌐 Offline-First
**Story:** "Most health apps crash without internet. Ours works perfectly offline."
**Demo:** Airplane mode → Add health entry → It works
**Wow factor:** "Your data is always available, even in a dead zone."

### 2. 🎤 Speech-to-Text
**Story:** "Typing is hard when you're injured. Just speak."
**Demo:** Tap mic → Speak symptoms → Instant transcription
**Wow factor:** "Elderly users love this. No typing required."

### 3. 🗺️ Offline Maps
**Story:** "Imagine needing a clinic with no signal. We download maps ahead."
**Demo:** Download Calgary → Use offline → Find clinics instantly
**Wow factor:** "Pre-loaded maps can save lives in emergencies."

### 4. 🔔 Smart Notifications
**Story:** "Rural patients manage health at home. We send smart reminders."
**Demo:** Set medication reminder → Receive notification → In-app banner
**Wow factor:** "Context-aware reminders, not generic alarms."

### 5. 🔒 Secure Data
**Story:** "Healthcare data must be encrypted by law."
**Demo:** Save phone → Sign out → Sign in as different user → Data isolated
**Wow factor:** "User-namespaced encryption. Safe on shared devices."

### 6. 📊 Live/Cache Status
**Story:** "Users deserve to know if data is current or 3 hours old."
**Demo:** Online (green badge) → Offline (yellow badge with age)
**Wow factor:** "Transparency = trust. No surprises."

---

## Opening Lines (Choose Based on Visitor)

**For Business/Admin:**
> "We're solving the #1 problem with health apps in rural areas: they don't work offline."

**For Technical Peers:**
> "We built offline-first with WatermelonDB + Convex sync. Let me show you the architecture."

**For Healthcare Workers:**
> "Imagine your patient is 2 hours from a clinic with no cell signal. This app still works."

**For General Public:**
> "Have you ever tried to use a health app in a rural area? Most don't work. Ours does."

---

## Code Snippets (If Asked About Tech)

### Offline Detection
```typescript
const { isOnline } = useNetworkStatus();
{!isOnline && <OfflineBanner />}
```
**Explain:** "3 lines to make any feature offline-aware."

### Secure Storage
```typescript
await SecureStore.setItemAsync(`phone:${userId}`, phone);
```
**Explain:** "OS-level encryption. That simple."

### Voice Input
```typescript
<SpeechToTextButton onTextReceived={setText} />
```
**Explain:** "One component, works anywhere."

---

## Backup Answers (Common Questions)

### "What if AI gives wrong advice?"
✅ "We show a disclaimer on every AI result: 'Not professional medical advice.'"
✅ "AI is a guide, not a replacement for doctors."

### "How secure is the data?"
✅ "End-to-end encryption using platform keystores."
✅ "PIPEDA compliant, user-namespaced storage."

### "What about the AI model?"
✅ "We're working on on-device image analysis (Sprint 3)."
✅ "FP32 model works, optimizing for int8 quantization."

### "Why offline-first?"
✅ "30% of rural Alberta has unreliable cell coverage."
✅ "In emergencies, you can't wait for internet."

### "What's your tech stack?"
✅ "React Native + Expo, Convex backend, WatermelonDB for offline."
✅ "Chosen for real-time sync and offline reliability."

---

## Demo Sequence (Pick 2-3 Features Per Visitor)

**For Skeptics (Show offline works):**
1. Offline-First → Airplane mode demo
2. Offline Maps → Navigate without internet
3. Live/Cache Status → Data transparency

**For Tech-Savvy:**
1. Offline-First → Show WatermelonDB sync
2. Speech-to-Text → Show voice recognition
3. Secure Data → Show encryption implementation

**For Healthcare Workers:**
1. Speech-to-Text → Accessibility for injured patients
2. Offline Maps → Finding clinics in emergencies
3. Smart Notifications → Medication reminders

**For General Public:**
1. Speech-to-Text → "Just speak, don't type"
2. Offline Maps → "Works without internet"
3. Offline-First → "Everything saves locally"

---

## Emergency Responses

### App Crashes
> "This is why we built offline-first - data persists even when the app fails. Let me show you the backup slides."

### No Internet at Trade Show
> "Perfect timing! This is exactly what rural users face. Watch - the app still works."

### Forgot to Charge Device
> "I have a backup device/battery pack ready."

### Someone Asks About Unfinished Feature
> "Great question. We're working on that for Sprint 3. Let me show you what we've shipped so far."

---

## Body Language & Energy

✅ **DO:**
- Make eye contact
- Show enthusiasm ("This is so cool...")
- Use device naturally (not awkward)
- Let visitor touch the phone
- Pause for questions
- Smile!

❌ **DON'T:**
- Read slides word-for-word
- Apologize for what's not done
- Talk too fast (nerves)
- Hide the device (let them see)
- Get defensive if criticized
- Oversell ("This will change the world...")

---

## Key Talking Points (Memorize These)

1. **"Offline-first means offline-capable, not offline-only."**
   - App syncs when online, works when offline

2. **"We're not replacing doctors, we're bridging the distance."**
   - Tool for rural users, not medical diagnosis

3. **"Every feature was designed with unreliable internet in mind."**
   - Speech-to-text, maps, notifications all work offline

4. **"User data is encrypted, namespaced, and never shared."**
   - Privacy by design, PIPEDA compliant

5. **"This app proves rural users don't need to sacrifice features for reliability."**
   - Full functionality + offline resilience

---

## Time Management

**5-Minute Visitor:**
- Pick 1 feature
- Quick demo
- Answer 1-2 questions

**10-Minute Visitor:**
- Show 2-3 features
- Deeper dive on 1
- Code snippet if technical

**20-Minute Visitor:**
- Full tour of all 6 features
- Discuss architecture
- Roadmap conversation

---

## Closing Lines

**For Interested Visitors:**
> "We'd love your feedback. Here's how to reach us: [contact info]"

**For Technical Peers:**
> "The code will be on GitHub soon. Let's connect on LinkedIn."

**For Potential Partners:**
> "We're looking for feedback from industry experts. Can we schedule a follow-up?"

**For General Public:**
> "Thanks for your time! If you know anyone in rural Alberta, tell them about this app."

---

## Physical Setup

**On Table:**
- Charged phone/tablet
- This quick reference (printed or on backup device)
- Water bottle
- Business cards (if available)

**In Pocket/Bag:**
- Charger + cable
- Battery pack
- Backup device

---

## Mantras (Repeat Before Your Hour)

1. **"I know this app. I helped build this app."**
2. **"Slides support me, I don't support slides."**
3. **"Live demo > Perfect slides."**
4. **"Be honest, be enthusiastic, be helpful."**
5. **"This app can save lives. That's real."**

---

## Post-Presentation

**After Each Visitor:**
- Mental note: What worked? What didn't?
- Adjust approach for next visitor

**After Your Hour:**
1. Breathe!
2. Write down feedback received
3. Note any bugs/crashes
4. Celebrate - you did it!

---

**Remember:** You're not just presenting an app. You're showing how technology can solve real problems for real people.

**You got this!** 🚀

---

**File Location:** `/Users/yuezhou/projs/rural_alberta_health_connect_mobile/rahc-trade-show-slides/QUICK-REFERENCE.md`

**Print this before Oct 31!**
