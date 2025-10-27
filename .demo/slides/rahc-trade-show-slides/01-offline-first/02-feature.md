# Offline-First Architecture

---

## How It Works

📱 **Local-First Storage**
- Every action saves to device first
- Background sync when online
- Zero dependency on connection

🔄 **Bi-Directional Sync**
- Changes queue when offline
- Auto-sync when connection returns
- Conflict resolution built-in

---

## What Users Get

✅ Add health entries → **Works offline**
✅ View history → **Works offline**
✅ Search clinics → **Works offline** (cached)
✅ Use maps → **Works offline** (pre-downloaded)

---

## Tech Stack

**Frontend:** WatermelonDB (SQLite)
**Backend:** Convex (real-time sync)
**Strategy:** Write local → Sync later

