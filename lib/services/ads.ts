/**
 * Ad Service - Abstraction layer for AdMob / AdSense integration
 *
 * This module provides a clean interface for ad operations.
 * In development, ads are simulated. In production, replace with
 * react-native-google-mobile-ads implementation.
 *
 * Integration steps for production:
 * 1. Install: npx expo install react-native-google-mobile-ads
 * 2. Add to app.json:
 *    "react-native-google-mobile-ads": {
 *      "android_app_id": "ca-app-pub-XXXXXXXX~YYYYYYYY",
 *      "ios_app_id": "ca-app-pub-XXXXXXXX~ZZZZZZZZ"
 *    }
 * 3. Replace the mock implementations below with real AdMob calls
 */

import { Platform } from "react-native";

// Ad Unit IDs - Replace with your actual AdMob unit IDs
export const AD_UNIT_IDS = {
  BANNER_MENU: Platform.select({
    android: "ca-app-pub-3940256099942544/6300978111", // Test ID
    ios: "ca-app-pub-3940256099942544/2934735716", // Test ID
    default: "ca-app-pub-3940256099942544/6300978111",
  }) as string,
  BANNER_SHIPYARD: Platform.select({
    android: "ca-app-pub-3940256099942544/6300978111",
    ios: "ca-app-pub-3940256099942544/2934735716",
    default: "ca-app-pub-3940256099942544/6300978111",
  }) as string,
  BANNER_RESULTS: Platform.select({
    android: "ca-app-pub-3940256099942544/6300978111",
    ios: "ca-app-pub-3940256099942544/2934735716",
    default: "ca-app-pub-3940256099942544/6300978111",
  }) as string,
  INTERSTITIAL: Platform.select({
    android: "ca-app-pub-3940256099942544/1033173712",
    ios: "ca-app-pub-3940256099942544/4411468910",
    default: "ca-app-pub-3940256099942544/1033173712",
  }) as string,
  REWARDED: Platform.select({
    android: "ca-app-pub-3940256099942544/5224354917",
    ios: "ca-app-pub-3940256099942544/1712485313",
    default: "ca-app-pub-3940256099942544/5224354917",
  }) as string,
};

// Track ad state
let interstitialLoaded = false;
let rewardedLoaded = false;
let adsInitialized = false;

/**
 * Initialize the Mobile Ads SDK
 * Call this once at app startup
 */
export async function initializeAds(): Promise<void> {
  if (adsInitialized) return;

  try {
    // In production, uncomment:
    // const { default: mobileAds } = await import('react-native-google-mobile-ads');
    // await mobileAds().initialize();
    adsInitialized = true;
    console.log("[Ads] SDK initialized (dev mode)");
  } catch (error) {
    console.warn("[Ads] Failed to initialize:", error);
  }
}

/**
 * Load an interstitial ad
 * Call this before you need to show it (e.g., when entering battle)
 */
export async function loadInterstitial(): Promise<void> {
  try {
    // In production:
    // const { InterstitialAd, AdEventType } = await import('react-native-google-mobile-ads');
    // const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);
    // interstitial.addAdEventListener(AdEventType.LOADED, () => { interstitialLoaded = true; });
    // interstitial.load();
    interstitialLoaded = true;
    console.log("[Ads] Interstitial loaded (dev mode)");
  } catch (error) {
    console.warn("[Ads] Failed to load interstitial:", error);
  }
}

/**
 * Show the loaded interstitial ad
 * Returns true if shown successfully
 */
export async function showInterstitial(): Promise<boolean> {
  if (!interstitialLoaded) {
    console.log("[Ads] Interstitial not loaded yet");
    return false;
  }

  try {
    // In production:
    // interstitial.show();
    interstitialLoaded = false;
    console.log("[Ads] Interstitial shown (dev mode)");
    return true;
  } catch (error) {
    console.warn("[Ads] Failed to show interstitial:", error);
    return false;
  }
}

/**
 * Load a rewarded ad
 */
export async function loadRewarded(): Promise<void> {
  try {
    // In production:
    // const { RewardedAd, RewardedAdEventType } = await import('react-native-google-mobile-ads');
    // const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);
    // rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => { rewardedLoaded = true; });
    // rewarded.load();
    rewardedLoaded = true;
    console.log("[Ads] Rewarded ad loaded (dev mode)");
  } catch (error) {
    console.warn("[Ads] Failed to load rewarded:", error);
  }
}

/**
 * Show rewarded ad and return the reward amount
 * Returns credits earned (0 if not shown)
 */
export async function showRewarded(): Promise<number> {
  if (!rewardedLoaded) {
    console.log("[Ads] Rewarded ad not loaded yet");
    return 0;
  }

  try {
    // In production:
    // return new Promise((resolve) => {
    //   rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
    //     resolve(reward.amount);
    //   });
    //   rewarded.show();
    // });
    rewardedLoaded = false;
    console.log("[Ads] Rewarded ad shown (dev mode)");
    return 50; // Dev reward
  } catch (error) {
    console.warn("[Ads] Failed to show rewarded:", error);
    return 0;
  }
}

/**
 * Check if ads are available on this platform
 */
export function isAdsAvailable(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

/**
 * Banner ad component props for use in screens
 */
export interface BannerAdProps {
  unitId: string;
  size?: "BANNER" | "LARGE_BANNER" | "MEDIUM_RECTANGLE";
}
