# Code: Offline Maps Implementation

---

## 1. Region Configuration

```typescript
// app/_config/mapbox.config.ts
export const ALBERTA_REGIONS = [
  {
    id: 'calgary',
    name: 'Calgary & Area',
    description: 'Calgary, Airdrie, Okotoks, Cochrane',
    bounds: [[-114.50, 50.70], [-113.50, 51.30]],
    estimatedSize: '25-40MB',
  },
  {
    id: 'edmonton',
    name: 'Edmonton & Area',
    // ... more regions
  },
];
```

**What this does:**
- Defines downloadable regions
- Sets geographic boundaries
- Estimates download size

---

## 2. Download Manager

```typescript
// app/components/OfflineMapDownloader.tsx
const downloadRegion = async (region: Region) => {
  const bounds = {
    ne: region.bounds[1],  // northeast corner
    sw: region.bounds[0],  // southwest corner
  };

  const progressListener = (offlineRegion, status) => {
    const progress = status.percentage;
    setDownloadProgress(progress);
  };

  await Mapbox.offlineManager.createPack({
    name: region.id,
    styleURL: DEFAULT_MAP_CONFIG.styleURL,
    bounds,
    minZoom: 8,
    maxZoom: 15,
  }, progressListener);
};
```

**What this does:**
- Downloads map tiles for region
- Shows real-time progress
- Stores on device

---

## 3. Load Offline Maps

```typescript
// app/components/MapboxOfflineMap.tsx
<MapboxGL.MapView
  styleURL={DEFAULT_MAP_CONFIG.styleURL}
  localizeLabels={{ locale: 'en' }}
>
  <MapboxGL.Camera
    centerCoordinate={[longitude, latitude]}
    zoomLevel={12}
  />
  {/* Clinic markers */}
  {clinics.map(clinic => (
    <MapboxGL.MarkerView coordinate={clinic.location}>
      <ClinicMarker {...clinic} />
    </MapboxGL.MarkerView>
  ))}
</MapboxGL.MapView>
```

**What this does:**
- Loads map (offline tiles if available)
- Shows clinic markers
- No internet required if map is downloaded

---

## Simple Download Flow

**User perspective:**
1. Tap "Download Calgary"
2. Wait ~30 seconds
3. Maps work offline forever

**Code perspective:**
- 3 functions: `downloadRegion`, `verifyDownload`, `loadOfflinePacks`
- Handled by Mapbox Offline Manager

