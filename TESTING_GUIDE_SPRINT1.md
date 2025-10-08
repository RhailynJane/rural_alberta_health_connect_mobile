# Alberta Health Connect - Sprint 1 Testing Guide

## App Description

Alberta Health Connect is a React Native mobile application designed to improve healthcare access for residents of rural Alberta. The app features AI-powered symptom assessment, health tracking, emergency information access, and experimental on-device machine learning capabilities.

**Key Technologies:**
- Cloud AI: Google Gemini API for symptom assessment
- Local AI (Experimental): Llama 3.2 3B (on-device) for vision-based testing
- Backend: Convex (real-time database and auth)
- Vision Processing: TensorFlow Lite with COCO-SSD model

## Important Disclaimer

⚠️ **NOT FOR MEDICAL USE**

This application is a **prototype for testing purposes only** and should NOT be used for actual medical diagnosis or treatment decisions. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions.

**Privacy Notice:** Health data is stored securely but this is a test environment. Do not enter real personal health information if you have privacy concerns.

## Sprint 1 Scope

### ✅ Features Available for Testing
1. **User Authentication** (Cloud-based)
   - Sign up / Sign in
   - Onboarding flow (personal info, emergency contact, medical history)

2. **AI Symptom Assessment** (Cloud-based - Gemini API)
   - Multi-step symptom input
   - Severity rating (1-10 scale)
   - Duration selection
   - AI-generated health context and recommendations

3. **Health Tracking** (Cloud-based)
   - Manual symptom logging
   - View daily logs
   - View history

4. **Emergency Information**
   - Quick access to emergency contacts
   - Health card information

5. **User Profile**
   - View and edit profile information
   - Emergency contact management

6. **Vision Detection Test** (Local AI - Experimental)
   - Real-time object detection using TFLite (COCO-SSD)
   - Capture and analyze images with on-device AI
   - Medical assessment powered by Llama 3.2 3B (runs entirely on device)

### ⚠️ Known Limitations for Sprint 1
- **Local AI vision features are experimental** - The vision-test tab uses on-device models for demo purposes
- **Photo upload in AI Assessment is not yet functional** - You cannot upload images during the main symptom assessment flow
- **Image-based symptom analysis is not integrated** - Vision features are separated in the "vision-test" tab
- **Network required for cloud AI** - Gemini-based assessments require internet connection
- **Local model performance varies** - On-device AI performance depends on device capabilities

---

## Acceptance Criteria

### Authentication & Onboarding
- [ ] User can successfully sign up with email and password
- [ ] User can sign in with existing credentials
- [ ] User completes onboarding flow without errors
- [ ] Personal information is saved correctly (age range, location, biological sex)
- [ ] Emergency contact information is saved correctly
- [ ] Medical history is saved correctly (conditions, medications, allergies)
- [ ] User is redirected to dashboard after completing onboarding
- [ ] Sign out functionality works properly

### AI Symptom Assessment (Cloud - Gemini API)
- [ ] User can start assessment from dashboard
- [ ] User can select symptom severity (1-10)
- [ ] User can select symptom duration
- [ ] AI generates relevant health context
- [ ] Assessment results display properly
- [ ] Assessment is logged in Symptom Tracker
- [ ] User can navigate back through assessment steps
- [ ] Assessment timestamp is recorded correctly

### Manual Health Tracking
- [ ] User can access Symptom Tracker tab
- [ ] User can click "Add Log Entry"
- [ ] User can input symptom details (date, time, description)
- [ ] User can set severity level
- [ ] User can add notes
- [ ] Entry is saved successfully
- [ ] Entry appears in daily log
- [ ] Entry appears in history view
- [ ] User can view past entries

### Emergency Information
- [ ] Emergency contact information displays correctly
- [ ] Health card information displays correctly
- [ ] Quick dial buttons work (if applicable)

### Profile Management
- [ ] User can view profile information
- [ ] User can edit personal information
- [ ] User can update emergency contact
- [ ] Changes are saved and persist across sessions

### Vision Detection Test (Local AI - Experimental)
- [ ] User can access vision-test tab
- [ ] Camera permission is requested properly
- [ ] Real-time object detection works
- [ ] User can capture image with detections
- [ ] Captured image displays with bounding boxes
- [ ] User can add description text
- [ ] Local AI (Llama 3.2 3B) generates medical assessment
- [ ] Assessment displays properly
- [ ] User can start new assessment
- [ ] Model status indicator shows correctly

---

## Testing Flow Instructions

### Flow 1: Complete User Journey (Cloud AI)
**Objective:** Test the full app experience from sign-up to assessment to tracking

**Steps:**
1. **Sign Up**
   - Launch app
   - Tap "Sign Up"
   - Enter unique email and password (min 8 characters)
   - Complete onboarding:
     - Personal Info: Select age range, location in Alberta, biological sex
     - Emergency Contact: Enter name, relationship, phone
     - Medical History: Add any conditions, medications, allergies (or skip)
   - Verify redirect to dashboard

2. **AI Symptom Assessment** (using cloud Gemini API)
   - From dashboard, tap "Start Symptom Assessment"
   - **Symptom Selection:** Choose from provided categories OR describe your own
   - **Severity Rating:** Select 1-10 (e.g., "7" for moderate severity)
   - **Duration:** Select when symptoms started (e.g., "2-3 days ago")
   - **Review Results:** Read AI-generated context and recommendations
   - Note the urgency level assigned
   - Tap "Done" or "Log to Tracker"

3. **Verify Tracking**
   - Navigate to "Tracker" tab
   - Check "Daily Log" section - verify your assessment appears
   - Check "History" view - confirm entry is logged
   - Note timestamp and details

4. **Manual Log Entry**
   - Tap "Add Log Entry"
   - Fill in:
     - Date/Time (can be past or present)
     - Symptom description (e.g., "Headache", "Sore throat")
     - Severity (1-10)
     - Notes (optional)
   - Save entry
   - Verify it appears in tracker

5. **Profile & Emergency Info**
   - Go to "Profile" tab
   - Verify your information displays correctly
   - Navigate to "Emergency" tab
   - Verify emergency contact appears

**Test Variations:**
- Try different symptom types: Rash, Burn, Cold Injury, Trauma, Infection, etc.
- Try different severity levels (low 1-3, medium 4-7, high 8-10)
- Try different durations (today, yesterday, 2-3 days, week or more)
- Create at least **3-5 different assessments** per test account

### Flow 2: Vision Detection Test (Local AI - Experimental)
**Objective:** Test on-device AI vision capabilities

**Steps:**
1. **Navigate to Vision Test**
   - Go to "Vision Test" tab (eye icon)
   - Read the landing page features
   - Tap "Start Detection"

2. **Grant Camera Permission**
   - Allow camera access when prompted

3. **Real-Time Detection**
   - Point camera at various objects
   - Observe real-time bounding boxes and labels
   - Verify COCO labels appear (person, car, chair, etc.)
   - Check detection confidence percentages

4. **Capture and Analyze**
   - Position camera at an object
   - Tap "Capture" button
   - Verify camera freezes immediately (no delay)
   - Review captured image with bounding boxes
   - Check detection summary list

5. **AI Assessment (Local Model)**
   - Enter description in text field (e.g., "Red irritation on arm")
   - Wait for "Model Status: Ready" indicator
   - Tap "Analyze with AI"
   - Review Llama 3.2 3B local AI response
   - Note: Processing happens entirely on device

6. **Reset and Retry**
   - Tap "Start Over" to return to camera
   - Try different objects and scenarios

**Note:** Vision test is experimental and uses COCO-SSD for demo purposes. It's not yet integrated with main symptom assessment.

---

## Testing Requirements

### Each Tester Should:
1. **Create ONE test account** with unique email
2. **Complete Flow 1** - Full user journey (sign up → assessment → tracking)
3. **Create 3-5 different symptom assessments** with varying:
   - Symptom types
   - Severity levels (low, medium, high)
   - Duration options
4. **Create 2-3 manual log entries** in Symptom Tracker
5. **Test Flow 2** - Vision Detection (optional but encouraged)
6. **Record session** - Screen recording from sign-up to completion
7. **Document issues** - Use the bug report form below

### Test Data Suggestions

**Symptom Scenarios to Test:**
1. **Skin Condition**: Rash, itching, severity 6, started 2-3 days ago
2. **Respiratory**: Cough, shortness of breath, severity 5, started yesterday
3. **Pain/Injury**: Sprained ankle, severity 8, started today
4. **Infection**: Fever, chills, severity 7, started 2-3 days ago
5. **Gastrointestinal**: Nausea, vomiting, severity 4, started today

**Location Variations:**
- Calgary, Edmonton, Red Deer, Lethbridge, Grande Prairie
- Rural areas: Fort McMurray, Medicine Hat, Camrose, etc.

**Age Range Variations:**
- 18-24, 25-34, 35-44, 45-54, 55-64, 65+

---

## Known Issues & Workarounds

### Issue 1: Production Build Crashes on Open
**Status:** Under investigation
**Workaround:** Use development/preview builds for testing
**Note:** This is related to environment variables and EAS build configuration

### Issue 2: Image Upload Not Available in Main Assessment
**Status:** Feature not yet implemented
**Workaround:** Use "Vision Test" tab for image-based testing
**Expected:** Sprint 2

### Issue 3: Local Model Loading Time
**Status:** Normal behavior
**Details:** On-device AI models (Llama 3.2 3B) take time to load on first use
**Workaround:** Wait for "Model Status: Ready" indicator before analyzing

### Issue 4: Network Required for Cloud AI
**Status:** By design
**Details:** Main symptom assessment uses Google Gemini API (cloud)
**Workaround:** Ensure stable internet connection during assessments

---

## Bug Report Template

```
**Bug Title:** [Short description]

**Severity:** [Critical / High / Medium / Low]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Device Information:**
- Device: [iPhone 14, Samsung Galaxy S23, etc.]
- OS Version: [iOS 17, Android 14, etc.]
- App Version: [From profile or about screen]

**Screenshots/Video:**
[Attach if available]

**Additional Notes:**
[Any other relevant information]
```

---

## Feedback Form

Please provide feedback on:

1. **Ease of Use** (1-5): How intuitive was the app?
2. **AI Assessment Quality** (1-5): Were recommendations helpful/relevant?
3. **Performance** (1-5): Was the app responsive?
4. **Visual Design** (1-5): Was the UI clear and professional?
5. **Feature Completeness** (1-5): Did the app meet expectations for Sprint 1?

**Open-ended Feedback:**
- What did you like most?
- What needs improvement?
- What features would you want added?
- Any confusion during testing?

---

## Technical Notes for Testers

### Build Information
- **Framework:** React Native with Expo
- **Backend:** Convex (real-time sync)
- **Cloud AI:** Google Gemini API
- **Local AI:** Llama 3.2 3B (on-device)
- **Vision Model:** TensorFlow Lite COCO-SSD

### Data Storage
- All health data stored in Convex database
- Authentication tokens stored securely with Expo SecureStore
- Images processed locally in Vision Test (not uploaded to cloud)

### Privacy & Security
- Password authentication with secure storage
- Health data encrypted in transit
- Local AI processing (Vision Test) happens entirely on device
- Test accounts can be deleted after testing

---

## Questions or Issues During Testing?

Contact: [Add your contact information here]

**Thank you for helping test Alberta Health Connect!** 🏥📱
