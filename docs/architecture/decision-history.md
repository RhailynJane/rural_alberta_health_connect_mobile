# Architecture Decision History

## The Problem

We needed to build a healthcare app that runs AI models for medical triage. We had tough requirements:

- 2 developers + volunteers, 10 weeks to build
- Computer vision model must work on phones
- Users must stay logged in (no repeated logins)
- App must work without internet for the AI part
- Healthcare data needs proper logging for legal reasons

## Research Phase

### Option 1: Local AI Models
We looked into running AI models directly on phones. This meant the user's phone does the thinking, not a server.

**Good points:**
- No server costs for AI processing
- Works without internet
- User data stays private
- Fast responses

**Problems:**
- Hard to build and test
- Makes app much bigger
- Drains phone battery
- Complex setup process

### Option 2: Server-Based AI  
This meant sending images to our server to run the AI model.

**Good points:**
- Easier to build
- Smaller app size
- Consistent performance
- Easier to update models

**Problems:**
- Costs money for every image processed
- Needs internet connection
- Slower responses
- Privacy concerns

### Option 3: Offline-Everything Architecture
We researched building an app that works completely offline. Users could work without internet and sync later.

**Good points:**
- Very reliable
- Works in poor network areas
- Great user experience

**Problems:**
- Very complex to build
- Takes 6-12 months, not 3
- Hard to handle data conflicts
- Not suitable for medical apps (safety risks)

## Healthcare Reality Check

We realized something important: **medical triage should not happen offline**.

**Why offline is dangerous:**
- Legal liability if we give wrong advice
- No audit trail for medical decisions
- Can't verify user consent properly
- Medical regulations require oversight

**What we learned:**
- Users need internet connection for final decisions
- Local AI can give quick previews only
- All real medical advice must go through servers
- We need proper logging for legal protection

## Cost Analysis

**Server AI costs would be:**
- $0.01-0.10 per image
- With 1000 users doing 5 images daily = $1,500-15,000 per month
- This would kill our budget

**Local AI costs:**
- One-time development effort
- Zero ongoing costs
- Our 6MB model is perfect size for phones

## Technology Choices

### Backend: Stick with Convex
**Why we kept Convex:**
- Team already knows it well
- Handles authentication perfectly  
- Real-time data sync works great
- Good for audit logging
- No vendor lock-in concerns

**Why not other options:**
- Supabase: More complex setup, costs more
- Firebase: Risk of data loss with default settings
- Building our own: Too much work

### Local AI: React Native ExecuTorch
**Why this works:**
- Made by Meta (Facebook)
- Production-ready (powers real apps)
- Works with Expo development builds
- Clean, simple code to use
- Community support

**Key discovery:**
- Software Mansion library makes it easy
- No need to build native code ourselves
- Handles the hard parts for us

### Development: EAS Development Build
**Why we need this:**
- Expo Go can't run native AI code
- EAS builds custom app with our AI model
- Free tier gives us 30 builds per month
- Easy to share builds with team

## Proposed decision

### What we chose:
1. **Local AI model** runs on phone (instant feedback)
2. **Convex backend** handles everything else (auth, storage, compliance)
3. **Internet required** for all final medical decisions

### How it works:
1. User opens app → logs in via Convex
2. User takes photo → local AI shows quick preview
3. User must consent → Convex validates and stores everything
4. Audit trail created → legal protection

### Why this is smart:
- **Cost effective**: No server AI costs
- **Fast user experience**: Instant AI feedback
- **Legal protection**: All decisions logged properly
- **Simple to build**: Uses our existing skills
- **Fits timeline**: 10 weeks is realistic

## Trade-offs We Made

### What we gave up:
- Fully offline experience
- Simpler architecture options
- Using Expo Go for development

### What we gained:
- Legal safety and compliance
- Cost control (no ongoing AI server costs)
- Fast user experience
- Manageable complexity
- Team expertise alignment

## Timeline Constraints

**10 weeks breakdown:**
- week 1-2 : Get ExecuTorch working with our model
- Week 1-5 : Build core app features
- Week 3-9 : Testing, polish, compliance checks

**Why this timeline works:**
- Local AI saves us from building server infrastructure
- Convex handles complex backend parts
- react-native-executorch library does heavy lifting
- Team knows React Native (EXPO) and Convex already

## Risks We Accepted

1. **ExecuTorch learning curve**: New technology for team
2. **Model conversion**: Need to test our AI model works
3. **Development builds**: Slightly more complex than Expo Go
4. **EAS build limits**: Free tier might not be enough

## Risks We Avoided  

1. **Vendor lock-in**: Can local-host Convex if needed
2. **Ongoing server costs**: Local AI eliminates this
3. **Complex sync logic**: Network-required eliminates offline conflicts  
4. **Legal liability**: Server validation protects us
5. **Data loss**: Convex handles this properly

## Conclusion

This architecture balances our constraints perfectly:
- **Technical**: Uses proven tools within our skill set
- **Business**: Controls costs and reduces legal risks  
- **Timeline**: Achievable in 3 months with 2 people
- **Healthcare**: Meets compliance and safety requirements

The key insight was realizing that "offline" isn't always better. For healthcare, requiring internet connection for final decisions actually makes the app safer and easier to build.