import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  getSettings,
  saveSettings,
  GameSettings,
} from "@/lib/services/storage";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<GameSettings>({
    musicVolume: 0.5,
    sfxVolume: 0.5,
    isMuted: false,
  });

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
    }, [])
  );

  const updateSetting = async (key: keyof GameSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  return (
    <ScreenContainer containerClassName="bg-[#050505]">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Audio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AUDIO</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="music-note" size={20} color="#666" />
              <Text style={styles.settingLabel}>Music Volume</Text>
            </View>
            <View style={styles.volumeControl}>
              <Pressable
                onPress={() =>
                  updateSetting(
                    "musicVolume",
                    Math.max(0, settings.musicVolume - 0.1)
                  )
                }
                style={({ pressed }) => [
                  styles.volumeBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <MaterialIcons name="remove" size={16} color="#888" />
              </Pressable>
              <View style={styles.volumeBarBg}>
                <View
                  style={[
                    styles.volumeBarFill,
                    { width: `${settings.musicVolume * 100}%` },
                  ]}
                />
              </View>
              <Pressable
                onPress={() =>
                  updateSetting(
                    "musicVolume",
                    Math.min(1, settings.musicVolume + 0.1)
                  )
                }
                style={({ pressed }) => [
                  styles.volumeBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <MaterialIcons name="add" size={16} color="#888" />
              </Pressable>
              <Text style={styles.volumeValue}>
                {Math.round(settings.musicVolume * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="volume-up" size={20} color="#666" />
              <Text style={styles.settingLabel}>SFX Volume</Text>
            </View>
            <View style={styles.volumeControl}>
              <Pressable
                onPress={() =>
                  updateSetting(
                    "sfxVolume",
                    Math.max(0, settings.sfxVolume - 0.1)
                  )
                }
                style={({ pressed }) => [
                  styles.volumeBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <MaterialIcons name="remove" size={16} color="#888" />
              </Pressable>
              <View style={styles.volumeBarBg}>
                <View
                  style={[
                    styles.volumeBarFill,
                    { width: `${settings.sfxVolume * 100}%` },
                  ]}
                />
              </View>
              <Pressable
                onPress={() =>
                  updateSetting(
                    "sfxVolume",
                    Math.min(1, settings.sfxVolume + 0.1)
                  )
                }
                style={({ pressed }) => [
                  styles.volumeBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <MaterialIcons name="add" size={16} color="#888" />
              </Pressable>
              <Text style={styles.volumeValue}>
                {Math.round(settings.sfxVolume * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons
                name={settings.isMuted ? "volume-off" : "volume-up"}
                size={20}
                color="#666"
              />
              <Text style={styles.settingLabel}>Mute All</Text>
            </View>
            <Switch
              value={settings.isMuted}
              onValueChange={(v) => updateSetting("isMuted", v)}
              trackColor={{ false: "#333", true: "rgba(239,68,68,0.4)" }}
              thumbColor={settings.isMuted ? "#EF4444" : "#888"}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>

          <View style={styles.aboutCard}>
            <MaterialIcons name="rocket-launch" size={24} color="#EF4444" />
            <View style={styles.aboutInfo}>
              <Text style={styles.aboutTitle}>Void Command</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              <Text style={styles.aboutDesc}>
                Futuristic tactical space battle game. Command your fleet and
                destroy the enemy.
              </Text>
            </View>
          </View>

          <View style={styles.creditsCard}>
            <Text style={styles.creditsTitle}>CREDITS</Text>
            <Text style={styles.creditsText}>
              Original game by gabriel-rodrigo{"\n"}
              Refactored for mobile with Expo + React Native
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 100,
  },
  section: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 3,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingLabel: {
    fontSize: 14,
    color: "#CCC",
  },
  volumeControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  volumeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  volumeBarBg: {
    width: 60,
    height: 4,
    backgroundColor: "#222",
    borderRadius: 2,
    overflow: "hidden",
  },
  volumeBarFill: {
    height: "100%",
    backgroundColor: "#EF4444",
    borderRadius: 2,
  },
  volumeValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    width: 32,
    textAlign: "right",
  },
  aboutCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  aboutInfo: {
    flex: 1,
    gap: 4,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
  },
  aboutVersion: {
    fontSize: 11,
    color: "#666",
  },
  aboutDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    lineHeight: 18,
  },
  creditsCard: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    marginTop: 10,
    gap: 6,
  },
  creditsTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 2,
  },
  creditsText: {
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
});
