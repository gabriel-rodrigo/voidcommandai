import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

type FilterTab = "global" | "easy" | "normal" | "hard" | "recent";

interface LeaderboardEntry {
  userId: number;
  playerName: string;
  bestScore: number;
  totalGames: number;
  totalWins: number;
  totalDamage: number;
}

interface RecentEntry {
  id: number;
  playerName: string;
  score: number;
  difficulty: string;
  result: string;
  turns: number;
  damageDealt: number;
  shipsDestroyed: number;
  shipsLost: number;
  createdAt: Date | string;
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "global", label: "GLOBAL" },
  { key: "easy", label: "EASY" },
  { key: "normal", label: "NORMAL" },
  { key: "hard", label: "HARD" },
  { key: "recent", label: "RECENT" },
];

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>("global");
  const { user, isAuthenticated } = useAuth();

  // Queries
  const globalQuery = trpc.leaderboard.global.useQuery(undefined, {
    enabled: activeTab === "global",
  });
  const easyQuery = trpc.leaderboard.byDifficulty.useQuery(
    { difficulty: "easy" },
    { enabled: activeTab === "easy" }
  );
  const normalQuery = trpc.leaderboard.byDifficulty.useQuery(
    { difficulty: "normal" },
    { enabled: activeTab === "normal" }
  );
  const hardQuery = trpc.leaderboard.byDifficulty.useQuery(
    { difficulty: "hard" },
    { enabled: activeTab === "hard" }
  );
  const recentQuery = trpc.leaderboard.recent.useQuery(undefined, {
    enabled: activeTab === "recent",
  });
  const myStatsQuery = trpc.leaderboard.myStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const getActiveQuery = () => {
    switch (activeTab) {
      case "global":
        return globalQuery;
      case "easy":
        return easyQuery;
      case "normal":
        return normalQuery;
      case "hard":
        return hardQuery;
      case "recent":
        return recentQuery;
    }
  };

  const activeQuery = getActiveQuery();
  const isLoading = activeQuery.isLoading;
  const data = activeQuery.data ?? [];

  const onRefresh = useCallback(() => {
    activeQuery.refetch();
    if (isAuthenticated) myStatsQuery.refetch();
  }, [activeQuery, myStatsQuery, isAuthenticated]);

  const renderRankItem = useCallback(
    ({ item, index }: { item: LeaderboardEntry; index: number }) => {
      const rank = index + 1;
      const isMe = isAuthenticated && user && item.userId === user.id;
      const winRate =
        item.totalGames > 0
          ? Math.round((item.totalWins / item.totalGames) * 100)
          : 0;

      return (
        <View
          style={[
            styles.rankItem,
            isMe && styles.rankItemMe,
            rank <= 3 && styles.rankItemTop,
          ]}
        >
          <View style={styles.rankBadge}>
            {rank === 1 ? (
              <MaterialIcons name="emoji-events" size={22} color="#FFD700" />
            ) : rank === 2 ? (
              <MaterialIcons name="emoji-events" size={22} color="#C0C0C0" />
            ) : rank === 3 ? (
              <MaterialIcons name="emoji-events" size={22} color="#CD7F32" />
            ) : (
              <Text style={styles.rankNumber}>{rank}</Text>
            )}
          </View>

          <View style={styles.rankInfo}>
            <View style={styles.rankNameRow}>
              <Text
                style={[styles.rankName, isMe && styles.rankNameMe]}
                numberOfLines={1}
              >
                {item.playerName}
              </Text>
              {isMe && <Text style={styles.youBadge}>YOU</Text>}
            </View>
            <Text style={styles.rankMeta}>
              {item.totalGames} games · {winRate}% win rate
            </Text>
          </View>

          <View style={styles.rankScore}>
            <Text style={styles.rankScoreValue}>
              {item.bestScore.toLocaleString()}
            </Text>
            <Text style={styles.rankScoreLabel}>BEST</Text>
          </View>
        </View>
      );
    },
    [isAuthenticated, user]
  );

  const renderRecentItem = useCallback(
    ({ item }: { item: RecentEntry }) => {
      const resultColor =
        item.result === "victory"
          ? "#22C55E"
          : item.result === "defeat"
          ? "#EF4444"
          : "#EAB308";
      const timeAgo = getTimeAgo(
        typeof item.createdAt === "string"
          ? new Date(item.createdAt)
          : item.createdAt
      );

      return (
        <View style={styles.recentItem}>
          <View style={styles.recentLeft}>
            <View
              style={[
                styles.resultDot,
                { backgroundColor: resultColor },
              ]}
            />
            <View>
              <Text style={styles.recentName} numberOfLines={1}>
                {item.playerName}
              </Text>
              <Text style={styles.recentMeta}>
                {item.difficulty.toUpperCase()} · {item.turns} turns · {timeAgo}
              </Text>
            </View>
          </View>
          <View style={styles.recentRight}>
            <Text style={styles.recentScore}>
              {item.score.toLocaleString()}
            </Text>
            <Text style={[styles.recentResult, { color: resultColor }]}>
              {item.result.toUpperCase()}
            </Text>
          </View>
        </View>
      );
    },
    []
  );

  return (
    <ScreenContainer containerClassName="bg-[#050505]">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LEADERBOARD</Text>
        {isAuthenticated && myStatsQuery.data && (
          <View style={styles.myRankBadge}>
            <Text style={styles.myRankText}>
              #{myStatsQuery.data.rank}
            </Text>
          </View>
        )}
      </View>

      {/* My Stats Card (if authenticated) */}
      {isAuthenticated && myStatsQuery.data && (
        <View style={styles.myStatsCard}>
          <View style={styles.myStatsRow}>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>
                #{myStatsQuery.data.rank}
              </Text>
              <Text style={styles.myStatLabel}>RANK</Text>
            </View>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>
                {myStatsQuery.data.bestScore.toLocaleString()}
              </Text>
              <Text style={styles.myStatLabel}>BEST</Text>
            </View>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>
                {myStatsQuery.data.totalGames}
              </Text>
              <Text style={styles.myStatLabel}>GAMES</Text>
            </View>
            <View style={styles.myStatItem}>
              <Text style={[styles.myStatValue, { color: "#22C55E" }]}>
                {myStatsQuery.data.totalWins}
              </Text>
              <Text style={styles.myStatLabel}>WINS</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <FlatList
          horizontal
          data={FILTER_TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActiveTab(item.key)}
              style={({ pressed }) => [
                styles.tabItem,
                activeTab === item.key && styles.tabItemActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === item.key && styles.tabLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="emoji-events" size={48} color="#222" />
          <Text style={styles.emptyTitle}>No Scores Yet</Text>
          <Text style={styles.emptyDesc}>
            Be the first to claim the top spot!
          </Text>
        </View>
      ) : activeTab === "recent" ? (
        <FlatList
          data={data as RecentEntry[]}
          keyExtractor={(item) => (item as RecentEntry).id.toString()}
          renderItem={renderRecentItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isFetching}
              onRefresh={onRefresh}
              tintColor="#EF4444"
            />
          }
        />
      ) : (
        <FlatList
          data={data as LeaderboardEntry[]}
          keyExtractor={(item, index) =>
            `${(item as LeaderboardEntry).userId}_${index}`
          }
          renderItem={renderRankItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isFetching}
              onRefresh={onRefresh}
              tintColor="#EF4444"
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 7)}w ago`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  myRankBadge: {
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  myRankText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#EF4444",
  },
  myStatsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  myStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  myStatItem: {
    alignItems: "center",
    gap: 4,
  },
  myStatValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
  },
  myStatLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 2,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    marginTop: 8,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#EF4444",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#555",
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 60,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  // Rank items
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  rankItemMe: {
    backgroundColor: "rgba(239,68,68,0.05)",
    borderRadius: 12,
    borderBottomWidth: 0,
    marginBottom: 2,
  },
  rankItemTop: {
    borderBottomColor: "#1a1a1a",
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: "900",
    color: "#666",
  },
  rankInfo: {
    flex: 1,
    gap: 2,
  },
  rankNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rankName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DDD",
  },
  rankNameMe: {
    color: "#EF4444",
  },
  youBadge: {
    fontSize: 8,
    fontWeight: "900",
    color: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    letterSpacing: 1,
    overflow: "hidden",
  },
  rankMeta: {
    fontSize: 11,
    color: "#555",
  },
  rankScore: {
    alignItems: "flex-end",
    gap: 2,
  },
  rankScoreValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
  },
  rankScoreLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 1,
  },
  // Recent items
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  recentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DDD",
    maxWidth: 160,
  },
  recentMeta: {
    fontSize: 10,
    color: "#555",
    marginTop: 2,
  },
  recentRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  recentScore: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
  },
  recentResult: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
