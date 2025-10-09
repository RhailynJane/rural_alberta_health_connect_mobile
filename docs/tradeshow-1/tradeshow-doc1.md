Rural Alberta Health Connect - Trade Show Presentation Prep Guide

  ---
  Category 1: Vision & Business Concepts (The "Elevator Pitch" Layer)

  1. Rural Alberta Health Connect (RAHC)

  Simple Definition: A mobile health app that uses AI to help rural Albertans assess symptoms,
  track health, and find emergency care when doctors are hours away.

  Project Connection: This is our solution to the 200km+ average distance rural Albertans must
  travel for specialist care, combining AI triage with offline functionality.

  ---
  2. Healthcare Access Inequality

  Simple Definition: The gap between healthcare available in cities versus rural areas, where
  distance, provider shortages, and limited resources create barriers to timely care.

  Project Connection: This is the core problem RAHC solves—23% of rural Alberta lacks reliable
  internet, and emergency response times average 45+ minutes.

  ---
  3. AI-Enhanced Telemedicine

  Simple Definition: Using artificial intelligence to provide medical guidance remotely, going
  beyond video calls to analyze symptoms, images, and patient data automatically.

  Project Connection: RAHC uses AI to read symptom descriptions AND analyze photos (multi-modal
  analysis) to provide better health guidance than text-only systems.

  ---
  4. Triage System

  Simple Definition: A process that determines how urgent a medical situation is and what level
  of care is needed—from self-care at home to immediate emergency room visit.

  Project Connection: RAHC's AI helps rural residents make informed decisions about whether to
  "tough it out," call their doctor, or seek emergency care, reducing unnecessary ER visits.

  ---
  5. Offline-First Design

  Simple Definition: Building technology that works fully without internet connection, then
  syncs data when connectivity returns.

  Project Connection: Since 23% of rural Alberta lacks reliable internet, RAHC stores health
  assessment algorithms locally so critical features work even during outages.

  ---
  6. Rural-First Development Philosophy

  Simple Definition: Designing technology specifically for rural constraints (slow internet,
  limited resources, cultural differences) instead of adapting urban solutions poorly.

  Project Connection: Unlike most health apps built for cities, RAHC prioritizes low-bandwidth
  operation, works with local clinics, and understands rural healthcare culture.

  ---
  7. Privacy-Compliant Healthcare AI

  Simple Definition: Building artificial intelligence that follows Canadian health privacy laws
  (PIPEDA/PIPA/HIA) while still providing advanced medical guidance.

  Project Connection: RAHC implements end-to-end encryption, user-controlled data sharing, and
  audit trails, proving cutting-edge AI can meet Alberta healthcare privacy standards.

  ---
  Category 2: Architectural & Major Tech Concepts (The "Blueprint" Layer)

  1. React Native Cross-Platform Framework

  Simple Definition: A technology that lets us write code once and deploy to both iPhone and
  Android devices, reducing development time while maintaining native performance.

  Project Connection: RAHC uses React Native to reach the widest rural audience possible without
   building separate iOS and Android apps from scratch.

  ---
  2. Convex Real-Time Backend

  Simple Definition: A cloud database system that automatically syncs data across devices in
  real-time and handles authentication, so health records update instantly when connectivity
  exists.

  Project Connection: Convex powers RAHC's backend, managing user profiles, health entries, and
  emergency contacts while providing secure authentication and offline sync.

  ---
  3. BFF (Backend for Frontend) Architecture

  Simple Definition: A layered backend design where each app screen gets its own API endpoint,
  with reusable business logic in a separate "model" layer.

  Project Connection: RAHC's Convex backend separates screen-specific APIs
  (personalInfoOnboarding, emergencyContactOnboarding) from shared business logic
  (model/userProfile.ts) for maintainability.

  ---
  4. Multi-Modal AI Analysis

  Simple Definition: An AI system that combines multiple types of input (text descriptions AND
  images) to make better assessments than using just one type of data.

  Project Connection: RAHC analyzes both written symptom descriptions AND photos using YOLO
  computer vision, mimicking how doctors examine patients by seeing AND hearing symptoms.

  ---
  5. YOLO (You Only Look Once) Computer Vision

  Simple Definition: A fast AI model that can identify and locate objects in images in
  real-time, originally designed for self-driving cars but adapted for medical symptom
  detection.

  Project Connection: RAHC uses YOLO (specifically COCO-SSD MobileNetV1) to detect visual
  symptoms like rashes, burns, or injuries from photos users take with their phone camera.

  ---
  6. Location-Aware Emergency Services

  Simple Definition: A system that uses your phone's GPS location to find nearby healthcare
  facilities, calculate distances, and provide directions to the closest appropriate care.

  Project Connection: RAHC's Emergency tab combines AI symptom assessment with GPS-based clinic
  finder to help rural residents make informed emergency decisions and optimize response times.

  ---
  7. Expo SDK & React Native New Architecture

  Simple Definition: Expo is a toolkit that simplifies React Native development with pre-built
  components and easy deployment; the New Architecture improves performance and enables advanced
   features.

  Project Connection: RAHC uses Expo SDK 54 with the New Architecture enabled (app.json:
  newArchEnabled: true) for better performance and access to cutting-edge React Native features.

  ---
  Category 3: Key Implementation & Code-Level Concepts (The "In-the-Weeds" Layer)

  1. useTensorflowModel Hook (react-native-fast-tflite)

  Simple Definition: A React hook that loads TensorFlow Lite AI models directly onto the phone,
  allowing on-device object detection without sending data to the cloud.

  Project Connection: RAHC's vision-test feature (app/(tabs)/vision-test/index.tsx) uses this
  hook to run COCO-SSD MobileNetV1 locally, detecting objects in real-time for privacy-focused
  symptom analysis.

  ---
  2. Convex Auth with SecureStore

  Simple Definition: A secure authentication system that stores login tokens in the phone's
  encrypted storage (SecureStore) instead of easily-accessible regular storage.

  Project Connection: RAHC implements this in app/_layout.tsx (ConvexAuthProvider + SecureStore)
   to ensure user credentials and health data remain protected even if the phone is compromised.

  ---
  3. api.aiAssessment.generateContextWithGemini

  Simple Definition: A Convex backend function that sends symptom data to Google's Gemini AI
  model and returns medical context, recommendations, and risk assessments.

  Project Connection: This is RAHC's core AI assessment endpoint (convex/aiAssessment.ts),
  generating health guidance from user-reported symptoms with fallback to rule-based assessment
  when API limits are reached.

  ---
  4. healthEntries Table Schema

  Simple Definition: A database table structure that stores all health tracking data with fields
   for symptoms, severity (0-10), duration, AI context, photos, and timestamps.

  Project Connection: RAHC's health tracking system (convex/schema.ts) uses this table to store
  both AI assessments (type: "ai_assessment") and manual entries (type: "manual"), enabling
  historical tracking.

  ---
  5. Typed Routes (Expo Router)

  Simple Definition: A navigation system where route paths are automatically type-checked,
  preventing typos and ensuring you can only navigate to screens that actually exist in your
  app.

  Project Connection: RAHC enables typed routes in app.json (experiments: { typedRoutes: true
  }), making navigation safer—e.g., can't accidentally navigate to /dashbord when it's
  /dashboard.

  ---
  6. model/userProfile.ts Business Logic Layer

  Simple Definition: A reusable code file containing core user profile operations (create,
  update, retrieve) that multiple API endpoints can call, avoiding code duplication.

  Project Connection: RAHC's model layer (convex/model/userProfile.ts) provides functions used
  by personalInfoOnboarding, emergencyContactOnboarding, and medicalHistoryOnboarding APIs,
  following BFF pattern.

  ---
  7. CurvedBackground & CurvedHeader SVG Components

  Simple Definition: Custom UI components that use Scalable Vector Graphics (SVG) to create
  smooth curved designs for headers and backgrounds, giving the app a distinctive visual
  identity.

  Project Connection: RAHC uses react-native-svg to build these reusable components
  (components/CurvedBackground.tsx, components/CurvedHeader.tsx) for a consistent, visually
  appealing healthcare interface across all screens.

  ---
  BONUS: Critical Sprint 1 Talking Points

  What's Working Right Now (Confidence Boosters):

  - ✅ Complete authentication flow with secure onboarding (personal info, emergency contacts,
  medical history)
  - ✅ AI symptom assessment using Gemini-4o with automatic logging to health tracker
  - ✅ Manual health logging with date filters (Today/Last 7 days/Last 30 days/All time)
  - ✅ Location-based emergency clinic finder with GPS integration and "Open Maps" functionality
  - ✅ Offline-capable architecture with Convex real-time sync
  - ✅ TensorFlow Lite COCO-SSD object detection in vision-test tab (experimental)

  Known Limitations (Honest Transparency):

  - ⚠️ Camera feed visibility issue in real-time detection (workaround: click capture)
  - ⚠️ Profile page loading delays (data eventually populates—it's a sync timing issue)
  - ⚠️ Free Gemini API may hit rate limits during heavy testing (fallback assessment activates)
  - ⚠️ Vision detection is experimental (foundation for future symptom image analysis)

  ---
  Your Competitive Edge:

  You're not just building "another health app"—you're solving 4 unique problems simultaneously:

  1. Multi-modal AI (text + image analysis) vs. text-only competitors
  2. Offline-first rural design vs. urban-centric telehealth apps
  3. Privacy-compliant AI (end-to-end encryption + PIPEDA/PIPA) vs. data-hungry health startups
  4. Location-aware emergency triage vs. generic symptom checkers

  Closing Power Statement:
  "Rural Alberta Health Connect proves that cutting-edge AI can bridge the healthcare gap 
  between urban and rural communities. We're not just building technology—we're building equity,
   one assessment at a time."

  ---
  Good luck at the trade show! You've got this. 💪