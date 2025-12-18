# Mapbox Offline Maps Setup Guide

## Overview

This app uses **Mapbox** for offline-capable maps, perfect for rural Alberta where connectivity may be limited.

## 🔑 Get Mapbox API Keys

### 1. Create Free Mapbox Account
Visit: https://account.mapbox.com/auth/signup/

### 2. Get Public Token
1. Go to https://account.mapbox.com/access-tokens/
2. Copy your **Default public token**
3. Add to `app/config/mapbox.config.ts`:
```typescript
export const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoi...'; // Your token here
```

### 3. Get Download Token (for offline packs)
1. Create a new secret token at https://account.mapbox.com/access-tokens/
2. Check: **DOWNLOADS:READ** scope
3. Add to `app.json`:
```json
{
  "RNMapboxMapsDownloadToken": "sk.eyJ1Ijoi..." // Your secret token
}
```

## 🏗️ Build Requirements

### After adding Mapbox:

```bash
# Clean and rebuild
npx expo prebuild --clean

# Build for Android
npx expo run:android

# Or for iOS
npx expo run:ios
```

**Note:** Mapbox requires native code, won't work with Expo Go!

## 📥 Offline Map Download

### User Flow:
1. User opens Emergency page
2. Clicks "Download Offline Maps" button
3. Selects their region (Calgary, Edmonton, etc.)
4. App downloads map tiles for offline use
5. Maps work without internet connection

### Storage Requirements:
- Each region: ~10-50 MB
- Recommend downloading on WiFi
- Maps stored on device permanently

## 🗺️ Supported Regions

Alberta regions available for offline download:
- Calgary and Area
- Edmonton and Area
- Red Deer and Central Alberta
- Lethbridge and Southern Alberta
- Medicine Hat and Southeast
- Grande Prairie and Northwest
- Fort McMurray and Northeast

## 🔧 Configuration

### Adjust Download Size
In `app/config/mapbox.config.ts`:

```typescript
export const OFFLINE_PACK_CONFIG = {
  maxTileCount: 6000,  // Increase for larger areas
  minZoom: 10,         // Lower = less detail, smaller size
  maxZoom: 15,         // Higher = more detail, larger size
};
```

### Change Map Style
```typescript
export const DEFAULT_MAP_CONFIG = {
  style: MAPBOX_STYLES.outdoors, // Better for rural areas
  // or
  style: MAPBOX_STYLES.streets,  // Better for cities
};
```

## 🚀 Usage in Code

### Display Map with Clinics:
```tsx
import MapboxOfflineMap from '@/app/components/MapboxOfflineMap';

<MapboxOfflineMap
  clinics={nearestClinics}
  userLocation={userLocation}
  onClinicPress={(clinic) => {
    // Handle clinic selection
  }}
/>
```

### Download Manager:
```tsx
import OfflineMapDownloader from '@/app/components/OfflineMapDownloader';

const [showDownloader, setShowDownloader] = useState(false);

<OfflineMapDownloader
  visible={showDownloader}
  onClose={() => setShowDownloader(false)}
/>
```

## ✅ Benefits for Rural Alberta

1. **Works Offline**: Maps cached on device
2. **Small Size**: ~10-50MB per region
3. **Better Coverage**: More rural road data than Google Maps
4. **Fast Loading**: No network delays
5. **Emergency Ready**: Critical for health emergencies

## 🔍 Troubleshooting

### Map not loading?
- Check Mapbox token in `mapbox.config.ts`
- Verify internet connection for first load
- Rebuild app after configuration changes

### Download failing?
- Ensure WiFi connection
- Check device storage space
- Verify download token in `app.json`

### Markers not showing?
- Verify clinic data has latitude/longitude
- Check console for errors
- Ensure map is fully loaded

## 📚 Additional Resources

- [Mapbox Documentation](https://docs.mapbox.com/)
- [React Native Mapbox](https://github.com/rnmapbox/maps)
- [Offline Maps Guide](https://docs.mapbox.com/ios/maps/guides/offline/)

## 🆚 Comparison with Google Maps

| Feature | Mapbox | Google Maps |
|---------|--------|-------------|
| Offline Support | ✅ Native | ⚠️ Limited |
| Rural Coverage | ✅ Excellent | ⚠️ Good |
| File Size | ✅ 10-50MB | ❌ 100-500MB |
| Free Tier | ✅ 50k requests/mo | ❌ Paid only |
| Customization | ✅ Full control | ⚠️ Limited |

## 💰 Pricing (Mapbox Free Tier)

- **50,000 map loads/month** - FREE
- Perfect for pilot/testing
- Upgrade only if you exceed limits

---

**For Alberta Health Connect - Rural Emergency Services** 🏥
