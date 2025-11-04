# Alberta Offline Maps Coverage

## ✅ Complete Province Coverage Available

The app now supports **10 downloadable regions** covering all of Alberta, from major cities to rural areas.

---

## 📍 Available Regions

### 1. ⭐ **Entire Alberta Province** (Recommended for Rural Users)
- **Coverage**: Complete Alberta (49°N to 60°N, -120°W to -110°W)
- **Size**: 250-400MB
- **Best for**: Rural health workers, long-distance travelers, comprehensive coverage
- **Includes**: All highways, rural roads, small towns, and remote areas

### 2. **Calgary and Area**
- **Coverage**: Calgary metro + 50km radius
- **Size**: 15-25MB
- **Best for**: Calgary residents and surrounding communities

### 3. **Edmonton and Area**
- **Coverage**: Edmonton metro + 50km radius
- **Size**: 15-25MB
- **Best for**: Edmonton residents and surrounding communities

### 4. **Red Deer and Central Alberta**
- **Coverage**: Red Deer and central region
- **Size**: 10-15MB
- **Best for**: Central Alberta residents

### 5. **Lethbridge and Southern Alberta**
- **Coverage**: Lethbridge and southern region
- **Size**: 8-12MB
- **Best for**: Southern Alberta residents

### 6. **Medicine Hat and Southeast**
- **Coverage**: Medicine Hat and southeast region
- **Size**: 8-12MB
- **Best for**: Southeast Alberta residents

### 7. **Grande Prairie and Northwest**
- **Coverage**: Grande Prairie and northwest region
- **Size**: 8-12MB
- **Best for**: Northwest Alberta residents

### 8. **Fort McMurray and Northeast**
- **Coverage**: Fort McMurray and northeast region
- **Size**: 8-12MB
- **Best for**: Northeast Alberta residents

### 9. **Banff & Jasper National Parks**
- **Coverage**: Mountain parks and Highway 93 corridor
- **Size**: 20-30MB
- **Best for**: Mountain area residents and tourists

### 10. **Highway 2 Corridor (Calgary-Edmonton)**
- **Coverage**: Main highway between Calgary and Edmonton
- **Size**: 30-40MB
- **Best for**: Frequent travelers between major cities

---

## 💡 Recommended Download Strategy

### For Most Users:
**Download 1-2 city regions** (15-25MB each) for your area

### For Rural Health Workers:
**Download "Entire Alberta Province"** (250-400MB) for complete coverage

### For Budget Users (Limited Storage):
**Download only your city** + **Highway 2 Corridor** (if traveling)

---

## 📱 How Location Works

### GPS Location (Real-Time)
The app uses **GPS coordinates** from your device to:
- ✅ Find clinics near your **current location** (wherever you are right now)
- ✅ Show "You Are Here" marker on the map
- ✅ Update as you move around
- ✅ Perfect for emergencies when traveling

**Example**: 
- You're driving from Calgary to Edmonton
- GPS tracks your location: `51.0447,-114.0719`
- App shows clinics near your current position

### Profile Address (Home Base)
Your **profile address** (address1, city, province, postal code) is:
- ✅ Your home or primary location
- ✅ Used for personalized health information
- ✅ Stored in your profile (not used for real-time clinic search yet)

**Note**: Currently, clinic search uses GPS, not profile address. This makes sense for emergency scenarios where you need nearby help wherever you are.

---

## 🔋 Storage & Battery Impact

### Storage Space
- **Single city region**: 10-25MB
- **Full Alberta**: 250-400MB
- **All 10 regions**: ~500-600MB

### Battery Usage
- Offline maps use **minimal battery** (no data connection needed)
- GPS location tracking is the main battery consumer
- **Tip**: Enable location only when needed to save battery

---

## 🌐 Online vs Offline Mode

### Online Mode (Default)
- ✅ Always up-to-date clinic information
- ✅ Real-time data from Foursquare & OpenStreetMap
- ✅ Latest road changes
- ❌ Requires internet connection

### Offline Mode (After Download)
- ✅ Maps work without internet
- ✅ Perfect for rural areas with poor signal
- ✅ No data charges
- ⚠️ Clinic data still requires internet (unless cached locally)

---

## 🎯 Future Enhancement: Address-Based Search

Currently planned for future versions:

### What it will do:
1. Use your **profile address** as default search location
2. Show clinics near your home when you open the app
3. Switch to GPS location when traveling
4. Cache clinic data locally for true offline mode

### Why not now:
The current GPS-based system is more suitable for emergency scenarios where users need immediate nearby help, regardless of where they are.

---

## 📊 Comparison: City vs Full Province

| Feature | City Region | Full Province |
|---------|-------------|---------------|
| **Size** | 10-25MB | 250-400MB |
| **Coverage** | 50km radius | Entire Alberta |
| **Download Time** | 1-2 minutes | 5-10 minutes |
| **Best For** | Urban users | Rural workers |
| **Rural Coverage** | Limited | Complete |
| **Storage Impact** | Minimal | Moderate |

---

## ❓ FAQ

### Q: Do I need to download all regions?
**A:** No! Download only what you need. Most urban users need just 1 region.

### Q: Can I delete regions later?
**A:** Yes! Tap the trash icon in the Offline Maps downloader.

### Q: Does offline mode work everywhere?
**A:** Maps work offline, but clinic data currently needs internet. Full offline support coming soon.

### Q: How often should I update?
**A:** Redownload regions every 3-6 months for road updates.

### Q: Where do I access offline maps after I download them?
**A:** Open the Emergency tab. The map automatically uses your downloaded tiles when you're offline. Clinic markers show your last saved results. Directions may still need internet.

### Q: What about Saskatchewan or BC border areas?
**A:** The "All Alberta" region includes border areas. For cross-province coverage, we can add more regions.

---

## 🚀 Next Steps

1. **Get Mapbox tokens** (see `MAPBOX_SETUP_NEXT_STEPS.md`)
2. **Build the app** (`npx expo prebuild --clean && npx expo run:android`)
3. **Download your region** (tap "Offline Maps" in emergency page)
4. **Test offline** (enable airplane mode and verify map works)

---

**Need help?** Check `docs/offline-maps-mapbox.md` for detailed setup instructions.
