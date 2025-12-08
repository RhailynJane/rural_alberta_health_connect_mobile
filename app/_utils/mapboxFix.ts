/**
 * Wrapper to force @rnmapbox/maps to use the native version
 * This fixes the module resolution issue where the web version was being loaded
 */

// Re-export everything from the native entry point
export * from '@rnmapbox/maps/lib/module/index.native.js';

// Also provide a default export
import Mapbox from '@rnmapbox/maps/lib/module/index.native.js';
export default Mapbox;
