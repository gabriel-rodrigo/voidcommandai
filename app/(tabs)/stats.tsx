import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getStats, getMatchHistory } from "@/lib/services/storage";
import { UserStats, MatchHistoryEntry } from "@/lib/game/types";

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, h] = await Promise.all([getStats(), getMatchHistory()]);
    setStats(s);
    setHistory(h);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const winRate =
    stats && stats.totalGames > 0
      ? Math.round((stats.wins / stats.totalGames) * 100)
      : 0;

  return (
    <ScreenContainer containerClassName="bg-[#050505]">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMMAND STATS</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EF4444"
          />
        }
      >
        {!stats || stats.totalGames === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="bar-chart" size={48} color="#222" />
            <Text style={styles.emptyTitle}>No Battles Yet</Text>
            <Text style={styles.emptyDesc}>
              Play your first game to see stats here
            </Text>
          </View>
        ) : (
          <>
            {/* Overview Cards */}
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{stats.totalGames}</Text>
                <Text style={styles.overviewLabel}>GAMES</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewValue, { color: "#22C55E" }]}>
                  {stats.wins}
                </Text>
                <Text style={styles.overviewLabel}>WINS</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewValue, { color: "#EF4444" }]}>
                  {stats.losses}
                </Text>
                <Text style={styles.overviewLabel}>LOSSES</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewValue, { color: "#EAB308" }]}>
                  {winRate}%
                </Text>
                <Text style={styles.overviewLabel}>WIN RATE</Text>
              </View>
            </View>

            {/* Detailed Stats */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>COMBAT RECORD</Text>
              <DetailRow
                icon="local-fire-department"
                label="Total Damage Dealt"
                value={stats.totalDamageDealt.toLocaleString()}
              />
              <DetailRow
                icon="shield"
                label="Total Damage Taken"
                value={stats.totalDamageTaken.toLocaleString()}
              />
              <DetailRow
                icon="rocket-launch"
                label="Ships Destroyed"
                value={stats.totalShipsDestroyed.toString()}
              />
              <DetailRow
                icon="dangerous"
                label="Ships Lost"
                value={stats.totalShipsLost.toString()}
              />
            </View>

            {/* Match History */}
            {history.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>RECENT BATTLES</Text>
                {history.slice(0, 10).map((match) => (
                  <View key={match.id} style={styles.historyItem}>
                    <View
                      style={[
                        styles.historyBadge,
                        {
                          backgroundColor:
                            match.result === "victory"
                              ? "rgba(34,197,94,0.15)"
                              : match.result === "defeat"
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(234,179,8,0.15)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyBadgeText,
                          {
                            color:
                              match.result === "victory"
                                ? "#22C55E"
                                : match.result === "defeat"
                                ? "#EF4444"
                                : "#EAB308",
                          },
                        ]}
                      >
                        {match.result.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDifficulty}>
                        {match.difficulty.toUpperCase()}
                      </Text>
                      <Text style={styles.historyTurns}>
                        {match.turns} turns
                      </Text>
                    </View>
                    <Text style={styles.historyDamage}>
                      {match.playerStats.damageDealt} DMG
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={detailStyles.row}>
      <View style={detailStyles.left}>
        <MaterialIcons name={icon as any} size={18} color="#555" />
        <Text style={detailStyles.label}>{label}</Text>
      </View>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: "#888",
  },
  value: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
  },
});

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
    gap: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#444",
  },
  emptyDesc: {
    fontSize: 13,
    color: "#333",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  overviewCard: {
    width: "47%",
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
  },
  overviewLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 2,
    marginTop: 4,
  },
  detailSection: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 3,
    marginBottom: 8,
  },
  historySection: {
    gap: 0,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    width: 72,
    alignItems: "center",
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyDifficulty: {
    fontSize: 11,
    fontWeight: "800",
    color: "#888",
    letterSpacing: 1,
  },
  historyTurns: {
    fontSize: 10,
    color: "#555",
    marginTop: 1,
  },
  historyDamage: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
  },
});
