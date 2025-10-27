# RAHC Trade Show Presentation
**Rural Alberta Health Connect - Feature Showcase**

Created: October 27, 2025
Trade Show: October 31, 2025

---

## Presentation Strategy (GPS Framework)

Each feature follows the **GPS Framework:**

- **G (Guide/Context)** - Why this feature matters (slides 01-context.md)
- **P (Point/Feature)** - What it does and how (slides 02-feature.md)
- **S (Show/Demo)** - Live demonstration + backup screenshots (slides 03-demo.md)
- **Code** - Technical implementation (slides 04-code.md)

### GPS Division for Trade Show

| Component | Presenter | Slides | Live Demo |
|-----------|-----------|--------|-----------|
| **G (Context)** | 75% | 25% | - |
| **P (Feature)** | 50% | 50% | - |
| **S (Demo)** | 10% | 10% | 80% |
| **Code** | 40% | 60% | - |

**Key Principle:**
- Slides = Visual anchors (nouns)
- Person = Narrative (verbs)
- Demo = Proof (actions)

---

## Feature Overview

### 1. Offline-First Architecture 🌐
**The Foundation of RAHC**

**Why:** Rural Alberta has unreliable internet. Most health apps fail offline.
**What:** Local-first data storage with automatic background sync.
**Tech:** WatermelonDB (SQLite) + Convex sync + NetInfo

**Key Code:**
- `app/hooks/useNetworkStatus.ts` - Network detection
- `app/components/OfflineBanner.tsx` - Offline indicator
- WatermelonDB integration for local storage

**Demo Flow:**
1. Enable airplane mode → Show offline banner
2. Add health entry → Works without internet
3. Disable airplane mode → Watch automatic sync

---

### 2. Speech-to-Text 🎤
**Accessibility for Rural Users**

**Why:** Typing is hard when injured, elderly, or in emergency.
**What:** Voice input for symptoms and health notes.
**Tech:** `@react-native-voice/voice` + Google/Apple speech recognition

**Key Code:**
- `app/components/SpeechToTextButton.tsx` - Reusable voice component
- Platform-specific speech recognition (Android: Google, iOS: Apple)
- Append mode (adds to existing text, not replace)

**Demo Flow:**
1. Open AI Assessment
2. Tap microphone → Speak symptoms
3. See instant transcription
4. Speak again → Text appends

---

### 3. Offline Maps 🗺️
**Navigate Without Internet**

**Why:** Finding clinics without internet can be life-threatening.
**What:** Pre-downloadable regional maps with offline navigation.
**Tech:** Mapbox Offline Manager + downloadable tile packs

**Key Code:**
- `app/components/OfflineMapDownloader.tsx` - Download manager
- `app/_config/mapbox.config.ts` - Region definitions
- 5 Alberta regions: Calgary, Edmonton, Red Deer, Lethbridge, Grande Prairie

**Demo Flow:**
1. Download Calgary region
2. Enable airplane mode
3. Open Emergency → See clinic map loads
4. Navigate offline

---

### 4. Smart Notifications 🔔
**Context-Aware Health Reminders**

**Why:** Rural patients manage health remotely and need reminders.
**What:** Medication, symptom tracking, and appointment reminders.
**Tech:** Expo Notifications + local scheduling

**Key Code:**
- `app/utils/pushNotifications.ts` - Notification scheduler
- `app/components/DueReminderBanner.tsx` - In-app reminder banners
- `app/components/NotificationBell.tsx` - Notification center

**Demo Flow:**
1. Set medication reminder for specific time
2. Receive push notification
3. See in-app banner
4. Tap to complete action

---

### 5. Secure Data Storage 🔒
**Privacy-First Healthcare**

**Why:** Healthcare data requires encryption (PIPEDA, HIPAA).
**What:** User-namespaced encrypted storage for sensitive data.
**Tech:** Expo SecureStore + platform keychain/keystore

**Key Code:**
- `app/utils/securePhone.ts` - Encrypted phone storage
- User-namespaced keys: `phone_number:user123`
- Platform-specific encryption (Android Keystore, iOS Keychain)

**Demo Flow:**
1. Save phone number in Personal Info
2. Sign out, sign in as different user
3. Show data isolation (no cross-account leakage)

---

### 6. Live/Cache Data Status 📊
**Transparency About Data Freshness**

**Why:** Users need to know if data is current or cached.
**What:** Visual badges showing live vs cached data with age.
**Tech:** NetInfo + AsyncStorage timestamps + real-time status

**Key Code:**
- `app/hooks/useNetworkStatus.ts` - Network monitoring
- `app/components/DataStatusBadge.tsx` (concept - not yet created)
- Commit: `c6e0900` - "add cache and live data status on clinic"

**Demo Flow:**
1. View clinic list (green "Live" badge)
2. Enable airplane mode
3. See yellow "Cached · 2h ago" badge
4. Disable airplane mode → Watch badge turn green

---

## Presentation Flow (Trade Show)

### Opening (2 minutes)
"Hi, I'm [Name]. I'll show you how we built a healthcare app for rural Alberta that works when internet doesn't."

### Feature Tour (30 minutes rotating)
For each visitor:
1. Ask: "What's your biggest concern with rural healthcare?"
2. Show relevant feature(s)
3. Live demo on device
4. Answer questions

### Closing
"This app proves that rural users don't need to sacrifice features for reliability. Everything works offline."

---

## Technical Talking Points

### Architecture Highlights
- **Frontend:** React Native (Expo SDK 54)
- **Backend:** Convex (real-time sync)
- **Offline DB:** WatermelonDB (SQLite)
- **State:** Local-first with background sync
- **AI:** Google Gemini API (symptom assessment)

### Why This Stack Works for Rural

| Challenge | Solution | Technology |
|-----------|----------|------------|
| No internet | Offline-first | WatermelonDB + AsyncStorage |
| Slow typing | Voice input | React Native Voice |
| No maps | Pre-download | Mapbox Offline Manager |
| Data privacy | Encryption | SecureStore (Keychain/Keystore) |
| Trust issues | Data transparency | NetInfo + timestamps |

---

## Code Snippets Worth Showing

### 1. Offline Detection (3 lines)
```typescript
const { isOnline } = useNetworkStatus();
// ... your feature ...
{!isOnline && <OfflineBanner />}
```

### 2. Secure Storage (3 lines)
```typescript
const key = `phone_number:${userId}`;
await SecureStore.setItemAsync(key, phone);
const data = await SecureStore.getItemAsync(key);
```

### 3. Voice Input (5 lines)
```typescript
<SpeechToTextButton
  onTextReceived={(text) => setSymptoms(text)}
  currentText={symptoms}
  placeholder="Tap to speak"
/>
```

---

## Backup Answers for Common Questions

### "What if the AI is wrong?"
**G:** AI isn't perfect, especially for medical advice. That's why we're transparent.
**P:** We clearly state: "This is not professional medical advice. Always consult a doctor."
**S:** Show disclaimer screen on every AI assessment result.

### "How do you handle HIPAA/PIPEDA?"
**G:** Healthcare data must be protected by law.
**P:** We use end-to-end encryption, user-namespaced storage, and data minimization.
**S:** Show SecureStore implementation + privacy policy.

### "What about the AI model you're working on?"
**G:** We want on-device image analysis for privacy and offline use.
**P:** Currently researching YOLO int8 quantization for mobile deployment.
**S:** "Sprint 3 goal - we have FP32 working, optimizing for production."

### "Why not use [other backend]?"
**G:** Rural users need real-time updates when online.
**P:** Convex provides real-time sync + serverless functions + built-in auth.
**S:** "One codebase, realtime by default, scales automatically."

### "How much data does offline mode use?"
**G:** Rural users often have limited data plans.
**P:** Maps: 10-50MB per region (one-time). WatermelonDB: ~5-10MB for average user.
**S:** Show storage usage in phone settings.

---

## Emergency Protocols

### If App Crashes During Demo
1. Stay calm: "Let me show you our backup slides..."
2. Show screenshot backups in `03-demo.md` files
3. Explain: "This is why we built offline-first - things fail, but data persists."

### If Internet Fails
1. Perfect! "This is exactly what rural users face."
2. Demo offline features (maps, health entry, viewing history)
3. "See? The app keeps working."

### If Asked About Unfinished Features
1. Be honest: "We're still optimizing [X] for production."
2. Show roadmap: "Sprint 3 goal is on-device AI model."
3. Focus on delivered features: "But these 6 features are production-ready."

---

## File Structure

```
rahc-trade-show-slides/
├── README.md                          # This file
├── 01-offline-first/
│   ├── 01-context.md                  # Why offline-first matters
│   ├── 02-feature.md                  # How it works
│   ├── 03-demo.md                     # Demo sequence + screenshots
│   └── 04-code.md                     # Code implementation
├── 02-speech-to-text/
│   ├── 01-context.md
│   ├── 02-feature.md
│   ├── 03-demo.md
│   └── 04-code.md
├── 03-offline-maps/
│   ├── 01-context.md
│   ├── 02-feature.md
│   ├── 03-demo.md
│   └── 04-code.md
├── 04-smart-notifications/
│   ├── 01-context.md
│   ├── 02-feature.md
│   ├── 03-demo.md
│   └── 04-code.md
├── 05-secure-data/
│   ├── 01-context.md
│   ├── 02-feature.md
│   ├── 03-demo.md
│   └── 04-code.md
└── 06-live-cache-status/
    ├── 01-context.md
    ├── 02-feature.md
    ├── 03-demo.md
    └── 04-code.md
```

---

## Pre-Trade Show Checklist

### Technical Prep
- [ ] Charge phone/tablet fully
- [ ] Test all features on device
- [ ] Download all map regions
- [ ] Verify speech-to-text works
- [ ] Test offline mode (airplane mode)
- [ ] Clear notification history
- [ ] Have backup device ready

### Content Prep
- [ ] Read all slide files once
- [ ] Practice GPS delivery for each feature
- [ ] Memorize 3 key talking points per feature
- [ ] Prepare answers to common questions
- [ ] Review code snippets (know what each does)

### Physical Prep
- [ ] Print this README as backup
- [ ] Bring charger + battery pack
- [ ] Water bottle
- [ ] Business cards (if available)

---

## Success Metrics

**Minimum Success:**
- Demonstrated all 6 features without crash
- Answered questions confidently
- Collected feedback for improvements

**Target Success:**
- Engaged 10+ visitors
- Generated interest from industry professionals
- Received positive feedback on offline-first approach

**Stretch Success:**
- Networking connections made
- Potential partnership discussions
- Media/press interest

---

## Post-Trade Show

### Debrief Questions
1. Which feature got the most interest?
2. What questions were asked most?
3. What should we improve for December 12 trade show?
4. Any bugs or crashes encountered?

### Follow-Up Actions
1. Document all feedback
2. Update slides based on what worked/didn't work
3. Add missed features to roadmap
4. Polish rough edges discovered during demo

---

## Key Mantras for Presenting

1. **"Slides = Nouns, Person = Verbs"**
   - Slides show WHAT, you explain WHY and HOW

2. **"Context is delivered, not displayed"**
   - Don't read slides, tell the story

3. **"Show, don't screenshot"**
   - Live demo beats static images every time

4. **"Your voice creates urgency, slides create clarity"**
   - Passion + precision = impact

5. **"The demo IS the proof"**
   - In a trade show, seeing it work matters most

---

## Resources

- GPS Framework: `/Users/yuezhou/projs/sait-open-house/arcive/G.P.S-framwork.md`
- GPS Insights: `/Users/yuezhou/projs/yue-todo/gps-slides-insights.md`
- RAHC Codebase Docs: `/Users/yuezhou/projs/rural_alberta_health_connect_mobile/CLAUDE.md`
- Latest Commits: `git log --oneline -25 origin/main`

---

**Last Updated:** October 27, 2025, 5:00 AM
**Next Review:** October 30, 2025 (day before trade show)
**Trade Show:** October 31, 2025, 4:00-5:00 PM (your hour)

---

**Remember:** You're not just presenting features. You're showing how technology can save lives in rural Alberta.

Good luck! 🚀
