// API Configuration
// Update this based on your environment

import { Platform } from 'react-native';

// Detect if running on Android emulator
const isAndroidEmulator = Platform.OS === 'android' && !__DEV__;

// API Base URLs
const API_URLS = {
  // For Physical Device or Expo Go - use your computer's IP
  LOCAL_NETWORK: 'http://192.168.1.43:3001',
  
  // For Android Emulator
  ANDROID_EMULATOR: 'http://10.0.2.2:3001',
  
  // For iOS Simulator or Web
  IOS_SIMULATOR: 'http://localhost:3001',
  
  // Production
  PRODUCTION: 'https://your-production-api.com',
};

// Automatically select the right URL
// Change 'LOCAL_NETWORK' to match your setup:
// - 'LOCAL_NETWORK' for physical device/Expo Go
// - 'ANDROID_EMULATOR' for Android Studio emulator
// - 'IOS_SIMULATOR' for iOS simulator
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return API_URLS.IOS_SIMULATOR;
  }
  
  // Change this line to switch between environments
  return API_URLS.LOCAL_NETWORK;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
};

export const API_ENDPOINTS = {
  LOGIN: `${API_CONFIG.BASE_URL}/api/auth/login`,
  SIGNUP: `${API_CONFIG.BASE_URL}/api/auth/signup`,
  LOGOUT: `${API_CONFIG.BASE_URL}/api/auth/logout`,
  PROFILE: `${API_CONFIG.BASE_URL}/api/profile`,
  RECIPES: `${API_CONFIG.BASE_URL}/api/recipes`,
  FAVORITES: `${API_CONFIG.BASE_URL}/api/favorites`,
  REMOVE_FAVORITE: (favoriteId: string) => `${API_CONFIG.BASE_URL}/api/favorites/${favoriteId}`,
  AI_GENERATE: `${API_CONFIG.BASE_URL}/api/ai/generate`,
  AI_REGENERATE: `${API_CONFIG.BASE_URL}/api/ai/regenerate`,
};
