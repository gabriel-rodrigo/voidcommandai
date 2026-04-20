import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const PLAYER_NAME_KEY = "@voidcommand_player_name";

export default function ResultsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
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

  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const savedLocalRef = useRef(false);

  const submitMutation = trpc.leaderboard.submitScore.useMutation();

  // Load saved player name
  useEffect(() => {
    AsyncStorage.getItem(PLAYER_NAME_KEY).then((name) => {
      if (name) setPlayerName(name);
      else if (user?.name) setPlayerName(user.name);
    });
  }, [user]);

  // Save local stats
  useEffect(() => {
    if (savedLocalRef.current) return;
    savedLocalRef.current = true;

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

  const handleSubmitScore = async () => {
    if (!playerName.trim() || !isAuthenticated) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Save player name for future use
      await AsyncStorage.setItem(PLAYER_NAME_KEY, playerName.trim());

      const res = await submitMutation.mutateAsync({
        playerName: playerName.trim(),
        difficulty: difficulty as "easy" | "normal" | "hard",
        result,
        turns,
        damageDealt: playerDamage,
        shipsDestroyed: aiShipsLost,
        shipsLost: playerShipsLost,
      });

      setSubmittedScore(res.score);
      setScoreSubmitted(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      if (e?.data?.code === "UNAUTHORIZED") {
        setSubmitError("Login required to submit scores");
      } else {
        setSubmitError("Failed to submit score. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleViewLeaderboard = () => {
    router.replace("/(tabs)/leaderboard" as any);
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
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-[#050505]"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Result Header */}
        <View style={[styles.resultHeader, { backgroundColor: config.bg }]}>
          <View
            style={[
              styles.resultIcon,
              { backgroundColor: config.color + "20" },
            ]}
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

        {/* Score Submission */}
        {isAuthenticated && !scoreSubmitted && (
          <View style={styles.submitSection}>
            <Text style={styles.submitTitle}>SUBMIT TO LEADERBOARD</Text>
            <View style={styles.nameInputRow}>
              <TextInput
                style={styles.nameInput}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Your callsign..."
                placeholderTextColor="#444"
                maxLength={32}
                returnKeyType="done"
                onSubmitEditing={handleSubmitScore}
              />
              <Pressable
                onPress={handleSubmitScore}
                disabled={isSubmitting || !playerName.trim()}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (!playerName.trim() || isSubmitting) &&
                    styles.submitBtnDisabled,
                  pressed &&
                    playerName.trim() &&
                    !isSubmitting && {
                      opacity: 0.8,
                      transform: [{ scale: 0.97 }],
                    },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text
                    style={[
                      styles.submitBtnText,
                      (!playerName.trim() || isSubmitting) &&
                        styles.submitBtnTextDisabled,
                    ]}
                  >
                    SUBMIT
                  </Text>
                )}
              </Pressable>
            </View>
            {submitError && (
              <Text style={styles.submitError}>{submitError}</Text>
            )}
          </View>
        )}

        {/* Score Submitted Confirmation */}
        {scoreSubmitted && submittedScore !== null && (
          <View style={styles.scoreConfirmation}>
            <MaterialIcons name="check-circle" size={24} color="#22C55E" />
            <View style={styles.scoreConfirmInfo}>
              <Text style={styles.scoreConfirmTitle}>Score Submitted!</Text>
              <Text style={styles.scoreConfirmValue}>
                {submittedScore.toLocaleString()} pts
              </Text>
            </View>
            <Pressable
              onPress={handleViewLeaderboard}
              style={({ pressed }) => [
                styles.viewRankBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.viewRankBtnText}>VIEW RANKING</Text>
            </Pressable>
          </View>
        )}

        {/* Not authenticated hint */}
        {!isAuthenticated && (
          <View style={styles.loginHint}>
            <MaterialIcons name="person-outline" size={20} color="#555" />
            <Text style={styles.loginHintText}>
              Log in to submit your score to the global leaderboard
            </Text>
          </View>
        )}

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
      <Text style={[statRowStyles.value, leftWins && statRowStyles.winner]}>
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
  // Score Submission
  submitSection: {
    gap: 10,
  },
  submitTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 3,
    textAlign: "center",
  },
  nameInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#222",
  },
  submitBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#222",
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 1,
  },
  submitBtnTextDisabled: {
    color: "#555",
  },
  submitError: {
    fontSize: 11,
    color: "#EF4444",
    textAlign: "center",
  },
  // Score Confirmation
  scoreConfirmation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.15)",
  },
  scoreConfirmInfo: {
    flex: 1,
    gap: 2,
  },
  scoreConfirmTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#22C55E",
  },
  scoreConfirmValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
  },
  viewRankBtn: {
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewRankBtnText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#22C55E",
    letterSpacing: 1,
  },
  // Login hint
  loginHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  loginHintText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
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
