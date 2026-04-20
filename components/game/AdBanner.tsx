import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * AdBanner - Placeholder component for AdMob banner ads
 *
 * In production, replace with:
 * import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
 * <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
 */
interface AdBannerProps {
  unitId?: string;
  size?: "small" | "medium" | "large";
}

export function AdBanner({ size = "small" }: AdBannerProps) {
  const height = size === "large" ? 250 : size === "medium" ? 100 : 50;

  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.label}>AD SPACE</Text>
      <Text style={styles.sublabel}>
        {size === "large" ? "300x250" : size === "medium" ? "320x100" : "320x50"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  sublabel: {
    color: "rgba(255,255,255,0.08)",
    fontSize: 8,
    marginTop: 2,
  },
});
