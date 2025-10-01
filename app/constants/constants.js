// constants.js
import {
  Barlow_700Bold,
  Barlow_800ExtraBold,
  Barlow_900Black
} from '@expo-google-fonts/barlow';

export const FONTS = {
  BarlowSemiCondensed: 'BarlowSemiCondensed',
  BarlowSemiCondensedBold: 'BarlowSemiCondensedBold',
  BarlowSemiCondensedExtraBold: 'BarlowSemiCondensedExtraBold',
};

export const FONT_CONFIG = {
  BarlowSemiCondensed: Barlow_700Bold, // Changed from 600 to 700
  BarlowSemiCondensedBold: Barlow_800ExtraBold,
  BarlowSemiCondensedExtraBold: Barlow_900Black, // Boldest option
};

export const COLORS = {
  // Primary colors
  primary: '#007AFF',
  white: '#FFFFFF',
  black: '#000000',
  
  // Light theme
  lightBackground: '#F2F2F7',
  lightText: '#1C1C1E',
  lightGray: '#8E8E93',
  lightCard: '#FFFFFF',
  
  // Dark theme
  darkBackground: '#000000',
  darkText: '#000000',
  darkGray: '#8E8E93',
  darkCard: '#1C1C1E',
  darkInput: '#2C2C2E',

  error: '#e74c3c',
  success: '#2ecc71',
  warning: '#f39c12',
};