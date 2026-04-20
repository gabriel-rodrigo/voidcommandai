import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AdBanner } from "@/components/game/AdBanner";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Difficulty } from "@/lib/game/types";

export default function HomeScreen() {
  const router = useRouter();
  const [showDifficulty, setShowDifficulty] = useState(false);

  const handleDifficultySelect = (difficulty: Difficulty) => {
    router.push({ pathname: "/shipyard", params: { difficulty } });
  };

  return (
    <ScreenContainer containerClassName="bg-[#050505]">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <MaterialIcons name="rocket-launch" size={40} color="#EF4444" />
            </View>
            <Text style={styles.title}>VOID COMMAND</Text>
            <Text style={styles.subtitle}>Futuristic Tactical Battle</Text>
          </View>

          {/* Main Buttons */}
          {!showDifficulty ? (
            <View style={styles.buttonGroup}>
              <Pressable
                onPress={() => setShowDifficulty(true)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <MaterialIcons name="play-arrow" size={24} color="#000" />
                <Text style={styles.primaryButtonText}>SINGLE PLAYER</Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>COMMAND ACCESS</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.featureGrid}>
                <View style={styles.featureItem}>
                  <MaterialIcons name="shield" size={18} color="#666" />
                  <Text style={styles.featureText}>Real-time Combat</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="emoji-events" size={18} color="#666" />
                  <Text style={styles.featureText}>5 Ship Classes</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="psychology" size={18} color="#666" />
                  <Text style={styles.featureText}>Smart AI</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="upgrade" size={18} color="#666" />
                  <Text style={styles.featureText}>Powerups</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <Text style={styles.sectionTitle}>SELECT DIFFICULTY</Text>

              <Pressable
                onPress={() => handleDifficultySelect("easy")}
                style={({ pressed }) => [
                  styles.difficultyButton,
                  styles.easyButton,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View>
                  <Text style={styles.difficultyTitle}>EASY</Text>
                  <Text style={styles.difficultyDesc}>
                    AI has 2 ships, random targeting
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#22C55E" />
              </Pressable>

              <Pressable
                onPress={() => handleDifficultySelect("normal")}
                style={({ pressed }) => [
                  styles.difficultyButton,
                  styles.normalButton,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View>
                  <Text style={styles.difficultyTitle}>NORMAL</Text>
                  <Text style={styles.difficultyDesc}>
                    AI has 3 ships, targets closest
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#EAB308" />
              </Pressable>

              <Pressable
                onPress={() => handleDifficultySelect("hard")}
                style={({ pressed }) => [
                  styles.difficultyButton,
                  styles.hardButton,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View>
                  <Text style={styles.difficultyTitle}>HARD</Text>
                  <Text style={styles.difficultyDesc}>
                    AI has 3 ships, flanks and targets weak
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#EF4444" />
              </Pressable>

              <Pressable
                onPress={() => setShowDifficulty(false)}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="arrow-back" size={18} color="#666" />
                <Text style={styles.backButtonText}>BACK</Text>
              </Pressable>
            </View>
          )}

          {/* Ad Banner */}
          <View style={styles.adSection}>
            <AdBanner size="small" />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    gap: 32,
  },
  logoSection: {
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    letterSpacing: 1,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#222",
  },
  dividerText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#444",
    letterSpacing: 2,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "46%",
  },
  featureText: {
    fontSize: 12,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#666",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 8,
  },
  difficultyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  easyButton: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.2)",
  },
  normalButton: {
    backgroundColor: "rgba(234,179,8,0.08)",
    borderColor: "rgba(234,179,8,0.2)",
  },
  hardButton: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  difficultyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  difficultyDesc: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "#222",
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 2,
  },
  adSection: {
    marginTop: 8,
  },
});
