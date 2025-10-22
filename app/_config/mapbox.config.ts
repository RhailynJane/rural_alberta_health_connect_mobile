export const MAPBOX_ACCESS_TOKEN = 
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'YOUR_MAPBOX_PUBLIC_TOKEN';

export const ALBERTA_REGIONS = [
  {
    id: 'all-alberta',
    name: '⭐ Entire Alberta Province',
    bounds: [
      [-120.0, 49.0],
      [-110.0, 60.0],
    ],
    center: [-115.0, 54.5],
    zoom: 6,
    estimatedSize: '250-400MB',
    description: 'Complete coverage of Alberta including all rural areas',
  },
  {
    id: 'calgary',
    name: 'Calgary and Area',
    bounds: [
      [-114.3, 50.8],
      [-113.8, 51.2],
    ],
    center: [-114.0719, 51.0447],
    zoom: 10,
    estimatedSize: '15-25MB',
    description: 'Calgary metro and surrounding areas (~50km radius)',
  },
  {
    id: 'edmonton',
    name: 'Edmonton and Area',
    bounds: [
      [-113.8, 53.3],
      [-113.2, 53.7],
    ],
    center: [-113.4937, 53.5461],
    zoom: 10,
    estimatedSize: '15-25MB',
    description: 'Edmonton metro and surrounding areas (~50km radius)',
  },
  {
    id: 'red-deer',
    name: 'Red Deer and Central Alberta',
    bounds: [
      [-114.2, 52.1],
      [-113.6, 52.4],
    ],
    center: [-113.8116, 52.2681],
    zoom: 10,
    estimatedSize: '10-15MB',
    description: 'Red Deer and central region',
  },
  {
    id: 'lethbridge',
    name: 'Lethbridge and Southern Alberta',
    bounds: [
      [-113.0, 49.5],
      [-112.5, 49.8],
    ],
    center: [-112.8186, 49.6942],
    zoom: 10,
    estimatedSize: '8-12MB',
    description: 'Lethbridge and southern region',
  },
  {
    id: 'medicine-hat',
    name: 'Medicine Hat and Southeast',
    bounds: [
      [-110.9, 50.0],
      [-110.5, 50.2],
    ],
    center: [-110.6771, 50.0403],
    zoom: 10,
    estimatedSize: '8-12MB',
    description: 'Medicine Hat and southeast region',
  },
  {
    id: 'grande-prairie',
    name: 'Grande Prairie and Northwest',
    bounds: [
      [-119.3, 55.0],
      [-118.6, 55.3],
    ],
    center: [-118.7948, 55.1707],
    zoom: 10,
    estimatedSize: '8-12MB',
    description: 'Grande Prairie and northwest region',
  },
  {
    id: 'fort-mcmurray',
    name: 'Fort McMurray and Northeast',
    bounds: [
      [-111.7, 56.5],
      [-111.1, 56.8],
    ],
    center: [-111.3803, 56.7267],
    zoom: 10,
    estimatedSize: '8-12MB',
    description: 'Fort McMurray and northeast region',
  },
  {
    id: 'banff-jasper',
    name: 'Banff & Jasper National Parks',
    bounds: [
      [-117.5, 50.5],
      [-115.0, 53.0],
    ],
    center: [-116.5, 51.75],
    zoom: 9,
    estimatedSize: '20-30MB',
    description: 'Mountain parks and Highway 93 corridor',
  },
  {
    id: 'highway-2-corridor',
    name: 'Highway 2 Corridor (Calgary-Edmonton)',
    bounds: [
      [-114.5, 50.8],
      [-113.0, 53.7],
    ],
    center: [-113.75, 52.25],
    zoom: 9,
    estimatedSize: '30-40MB',
    description: 'Main highway corridor between Calgary and Edmonton',
  },
];

export const MAPBOX_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

export const DEFAULT_MAP_CONFIG = {
  style: MAPBOX_STYLES.streets,
  defaultZoom: 11,
  minZoom: 8,
  maxZoom: 16,
  attributionEnabled: true,
  logoEnabled: true,
};

export const OFFLINE_PACK_CONFIG = {
  maxTileCount: 6000,
  minZoom: 10,
  maxZoom: 15,
  includeIdeographs: false,
};
