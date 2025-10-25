# Rural Alberta Health Connect (RAHC)

![RAHC Logo](./assets/images/icon.png)

**Pronounced:** "Rock"  
**Tagline:** Healthcare access shouldn't depend on your postal code

**Official Website:** [https://rahc-website.vercel.app/](https://rahc-website.vercel.app/)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Vision Statement](#vision-statement)
- [Philosophical Foundation](#philosophical-foundation)
- [Technical Work](#technical-work)
- [Research & Analysis](#research--analysis)
- [Technical Requirements](#technical-requirements)
- [Design System](#design-system)
- [Emerging Trends](#emerging-trends)
- [Mindset Requirements](#mindset-requirements)
- [Getting Started](#getting-started)
- [Project Details](#project-details)
- [Join Us](#join-us)

---

## 🎯 Project Overview

Rural Alberta Health Connect delivers AI-powered healthcare guidance to rural communities where the nearest specialist is often 200km away and emergency response times exceed 45 minutes. Using multi-modal AI that analyzes both symptom descriptions and photos, the platform provides 24/7 health assessments and emergency coordination—even with limited internet connectivity. RAHC aims to ensure healthcare access is no longer determined by postal code.

---

## 🌟 Vision Statement

We believe no one should have to gamble with their health because they live far from a hospital. Our vision is a Canada where rural families never hesitate to seek health advice due to distance, cost, or uncertainty—where a farmer can get reliable symptom assessment at 2 AM, where a parent can confidently decide if their child needs emergency care, and where Indigenous communities have culturally sensitive healthcare tools that respect their unique needs. 

RAHC is the beginning of rural-first healthcare technology that doesn't just adapt urban solutions, but builds specifically for rural realities. 

**The long-term impact?** Lives saved, unnecessary ER visits prevented, healthcare costs reduced, and rural communities empowered with the same health security urban Canadians take for granted.

---

## 🧭 Philosophical Foundation

### Technology as Supplement, Never Substitute

RAHC is built on a foundational principle: **we supplement healthcare, we never replace it.** We don't replace doctors—we help rural Albertans navigate TO appropriate care and make informed decisions between professional consultations. Our AI guides, not diagnoses; connects, not replaces; informs, not prescribes.

#### What This Means in Practice

When someone uses RAHC at 2 AM with concerning symptoms, our AI doesn't tell them what they have—it helps them decide their next step. Should they drive to emergency now? Wait until morning to call their doctor? Monitor at home? We're a compass pointing toward appropriate care, not a destination.

This distinction is critical. Rural communities face real provider shortages, but the solution isn't AI doctors—it's real healthcare infrastructure investment AND better tools to navigate existing systems. RAHC refuses to be a band-aid that lets policymakers ignore systemic rural healthcare deficiencies.

#### Respecting Medical Expertise and Rural Communities

Our supplementary approach means RAHC works WITH the healthcare ecosystem, not against it. We help users track symptoms to share with their doctors, connect them to emergency services when needed, and locate nearby healthcare facilities. We're building health literacy and confidence so rural Albertans can have better conversations with their providers and make more informed decisions in between consultations.

This isn't just ethical design—it's respect. Respect for medical expertise that can't be replaced by algorithms. Respect for rural communities who deserve honest technology, not false promises. Respect for the truth that rural Albertans need real healthcare access, not just technological workarounds.

#### Responsibility in Vulnerable Moments

Because RAHC supplements healthcare decisions during vulnerable moments—when people are worried, isolated, or have limited options—we carry extraordinary responsibility. Our AI must be culturally sensitive, work equitably across diverse populations including Indigenous communities, and always be transparent about its limitations. We're not disrupting healthcare; we're smoothing the rough edges of accessing it from remote locations.

#### The Long-Term Vision

We're building a bridge to better care, not pretending to be the destination. Our success isn't measured by how much we replace healthcare providers, but by how effectively we connect rural Albertans to appropriate care and empower them with information. If RAHC helps someone avoid an unnecessary ER trip while ensuring someone else gets emergency care faster, we've succeeded—not by replacing the system, but by making it more navigable for rural populations who've been underserved for too long.

---

## 💻 Technical Work

RAHC is a full-stack mobile health platform combining React Native frontend, real-time cloud infrastructure, and AI/ML systems designed for rural connectivity constraints.

### Frontend Development (React Native)

Building a cross-platform mobile application with offline-first architecture:

- **Offline-First Data Architecture:** Using WatermelonDB for local data persistence with automatic sync to Convex when connectivity returns
- **Data Encryption:** Implementing platform-specific encryption for sensitive health data on both iOS and Android
- **Offline Maps:** Integrating Mapbox for location services that work without internet—critical for finding healthcare facilities in remote areas
- **Accessible Healthcare UI:** Creating intuitive interfaces for diverse users from tech-savvy teenagers to older adults
- **Camera Integration:** Developing image capture for symptom documentation
- **Multi-Step Onboarding:** Building flows for personal information, emergency contacts, and medical history with validation

### Backend Infrastructure (Convex Real-Time Database)

Building serverless backend for healthcare data:

- **Real-Time Synchronization:** Bidirectional sync between WatermelonDB and Convex that handles offline queuing and conflict resolution
- **Healthcare Data Operations:** API endpoints for symptom logging, health tracking, and emergency contacts with healthcare-grade security
- **Location-Aware Services:** Distance calculations for healthcare facility matching using offline map data
- **Secure Authentication:** User registration and login with Convex Auth
- **Automated Backups:** Recovery systems for critical health data

### AI/Machine Learning Systems

Building multi-modal AI for limited connectivity:

- **YOLO Object Detection:** Training computer vision to identify visual symptoms (rashes, swelling, wounds) with mobile-optimized models
- **Natural Language Processing:** Text analysis that parses symptom descriptions and assesses urgency
- **Multi-Modal Integration:** Combining text and image analysis for comprehensive assessment
- **Edge Computing:** Running AI locally on devices when offline

### Health Tracking & Emergency Services

- **Daily Health Logging:** Tracking symptoms, severity, and medications with trend visualization
- **Offline Healthcare Finder:** Searchable facility database using Mapbox that works without internet
- **Emergency Alerts:** Location-sharing and medical history access for emergency contacts

### Security and Compliance

- **End-to-End Encryption:** For all data transmission and storage (iOS/Android native encryption)
- **Privacy Controls:** Granular permissions for data sharing
- **Compliance:** HIA and PIPEDA validation
- **Security Testing:** Penetration testing and vulnerability assessments

### Key Technical Challenges

- **AI with Poor Connectivity:** Model compression and edge computing for offline ML
- **Offline-First Sync:** Conflict resolution between WatermelonDB and Convex
- **Algorithmic Fairness:** Diverse training data and bias detection across populations
- **Cross-Platform Encryption:** Secure data storage on both iOS and Android

### Development Stack

- **Frontend:** React Native, WatermelonDB (offline database), Mapbox (offline maps)
- **Backend:** Convex (real-time database), Convex Auth
- **AI/ML:** YOLO (computer vision), NLP, custom symptom assessment
- **Security:** iOS Keychain/Android Keystore for encryption

---

## 📊 Research & Analysis

Beyond coding, RAHC requires extensive research, analysis, and documentation to ensure our solution meets healthcare standards and serves rural communities effectively.

### Healthcare & Regulatory Research

Navigating the complex healthcare compliance landscape:

- **HIA and PIPEDA Compliance Research:** Analyzing Health Information Act and privacy legislation requirements to ensure legal compliance for health data handling
- **Rural Healthcare Gap Analysis:** Studying statistics on rural healthcare access, emergency response times, specialist availability, and digital infrastructure to validate our problem statement

### AI Ethics & Bias Research

Ensuring responsible AI development:

- **Training Data Requirements:** Researching diverse medical imaging datasets and annotation standards to build AI that works across different skin tones, ages, and symptom presentations
- **Bias Mitigation Strategies:** Analyzing approaches to detect and prevent algorithmic bias in healthcare AI systems

### Technical Documentation & Analysis

Creating comprehensive project documentation:

- **System Architecture Documentation:** Documenting technical architecture decisions, data flows, and integration patterns for offline-first mobile health systems
- **API Documentation:** Writing clear documentation for backend endpoints, data models, and authentication flows
- **Sprint Planning & Analysis:** Conducting sprint retrospectives, analyzing progress against milestones, and adjusting project timelines based on technical challenges
- **Technical Decision Records:** Documenting why we chose specific technologies (WatermelonDB vs alternatives, Mapbox for offline maps, YOLO for computer vision)

### Competitive Analysis & Market Research

Understanding the digital health landscape:

- **Existing Telehealth Solutions:** Analyzing current telemedicine platforms to identify gaps in rural-first design and offline functionality
- **Rural Technology Adoption Patterns:** Researching how rural communities adopt and use health technology to inform UX decisions
- **AI-Powered Health Apps:** Evaluating competitors using AI for symptom assessment to understand best practices and differentiation opportunities

### UX/UI Design Research

Informing user-centered design decisions:

- **Healthcare Interface Standards:** Researching accessibility guidelines, medical interface conventions, and health literacy best practices
- **Rural User Personas:** Developing user personas representing diverse rural Albertans—different ages, digital literacy levels, and healthcare needs
- **Usability Heuristics:** Analyzing healthcare-specific usability principles to design interfaces that work under stress (when users are worried about symptoms)
- **Design System Documentation:** Creating style guides, component libraries, and design principles that ensure consistency across the platform

### Content & Communication

Developing clear, accessible communication:

- **Health Content Writing:** Crafting symptom guidance, emergency protocols, and health education content that's medically accurate but accessible to non-experts
- **User Guide Development:** Writing documentation that helps rural users understand how to use RAHC effectively
- **Healthcare Provider Materials:** Creating integration guides for doctors and clinics who want to receive patient data from RAHC
- **Project Presentations:** Preparing demo materials, pitch decks, and documentation that communicate RAHC's value to stakeholders

This research and analysis work ensures RAHC isn't just technically sophisticated but also legally compliant, ethically sound, and genuinely useful for the rural communities we're serving.

---

## 🔧 Technical Requirements

### Programming Languages

- **TypeScript** (~5.9.2): Primary language for type-safe development across frontend and backend
- **JavaScript**: Configuration and legacy components
- **Java/Kotlin**: Android native modules and build configuration

### Mobile Development

- **React Native** (v0.81.4): Cross-platform mobile app development
- **React** (v19.1.0): UI component library
- **Expo** (v54.0.12): Development platform and SDK for native features
- **Expo Router** (~6.0.10): File-based navigation system

### Database & Backend

- **WatermelonDB** (@nozbe/watermelondb v0.28.0): Offline-first local database with SQLite adapter
- **Convex** (v1.27.3): Real-time backend-as-a-service
- **Convex Auth** (@convex-dev/auth v0.0.89): Authentication system
- **Async Storage** (v2.2.0): Local key-value storage

### AI/Machine Learning

- **TensorFlow Lite** (react-native-fast-tflite v1.6.1): On-device ML inference
- **YOLOv8** (via TensorFlow Lite): Object detection for symptom image analysis
- **Google Gemini AI**: Multi-modal AI for symptom assessment
- **React Native ExecuTorch** (v0.5.8): PyTorch mobile runtime

### Camera & Computer Vision

- **React Native Vision Camera** (v4.7.2): Camera access and image capture
- **Vision Camera Resize Plugin** (v3.2.0): Image preprocessing
- **React Native Worklets** (v0.5.1): High-performance camera processing

### Location & Mapping

- **Mapbox Maps** (@rnmapbox/maps v10.2.6): Offline maps, geocoding API
- **Expo Location** (~19.0.7): GPS and location tracking
- **React Native NetInfo** (v11.4.1): Network connectivity monitoring

### Form Management & Validation

- **Formik** (v2.4.6): Form state management
- **Yup** (v1.7.0): Schema validation

### Security

- **Bcrypt.js** (v3.0.2): Password hashing
- **Expo Secure Store** (~15.0.7): Encrypted local storage
- **Auth Core** (@auth/core v0.37.0): Authentication framework

### Build Tools

- **Gradle**: Android build system
- **EAS Build**: Expo Application Services for CI/CD
- **Metro Bundler**: React Native bundler
- **Babel**: Transpilation
- **TypeScript Compiler**: Type checking

### External Services & APIs

- **Convex Cloud**:
  - Production: `energized-cormorant-495.convex.cloud`
  - Development: `judicious-pony-253.convex.cloud`
- **Mapbox API**: Geocoding and offline tile downloads
- **Google Gemini AI**: Symptom assessment and image analysis
- **Resend/Brevo** (v6.2.2): Email notifications (OTP, password reset)

### Platform Requirements

- **Android**: Minimum SDK 26 (Android 8.0+)
- **Node.js**: v16.17.4+
- **Expo CLI**: Latest version

### Key Technical Skills Required

- **Offline-First Architecture**: Building apps that sync seamlessly when connectivity returns
- **Real-Time Data Sync**: Managing bidirectional synchronization with conflict resolution
- **Mobile AI Deployment**: Running ML models efficiently on resource-constrained devices
- **Healthcare Data Security**: Encryption and privacy controls for sensitive information
- **Camera & Vision APIs**: Image capture and processing for symptom analysis
- **Maps Integration**: Offline map tiles and location services
- **Form Validation**: Complex multi-step forms with data validation
- **Native Module Integration**: Working with platform-specific APIs

---

## 🎨 Design System

### Typography

All font variants come from the **Barlow Semi Condensed** family via `@expo-google-fonts/barlow`, providing a cohesive and professional typography system optimized for mobile healthcare applications.

#### Heading Font
**Barlow Semi Condensed Bold (800 ExtraBold)**

Used for section headings, card titles, modal dialog headers, button text, notification titles, and important emphasis text throughout the application. Appears in sizes ranging from 16-28px with font weights of 600-800, providing clear visual hierarchy for interactive elements and content sections.

#### Body Font
**Barlow Semi Condensed (700 SemiBold)**

Used for all body text, form labels, input fields, descriptions, list items, general UI text, subtitles, and paragraph content across the application. Typically appears in sizes from 12-20px with font weights of 400-600, ensuring readability for all content and user input areas.

#### Accent Font
**Barlow Semi Condensed Extra Bold (900 Black)**

Used for hero text like the app logo "Alberta Health Connect", large welcome messages on the dashboard, primary call-to-action buttons, major page titles, and emphasized statistics. Appears in sizes from 20-32px with font weights of 700-900, creating strong visual impact for the most important content and branding elements.

### Color Palette

The color palette follows healthcare design principles: trust & professionalism, clear status communication, accessibility, calming aesthetic, consistent hierarchy, and medical context alignment.

#### Primary Colors

| Color | Hex Code | Usage | Adjectives |
|-------|----------|-------|------------|
| **Primary Blue** | `#2A7DE1` | Primary action buttons, links, active navigation states, icons, health score displays | trustworthy, medical, interactive, professional, clinical |
| **iOS Blue** | `#007AFF` | Alternative primary color for iOS-style elements | bright, modern, familiar, accessible, clean |
| **White** | `#FFFFFF` | Card backgrounds, modal surfaces, input fields, button text | clean, spacious, clinical, clear, medical |

#### Secondary Colors

| Color | Hex Code | Usage | Adjectives |
|-------|----------|-------|------------|
| **Success Green** | `#28A745` | Success states, health status indicators (Good/Excellent), progress bars | healthy, positive, successful, reassuring, safe |
| **Error Red** | `#DC3545` | Error messages, emergency buttons, critical alerts, high severity indicators | urgent, alert, critical, emergency, warning |
| **Warning Yellow** | `#FFC107` | Warning messages, moderate severity indicators, disclaimer backgrounds | caution, attention, moderate, advisory, noteworthy |

#### Accent Colors

| Color | Hex Code | Usage | Adjectives |
|-------|----------|-------|------------|
| **Teal/Info** | `#17A2B8` | "Excellent" health status tags, informational elements | informative, calm, medical, balanced, clinical |
| **Soft Gray** | `#6C757D` | Unknown/default health status, secondary buttons, disabled states | neutral, balanced, subtle, secondary, informational |

#### Background Colors

| Color | Hex Code | Usage | Adjectives |
|-------|----------|-------|------------|
| **Light Gray** | `#F8F9FA` | Main app background, screen backgrounds, section backgrounds | soft, neutral, comfortable, clean, spacious |
| **Curved Header** | `#B8C6D1` | Curved header component background across all screens | calm, medical, soft, professional, soothing |
| **Light Blue** | `#E8F2FF` / `#E6F4FE` / `#F0F8FF` | Feature cards, icon backgrounds, quick action buttons | airy, clean, medical, calming, gentle |

#### Functional Colors

**Text Colors:**
- Primary Text: `#1A1A1A` / `#1C1C1E`
- Secondary Text: `#666` / `#666666`
- Placeholder: `#999`
- Light Gray Text: `#8E8E93`
- Dark Text: `#2c3e50`

**Border & Divider Colors:**
- Light Border: `#E9ECEF` / `#E0E0E0`
- Medium Border: `#E5E7EB` / `#DEE2E6`
- Light Divider: `#EEE` / `#F1F1F1`

**Status-Specific Colors:**
- Offline Orange: `#FFA500`
- Success Light: `#10B981`
- Error Light: `#EF4444`
- Blue Accent: `#3B82F6`
- Warning Background: `#FFF3CD`
- Warning Border: `#FFEAA7`
- Warning Text: `#856404`
- Emergency Background: `#F8D7DA`
- Emergency Border: `#F5C6CB`
- Emergency Text: `#721C24`

#### Severity-Based Color System

| Severity Range | Color | Hex Code | Meaning |
|----------------|-------|----------|---------|
| **1-3** | Green | `#28A745` | Mild/Low |
| **4-6** | Yellow | `#FFC107` | Moderate |
| **7-10** | Red | `#DC3545` | Severe/Critical |

---

## 🔮 Emerging Trends

### Technical Emerging Trends

#### ✅ Currently Implemented

1. **Artificial Intelligence**
   - Google Gemini AI integration for symptom assessment
   - Multi-modal AI analysis (text + images)
   - AI-powered health triage system

2. **Machine Learning**
   - YOLOv8 object detection for symptom image analysis
   - On-device ML inference using TensorFlow Lite
   - React Native ExecuTorch for PyTorch mobile runtime

3. **Computer Vision**
   - React Native Vision Camera for image capture
   - Vision camera resize plugin for image preprocessing
   - Automated visual symptom detection

4. **Edge Computing**
   - On-device ML model execution (TensorFlow Lite)
   - Local database processing with WatermelonDB
   - Offline-first architecture with local computation

5. **Cloud Computing**
   - Convex real-time backend-as-a-service
   - Cloud-based data synchronization
   - Scalable serverless architecture

6. **Big Data Analytics**
   - Health entry tracking and analysis
   - Weekly health score calculations
   - Symptom pattern recognition over time

7. **Internet of Things (IoT)**
   - GPS location services for clinic mapping
   - Device sensors (camera, location, notifications)
   - Real-time health data collection from mobile devices

8. **Cybersecurity**
   - Expo Secure Store for encrypted local storage
   - Bcrypt.js for password hashing
   - Secure authentication with @convex-dev/auth

9. **Natural Language Processing**
   - Gemini AI conversational symptom assessment
   - Text analysis of health descriptions
   - AI-generated health recommendations

10. **DevOps/MLOps**
    - EAS Build for CI/CD
    - Expo Application Services deployment
    - Automated build and distribution pipelines

11. **Offline-First Architecture** ⭐ *(Key Innovation)*
    - WatermelonDB for robust offline data persistence
    - SQLite local database with sync capabilities
    - Critical for rural areas with intermittent connectivity

12. **Geospatial Technology**
    - Mapbox integration for offline maps
    - GPS-based clinic location services
    - Rural healthcare facility mapping

13. **Real-Time Synchronization**
    - Convex real-time data sync
    - Bidirectional data flow when online
    - Conflict resolution for offline changes

14. **Mobile-First Healthcare (mHealth)**
    - Smartphone-based health interventions
    - Mobile symptom tracking
    - Digital health records on devices

#### 🔮 Potentially Relevant (Not Yet Implemented)

15. **5G/6G Networks**
    - Could enable faster real-time telehealth consultations
    - Improved remote diagnostics with high-quality video streaming

16. **Biometrics**
    - Future: Fingerprint/Face ID for secure authentication
    - Future: Health data from wearables integration

### Non-Technical Emerging Trends

#### ✅ Currently Addressed

1. **Digital Divide** ⭐ *(Core Focus)*
   - Bridging healthcare access gap in rural Alberta
   - Offline maps for areas without internet
   - Cached data functionality for limited connectivity
   - Reducing reliance on physical clinic visits

2. **Digital Accessibility**
   - Mobile-first design for rural populations
   - Offline functionality for areas with poor connectivity
   - Simplified UI for diverse user demographics

3. **Privacy Concerns**
   - Local-first data storage
   - No data sharing without explicit consent
   - PIPEDA, HIPAA, and Alberta Health compliance
   - Encrypted secure storage

4. **Ethical AI**
   - Clear disclaimers about AI limitations
   - "Not a substitute for professional medical advice"
   - Transparent AI assessment process
   - Bias minimization in ML models

5. **Digital Wellness**
   - Health tracking and self-assessment tools
   - Empowering users with health information
   - Proactive symptom monitoring
   - Mental and physical health support

6. **Healthcare Equity** ⭐ *(Primary Mission)*
   - Reducing urban-rural healthcare disparities
   - Democratizing access to medical guidance
   - Addressing transportation barriers

7. **Telehealth/Digital Health Adoption**
   - Acceleration post-pandemic
   - Rural healthcare transformation
   - Virtual-first medical consultations

8. **Patient Empowerment**
   - Self-assessment tools
   - Personal health data ownership
   - Proactive health management

9. **Health Literacy**
   - Educating users about symptoms and conditions
   - Empowering informed healthcare decisions
   - Simplified medical information

10. **Data Sovereignty**
    - User data ownership and control
    - Local data storage prioritization
    - Canadian data residency considerations

#### 🔮 Potentially Relevant

11. **Misinformation/Disinformation**
    - Risk: AI-generated health advice could be misinterpreted
    - Mitigation: Clear disclaimers and emergency protocols
    - Need for verified medical information sources

12. **Content Moderation**
    - Future: User-generated health reports and community features
    - Ensuring appropriate health information sharing

### Most Critical Unique Trends

**Offline-First Architecture** (Technical) + **Healthcare Equity/Digital Divide** (Non-Technical) - These are the defining characteristics that differentiate this project and address the specific needs of rural Alberta communities.

---

## 🧠 Mindset Requirements

### Responsibility-Driven Development

Healthcare technology demands a different mindset than typical apps. Our code could influence life-or-death decisions, requiring extreme care over speed where quality and reliability trump rapid deployment when health is at stake. We need humility about limitations, being honest that we supplement healthcare and never replace it. Every decision requires ethical awareness, constantly asking "could this cause harm?" and prioritizing user safety above all else.

### User-Centered Empathy

RAHC serves vulnerable populations facing real constraints. Success demands rural context understanding, recognizing slow internet, limited healthcare options, and economic pressures as real barriers, not just technical problems. We must design for stress, building for the parent at 2 AM worried about their child, not abstract personas. This requires accessibility without condescension, serving diverse users from tech-savvy teens to seniors with limited digital literacy, while maintaining cultural sensitivity that respects different healthcare perspectives, especially for Indigenous communities.

### Problem-Solving Resilience

Building offline-capable, AI-powered rural healthcare technology requires comfort with complexity, juggling offline sync, mobile AI, healthcare compliance, and algorithmic fairness simultaneously. We need persistence through obstacles, pushing through API failures, model underperformance, and sync conflicts. Success comes from creative constraint thinking, seeing rural limitations like slow internet and limited resources as innovation opportunities rather than roadblocks. Learning agility is essential, requiring willingness to dive into unfamiliar domains including healthcare regulations, computer vision, and offline architecture.

### Equity and Justice Orientation

RAHC addresses healthcare inequality, requiring systems thinking that understands rural healthcare access as a justice issue, not just a technical problem. We must maintain commitment to fairness, actively preventing algorithmic bias across diverse populations and skin tones. Our fundamental principle is supplement, not replace, building technology that bridges gaps while advocating for real infrastructure investment. Mission-driven focus means measuring success by lives improved, not just features built.

### Collaborative and Pragmatic

Success requires clear communication, explaining technical decisions, documenting thoroughly, and asking for help when needed. Interdisciplinary thinking is crucial, understanding how frontend, backend, AI, and UX decisions interconnect. Sprint discipline keeps us accountable to deadlines and the team. We embrace the principle that good enough beats perfect, shipping functional features that help people now rather than endlessly perfecting. Graceful failure planning ensures our systems fail safely so if GPS fails or AI is uncertain, users still get helpful guidance.

### Core Attitudes

We're responsible innovators, pushing technical boundaries while maintaining ethical guardrails. We're bridge-builders, connecting technical possibilities with human needs. We prioritize system reliability and user trust over flashy features. We think about edge cases, failure modes, and real-world implementation challenges. We measure success by impact on rural communities, not technical sophistication alone.

---

## 🚀 Getting Started

### How Do Students Begin?

#### Week 1: Project Familiarization & Environment Setup

Start by reading the complete project documentation to understand RAHC's mission, technical architecture, and rural-first design philosophy. Review the problem statement, gap analysis, and why healthcare access shouldn't depend on postal codes. Understanding the "why" behind technical decisions is crucial.

Set up your development environment by installing Node.js, Expo CLI, Android Studio, and Git. Clone the project repository and run the mobile app locally to see what's already built. Configure your Convex backend connection for development and ensure you can successfully run the app on an Android emulator or physical device.

#### Week 2: Team Integration & First Contributions

Attend sprint planning to understand current priorities and how your work fits into the bigger picture. Meet with team members to discuss their roles, ongoing work, and where you can contribute most effectively.

Choose a small, well-defined task to make your first contribution—perhaps fixing a UI bug, improving documentation, or adding a simple feature. This helps you understand the development workflow, code review process, and how different parts of the system interact (frontend, backend, AI) without overwhelming complexity.

#### Week 3-4: Deep Dive Into Your Focus Area

Based on your skills and interests, choose a focus area: frontend development (React Native, offline architecture), backend infrastructure (Convex, data sync), AI/ML (YOLO training, symptom assessment), or design (UX research, accessibility). Begin taking on more substantial tasks in your area while staying aware of how your work integrates with other components.

Start participating in sprint retrospectives, sharing progress, and asking questions. Healthcare technology is complex—there's no expectation you'll know everything immediately. The team succeeds when everyone communicates openly about challenges and learning needs.

### Key First Steps Summary

- Read all project documentation thoroughly
- Set up development environment and run the app locally
- Understand the mission and rural-first design philosophy
- Make a small first contribution to learn the workflow
- Choose a focus area aligned with your skills and interests
- Communicate regularly with the team and ask questions
- Remember: you're building technology that could influence real health decisions, so prioritize responsibility and quality from day one

### Resources You'll Need

- Project repository access (Git/GitHub)
- Convex development environment credentials
- Mapbox API keys for offline maps
- Access to project documentation and sprint planning tools
- Communication channels (team meetings, messaging platforms)

### Ongoing Expectations

- Participate in weekly sprint planning and retrospectives
- Document your work clearly for other team members
- Test thoroughly, especially features related to health assessment or emergency services
- Raise ethical concerns or potential safety issues immediately
- Stay aligned with the project's core principle: supplement healthcare, never replace it

---

## 📅 Project Details

### Duration
10 weeks, structured as 3 sprints

### Deliverable Options

#### Technical Deliverables
- Working mobile application (Android)
- AI/ML models for symptom detection (YOLO computer vision, NLP text analysis)
- Offline-first database architecture with sync implementation
- Backend API and real-time database system
- Offline maps integration with healthcare facility finder
- Multi-step onboarding and authentication system
- Health tracking and data visualization features
- Emergency services integration with location-based alerts

#### Research & Documentation Deliverables
- Technical documentation (system architecture, API references, deployment guides)
- User guide and healthcare provider integration manual
- HIA and PIPEDA compliance documentation
- Sprint retrospectives and project analysis
- Competitive analysis of existing telehealth solutions

#### Design Deliverables
- Complete UI/UX design system and component library
- User flow diagrams and wireframes
- Rural user personas and use case scenarios

### Ideal Student Profile

#### You might LOVE this project if...

- You want to work on meaningful technology with real social impact for underserved communities
- You enjoy challenges at the intersection of mobile development, AI/ML, and healthcare ethics
- You're excited about solving hard problems like making sophisticated AI work with poor internet connectivity
- You care about building responsibly—prioritizing algorithmic fairness, accessibility, and user safety
- You're a strong collaborator who communicates clearly and thrives in team environments
- You're pragmatic about balancing idealism with real-world constraints and iterating based on user needs

#### Not Ideal For

You'll likely struggle or find this unfulfilling if...

- You're primarily interested in cutting-edge tech for its own sake rather than solving real human problems
- You prefer fast-paced development where you can "move fast and break things" without considering consequences
- You're uncomfortable with the weight of building healthcare technology that could influence life-or-death decisions
- You want to work independently and avoid the coordination required in collaborative, interdisciplinary teams
- You're looking for clearly defined problems with straightforward solutions rather than ambiguous, complex challenges
- You're uncomfortable navigating ethical gray areas or having technology limitations imposed by safety considerations
- You want a purely technical project without dealing with healthcare compliance, algorithmic fairness, or accessibility requirements
- You prefer building consumer apps focused on commercial success rather than social impact
- You're not willing to learn multiple unfamiliar domains simultaneously (mobile development, AI/ML, offline architecture, healthcare regulations)
- You find it frustrating when user needs and safety concerns override technical possibilities
- You want predictable sprint outcomes rather than dealing with the uncertainty of rural-first, offline-capable AI development

---

## 💪 Join Us

### Join Us in Building Healthcare Technology That Actually Matters

Most student projects end up as portfolio filler. RAHC is different. This is your chance to build technology that could genuinely help people make better healthcare decisions when they're hours away from the nearest doctor.

Rural Albertans shouldn't have to choose between "toughing it out" or driving 200km to see if a symptom is serious. We're building AI-powered mobile technology that bridges this gap—combining computer vision, offline-first architecture, and real-time sync to bring 24/7 health guidance to communities that need it most.

#### This Is Hard, This Is Real

You'll work on technically ambitious challenges: making sophisticated AI work with poor internet, ensuring algorithmic fairness across diverse populations, building healthcare technology that people depend on. These aren't problems with easy Stack Overflow answers. But if you want to stretch your abilities on something that genuinely matters, this is it.

#### What You'll Gain

Real-world experience in mobile development, AI/ML, offline architecture, and healthcare technology. Skills that demonstrate you can tackle complex social challenges, not just write code. A portfolio piece showing you care about impact, not just innovation. Most importantly, you'll build something that serves underserved communities rather than extracting value from them.

#### We Need You

We're looking for students who care about equity and justice, who want to be responsible innovators, who understand healthcare technology carries weight. People who design with empathy, balance ambition with ethics, and measure success by lives improved.

**Healthcare access shouldn't depend on your postal code. Help us change that.**

Ready to make an impact? Join the Rural Alberta Health Connect team and build something that genuinely matters.

---

## 📞 Contact

**Project Lead:** Rhailyn Jane Cona  
**Email:** rhailynjane.cona@edu.sait.ca

**Team Member:** Yue Zhou  
**Email:** Yue.Zhou@edu.sait.ca

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the `LICENSE` file for details.

---

## 🙏 Acknowledgments

Special thanks to rural Alberta communities, healthcare providers, and everyone committed to making healthcare access equitable across all postal codes.

---

**Built with ❤️ for rural Alberta**
