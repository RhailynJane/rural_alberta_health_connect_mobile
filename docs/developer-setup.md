# Developer Setup Guide

## What you need to do

### Step 1: Accept team invitation
Check your email for a Convex invitation. Click the link and accept it.

### Step 2: Install stuff
```bash
npm install
```

### Step 3: Connect to our backend
```bash
npx convex dev
```

This command does two things:
- Logs you into Convex
- Creates your `.env.local` file automatically

### Step 4: Start the app
```bash
npm start
```

## That's it!

You should see the app running. The Convex command created all the environment files you need.

## If something breaks

**Problem**: `npx convex dev` says "not authorized"  
**Fix**: Make sure you accepted the team invitation first

**Problem**: App won't start  
**Fix**: Make sure `.env.local` file exists (Step 3 should create it)

**Problem**: Still broken  
**Fix**: Ask for help in the team chat

## What the Convex command creates

The `npx convex dev` command creates a file called `.env.local`. This file has:
- Backend URL
- Project settings

You don't need to create this file yourself. The command does it for you.

## Important notes

- Never commit `.env.local` to git
- Run `npx convex dev` whenever you start working
- The backend connection stays active while the command runs