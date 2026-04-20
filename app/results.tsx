import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AdBanner } from "@/components/game/AdBanner";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { loadInterstitial, showInterstitial } from "@/lib/services/ads";
import {
  getStats,
  saveStats,
  addMatchToHistory,
} from "@/lib/services/storage";
import { Difficulty, MatchHistoryEntry, UserStats } from "@/lib/game/types";

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    result: string;
    turns: string;
    playerDamage: string;
    playerShipsLost: string;
    aiDamage: string;
    aiShipsLost: string;
    difficulty: string;
  }>();

  const result = (params.result ?? "draw") as "victory" | "defeat" | "draw";
  const turns = parseInt(params.turns ?? "0", 10);
  const playerDamage = parseInt(params.playerDamage ?? "0", 10);
  const playerShipsLost = parseInt(params.playerShipsLost ?? "0", 10);
  const aiDamage = parseInt(params.aiDamage ?? "0", 10);
  const aiShipsLost = parseInt(params.aiShipsLost ?? "0", 10);
  const difficulty = (params.difficulty ?? "normal") as Difficulty;

  useEffect(() => {
    // Save match stats
    const saveMatchData = async () => {
      try {
        const stats = await getStats();
        const updated: UserStats = {
          ...stats,
          totalGames: stats.totalGames + 1,
          wins: stats.wins + (result === "victory" ? 1 : 0),
          losses: stats.losses + (result === "defeat" ? 1 : 0),
          draws: stats.draws + (result === "draw" ? 1 : 0),
          totalDamageDealt: stats.totalDamageDealt + playerDamage,
          totalDamageTaken: stats.totalDamageTaken + aiDamage,
          totalShipsDestroyed: stats.totalShipsDestroyed + aiShipsLost,
          totalShipsLost: stats.totalShipsLost + playerShipsLost,
        };
        await saveStats(updated);

        const entry: MatchHistoryEntry = {
          id: `match_${Date.now()}`,
          date: Date.now(),
          difficulty,
          result,
          turns,
          playerStats: {
            damageDealt: playerDamage,
            damageTaken: aiDamage,
            shotsFired: 0,
            shotsHit: 0,
            shipsLost: playerShipsLost,
            shipsDestroyed: aiShipsLost,
          },
          aiStats: {
            damageDealt: aiDamage,
            damageTaken: playerDamage,
            shotsFired: 0,
            shotsHit: 0,
            shipsLost: aiShipsLost,
            shipsDestroyed: playerShipsLost,
          },
        };
        await addMatchToHistory(entry);
      } catch (e) {
        console.warn("Failed to save match data:", e);
      }
    };

    saveMatchData();
    loadInterstitial();
  }, []);

  const handlePlayAgain = async () => {
    await showInterstitial();
    router.replace({
      pathname: "/shipyard",
      params: { difficulty },
    } as any);
  };

  const handleReturnMenu = async () => {
    await showInterstitial();
    router.replace("/(tabs)");
  };

  const resultConfig = {
    victory: {
      title: "VICTORY",
      subtitle: "All enemy ships destroyed",
      color: "#22C55E",
      icon: "emoji-events" as const,
      bg: "rgba(34,197,94,0.08)",
    },
    defeat: {
      title: "DEFEAT",
      subtitle: "Your fleet was destroyed",
      color: "#EF4444",
      icon: "close" as const,
      bg: "rgba(239,68,68,0.08)",
    },
    draw: {
      title: "DRAW",
      subtitle: "Time limit reached",
      color: "#EAB308",
      icon: "remove" as const,
      bg: "rgba(234,179,8,0.08)",
    },
  };

  const config = resultConfig[result];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#050505]">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Result Header */}
        <View style={[styles.resultHeader, { backgroundColor: config.bg }]}>
          <View
            style={[styles.resultIcon, { backgroundColor: config.color + "20" }]}
          >
            <MaterialIcons name={config.icon} size={40} color={config.color} />
          </View>
          <Text style={[styles.resultTitle, { color: config.color }]}>
            {config.title}
          </Text>
          <Text style={styles.resultSubtitle}>{config.subtitle}</Text>
          <Text style={styles.turnInfo}>
            Completed in {turns} turn{turns !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Stats Comparison */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>BATTLE REPORT</Text>

          <View style={styles.statsHeader}>
            <Text style={styles.statsHeaderLabel}>YOU</Text>
            <Text style={styles.statsHeaderCenter}>STAT</Text>
            <Text style={styles.statsHeaderLabel}>AI</Text>
          </View>

          <StatRow
            label="Damage"
            left={playerDamage}
            right={aiDamage}
            leftWins={playerDamage > aiDamage}
          />
          <StatRow
            label="Ships Lost"
            left={playerShipsLost}
            right={aiShipsLost}
            leftWins={playerShipsLost < aiShipsLost}
          />
          <StatRow
            label="Ships Destroyed"
            left={aiShipsLost}
            right={playerShipsLost}
            leftWins={aiShipsLost > playerShipsLost}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handlePlayAgain}
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <MaterialIcons name="replay" size={20} color="#000" />
            <Text style={styles.primaryActionText}>PLAY AGAIN</Text>
          </Pressable>

          <Pressable
            onPress={handleReturnMenu}
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="home" size={18} color="#666" />
            <Text style={styles.secondaryActionText}>RETURN TO MENU</Text>
          </Pressable>
        </View>

        {/* Ad */}
        <View style={styles.adSection}>
          <AdBanner size="medium" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatRow({
  label,
  left,
  right,
  leftWins,
}: {
  label: string;
  left: number;
  right: number;
  leftWins: boolean;
}) {
  return (
    <View style={statRowStyles.container}>
      <Text
        style={[
          statRowStyles.value,
          leftWins && statRowStyles.winner,
        ]}
      >
        {left}
      </Text>
      <Text style={statRowStyles.label}>{label}</Text>
      <Text
        style={[
          statRowStyles.value,
          !leftWins && left !== right && statRowStyles.winner,
        ]}
      >
        {right}
      </Text>
    </View>
  );
}

const statRowStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  value: {
    fontSize: 18,
    fontWeight: "900",
    color: "#666",
    width: 60,
    textAlign: "center",
  },
  winner: {
    color: "#FFF",
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  resultHeader: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
    borderRadius: 16,
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    color: "#888",
  },
  turnInfo: {
    fontSize: 11,
    color: "#555",
    marginTop: 4,
  },
  statsSection: {
    gap: 8,
  },
  statsTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 8,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  statsHeaderLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#444",
    letterSpacing: 2,
    width: 60,
    textAlign: "center",
  },
  statsHeaderCenter: {
    fontSize: 10,
    fontWeight: "900",
    color: "#444",
    letterSpacing: 2,
  },
  actions: {
    gap: 10,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  secondaryAction: {
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
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 2,
  },
  adSection: {
    marginTop: 8,
  },
});
