# Live/Cache Data Status Feature

---

## What It Does

🟢 **Live Data Indicator**
- Green badge: "Live data"
- Real-time from server
- Most current information

🟡 **Cached Data Indicator**
- Yellow badge: "Cached · 2h ago"
- Stored locally
- Shows how old data is

---

## Where It Appears

✅ **Clinic Search**
- Shows if clinic info is current

✅ **Emergency Info**
- Critical - users must know data age

✅ **Health Tracker**
- Indicates sync status

---

## Smart Behavior

**When Online:**
- Fetches fresh data
- Shows "Live" badge
- Updates automatically

**When Offline:**
- Uses cached data
- Shows "Cached · Xh ago"
- Clear visual distinction

**After Reconnection:**
- Syncs automatically
- Badge changes to "Live"
- User sees update happen

---

## Technology

**Network Detection:** NetInfo
**Cache Tracking:** AsyncStorage timestamps
**Real-time Updates:** Convex subscriptions

