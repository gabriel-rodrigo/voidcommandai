# Ads Integration Guide - Void Command

## Overview

This document describes how to integrate Google AdMob and AdSense into the Void Command mobile app. The architecture is already prepared with placeholder components and service abstractions.

## Architecture

The ads system is organized in three layers:

### 1. Service Layer (`lib/services/ads.ts`)
Contains all ad logic: initialization, loading, showing ads. This is the single point of integration with the AdMob SDK.

### 2. Component Layer (`components/game/AdBanner.tsx`)
Provides a reusable banner component. Currently shows a placeholder; replace with the real `BannerAd` component from `react-native-google-mobile-ads`.

### 3. Screen Integration
Ads are placed in strategic locations throughout the app:

| Location | Ad Type | Trigger |
|----------|---------|---------|
| Main Menu | Banner (320x50) | Always visible |
| Shipyard | Banner (320x50) | Always visible |
| Results Screen | Medium Rectangle (320x100) | After game ends |
| Between Games | Interstitial | On "Play Again" or "Return to Menu" |
| Bonus Credits | Rewarded | Player watches ad for 50 credits |

## Production Setup

### Step 1: Install the SDK

```bash
npx expo install react-native-google-mobile-ads
```

### Step 2: Configure app.json

Add to your `app.json` or `app.config.ts`:

```json
{
  "react-native-google-mobile-ads": {
    "android_app_id": "ca-app-pub-XXXXXXXX~YYYYYYYY",
    "ios_app_id": "ca-app-pub-XXXXXXXX~ZZZZZZZZ"
  }
}
```

### Step 3: Replace Ad Unit IDs

In `lib/services/ads.ts`, replace the test IDs with your production IDs:

```typescript
export const AD_UNIT_IDS = {
  BANNER_MENU: "ca-app-pub-YOUR_ID/BANNER_UNIT_ID",
  BANNER_SHIPYARD: "ca-app-pub-YOUR_ID/BANNER_UNIT_ID",
  BANNER_RESULTS: "ca-app-pub-YOUR_ID/BANNER_UNIT_ID",
  INTERSTITIAL: "ca-app-pub-YOUR_ID/INTERSTITIAL_UNIT_ID",
  REWARDED: "ca-app-pub-YOUR_ID/REWARDED_UNIT_ID",
};
```

### Step 4: Replace Banner Component

In `components/game/AdBanner.tsx`, replace the placeholder with:

```tsx
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '@/lib/services/ads';

export function AdBanner({ unitId }: { unitId: string }) {
  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
```

### Step 5: Replace Service Implementations

In `lib/services/ads.ts`, uncomment the production code blocks and remove the mock implementations.

## AdSense (Web)

For the web version of the app, AdSense can be integrated via the standard web approach:

1. Add the AdSense script to the HTML head
2. Use `<ins class="adsbygoogle">` elements in web-specific components
3. Use `Platform.OS === 'web'` to conditionally render AdSense vs AdMob

## GDPR / Privacy

Before showing ads in production:

1. Implement a consent dialog using `@react-native-google-mobile-ads` UMP SDK
2. Call `AdsConsent.requestInfoUpdate()` on app start
3. Show consent form if required
4. Pass consent status to ad requests

## Revenue Optimization Tips

1. Use adaptive banners for best fill rates
2. Load interstitials early (when entering battle)
3. Show interstitials at natural break points (between games)
4. Offer rewarded ads as optional bonus (never forced)
5. Limit interstitial frequency to avoid user frustration
