
---

# **Trade Show Q&A Guide**

## **Rural Alberta Health Connect - Sprint 1 Presentation**

### **How to Use This Document**

This document is not a script to memorize. It's a source of **talking points**. Your goal is to internalize these key ideas so you can speak about them naturally and confidently.

For every question, use the **Upgraded G.P.S. Framework** to structure your answer:

- **G = Guide (Set the Stage):** Start with the context. What is the goal, the problem, or the core principle behind your answer? The "Guide" step is your strategic opener. By starting with the goal, the problem, or the core principle, you immediately tell your listener why your answer matters. It frames the entire conversation and shows that you understand the bigger picture, not just the specific detail you were asked about.



- **P = Point (The Direct Answer):** Give the clear, simple, direct answer.
- **S = Show (Land with Proof):** End with a concrete example, a specific stat, or a tangible benefit that makes your point credible and memorable.

Practice delivering these points out loud until they feel like your own words.

---

---

## **CATEGORY 1: PROJECT VISION & PURPOSE**

### ★★★ **Q1: What is Rural Alberta Health Connect?**

**Your Talking Points:**

- **G (Guide - Set the Stage):** "Living in rural Alberta often means you're hours from the nearest clinic, and the internet can be unreliable."
- **P (Point - The Direct Answer):** "So, we built Rural Alberta Health Connect, a mobile app that acts as a decision support tool for health concerns."
- **S (Show - Land with Proof):** "Crucially, it's not a diagnosis tool; it's a **decision support system** that gives you guidance when the nearest clinic might be over 200km away."

---

### ★★★ **Q2: Why does this project matter? What problem does it solve?**

**Your Talking Points:**

- **G (Guide - Set the Stage):** "It comes down to a painful choice people in rural communities face: 'Do I drive four hours for this, or just tough it out at home?'"
- **P (Point - The Direct Answer):** "Our project matters because it gives them a reliable first step. It provides guidance when professional help is far away and internet is spotty."
- **S (Show - Land with Proof):** "This is a real healthcare equity issue. When **23% of rural Alberta lacks reliable internet** and emergency response can average **over 45 minutes**, a tool that works offline can make a critical difference."

---

### ★★ **Q3: Who is your target user?**

**Your Talking Points:**

- Our primary users are rural Alberta residents living far from urban medical centers—farmers, ranchers, and families in small towns.
- These are people who need reliable guidance on whether their symptoms require an immediate, long-distance trip to a clinic.
- We also see secondary users like community health nurses and patients with chronic conditions who need to monitor symptoms between appointments.

---

### ★★ **Q4: How is this different from other health apps like WebMD or Babylon Health?**

**Your Talking Points:**
"We're different in four key ways designed specifically for rural users:"

1.  **Offline-First:** Our app works without internet, which is critical for the 23% of rural Albertans with unreliable connections.
2.  **Multi-modal AI:** We analyze photos with computer vision (YOLO) _and_ text, mimicking how a doctor sees and listens.
3.  **Rural-Specific:** The entire design is built for low-bandwidth environments and rural healthcare culture.
4.  **Location-Aware Emergency Services:** It integrates GPS to find the _actual_ nearest care, not just the nearest major hospital.

**The Core Differentiator:** "Most telehealth apps are built for cities. We designed this to be **rural-first** from day one."

---

---

## **CATEGORY 2: TECHNICAL ARCHITECTURE**

### ★★★ **Q6: What technologies power your app?**

**Your Talking Points:**

- **G (Guide - Set the Stage):** "Our main goal was to build quickly for both iOS and Android with a small team."
- **P (Point - The Direct Answer):** "So, the app is built with **React Native** and **Expo**, with **Convex** as our real-time backend."
- **S (Show - Land with Proof):** "This stack was a strategic choice—it allowed our two-person team to deliver a cross-platform app, **cutting our estimated development time by about 40%**."

---

### ★★★ **Q7: How does your AI symptom assessment work?**

**Your Talking Points:**

- **G (Guide - Set the Stage):** "Our priority for the AI was safety and reliability."
- **P (Point - The Direct Answer):** "When a user describes their symptoms, we send that info to a Google Gemini AI that's been prompted to act like an emergency physician."
- **S (Show - Land with Proof):** "The most important part is our safety net: if the API fails for any reason, our built-in fallback system automatically advises the user to contact a professional like Health Link 811. **A user is never left without a safe next step.**"

---

### ★★ **Q10: What is Convex and why did you choose it over Firebase or AWS?**

**Your Talking Points (Applying The Why Triangle):**
"Convex is a real-time backend platform. We chose it for three main reasons:"

- **Value (Efficiency):** It has excellent TypeScript support and a BFF architecture that saved our small team a huge amount of development time.
- **User (Experience):** Its built-in real-time sync is perfect for our offline-first approach, ensuring a smooth experience for users with poor connectivity.
- **Risk (Security):** Convex Auth combined with Expo SecureStore provides healthcare-grade, hardware-encrypted security for user credentials.

---

---

## **CATEGORY 3: FEATURES & USER EXPERIENCE**

### ★★★ **Q13: What features are working in Sprint 1?**

**Your Talking Points:**

- **G (Guide - Set the Stage):** "For Sprint 1, our focus was delivering a complete, working user journey from start to finish."
- **P (Point - The Direct Answer):** "So, we have secure **user onboarding**, the core **AI symptom assessment**, and a full **health tracker**."
- **S (Show - Land with Proof):** "We successfully connected all five core features. **For example, an AI assessment flows directly into the health tracker, which a user can then use to inform their call to a clinic found in the emergency tab.** It's a complete, working loop."

---

### ★★★ **Q14: Can you demo the AI symptom assessment flow?**

**Your Talking Points:**

- **G (Guide - Set the Stage):** "Absolutely. We designed this flow to be incredibly quick and intuitive for someone who might be feeling unwell."
- **P (Point - The Direct Answer):** "The user starts an assessment, describes their symptoms, and rates the severity and duration."
- **S (Show - Land with Proof):** "The result is a clear, AI-generated summary that gets **permanently logged in their health history.** They now have a detailed record they can reference later or even show their family doctor."

---

---

## **CATEGORY 4: CHALLENGES & DESIGN DECISIONS**

### ★★★ **Q18: What were your biggest technical challenges in Sprint 1?**

**Your Talking Points:**

- **G (Guide - Set the Stage):** "Every ambitious project has challenges, but ours led to some clever solutions we're proud of."
- **P (Point - The Direct Answer):** "Our two biggest hurdles were Google's safety filters blocking legitimate medical content, and the performance of the on-device camera."
- **S (Show - Land with Proof):** "We solved the camera issue by running AI detection at an efficient **10 FPS** while rendering the UI at a smooth **30-60 FPS**. For the AI, we proved that specialized prompt engineering that positions the AI as a physician was the key to bypassing the content filters for legitimate medical terms."

---

---

## **CATEGORY 6: TOUGH QUESTIONS**

**Strategy:** For these questions, use the **Acknowledge & Reframe** technique _before_ delivering your G.P.S. answer.

### ★★ **Q26: How do you handle incorrect AI diagnoses?**

**Your Talking Points:**

- **(Acknowledge & Reframe):** "That's a critical point, and it's why we made the core distinction that our app **doesn't provide diagnoses**—it provides triage guidance."
- **(G.P.S. Answer):**
  - **G:** "Our system is built on the principle of 'safety first'."
  - **P:** "It's a **decision support tool** to help users decide their next step, and every screen has a clear disclaimer."
  - **S:** "For proof, if a user's severity is high (7+/10) or there's any ambiguity, the system is designed to **always err on the side of caution** and recommend professional care."

---

---

## **BONUS: FINAL PRO TIPS (UPDATED)**

### **How to Practice:**

- **Read the G.P.S. points** for the ★★★ questions out loud.
- **Cover the text** and try to deliver the same message in your own words.
- **Record yourself** on your phone and listen back. Do you sound confident? Is your structure clear?
- **Drill the Lightning Round** with a friend to build speed and fluency.

### **What to Memorize:**

- **The Core Stats:** 200km distance, 23% no internet, 45+ min response.
- **The Core Mission:** "Healthcare access should not be determined by your postal code."
- **The Core Distinction:** "It's a **decision support tool**, not a diagnosis tool."
- **The Core Design:** "Offline-first, privacy-first, rural-first."
