import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSocket } from "@/hooks/use-socket";
import { SHIP_TYPES } from "@/lib/game/constants";
import * as Haptics from "expo-haptics";

const SHIP_TYPES_LIST = Object.values(SHIP_TYPES);
const FLEET_SIZE = 3;

export default function WaitingRoomScreen() {
  const router = useRouter();
  const {
    connected,
    roomState,
    leaveRoom,
    selectShips,
    markReady,
    gameSnapshot,
  } = useSocket();

  const [selectedShips, setSelectedShips] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Navigate to multiplayer battle when game starts
  useEffect(() => {
    if (gameSnapshot && roomState?.status === "playing") {
      router.replace("/mp-battle" as any);
    }
  }, [gameSnapshot, roomState?.status]);

  // Navigate back if room is gone
  useEffect(() => {
    if (!roomState && !gameSnapshot) {
      // Slight delay to avoid flash
      const t = setTimeout(() => {
        if (!roomState) router.back();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [roomState, gameSnapshot]);

  const handleLeave = () => {
    leaveRoom();
    router.back();
  };

  const handleToggleShip = (typeId: string) => {
    if (isReady) return;
    setSelectedShips((prev) => {
      let next: string[];
      if (prev.includes(typeId)) {
        next = prev.filter((id) => id !== typeId);
      } else if (prev.length < FLEET_SIZE) {
        next = [...prev, typeId];
      } else {
        return prev;
      }
      selectShips(next);
      return next;
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleReady = () => {
    if (selectedShips.length === 0) return;
    setIsReady(true);
    markReady();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  if (!roomState) {
    return (
      <ScreenContainer
        edges={["top", "bottom", "left", "right"]}
        containerClassName="bg-[#050505]"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Connecting to room...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const me = roomState.players.find((p) => p.id === roomState.hostId);
  const opponent = roomState.players.find((p) => p.id !== roomState.hostId);
  const isHost = me?.isHost ?? false;
  const isSelecting = roomState.status === "selecting";
  const isWaiting = roomState.status === "waiting";

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-[#050505]"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleLeave}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isWaiting ? "WAITING ROOM" : "SELECT FLEET"}
          </Text>
          <Text style={styles.roomCode}>CODE: {roomState.id}</Text>
        </View>
        <View style={styles.connectionDot}>
          <View
            style={[
              styles.dot,
              { backgroundColor: connected ? "#22C55E" : "#EF4444" },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Players */}
        <View style={styles.playersSection}>
          <Text style={styles.sectionLabel}>PLAYERS</Text>
          <View style={styles.playersRow}>
            {/* Player 1 (Host) */}
            <View style={styles.playerCard}>
              <MaterialIcons name="person" size={28} color="#EF4444" />
              <Text style={styles.playerName} numberOfLines={1}>
                {roomState.players[0]?.name ?? "..."}
              </Text>
              <Text style={styles.playerSlot}>HOST</Text>
              {roomState.players[0]?.isReady && (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>READY</Text>
                </View>
              )}
            </View>

            <Text style={styles.vsText}>VS</Text>

            {/* Player 2 */}
            <View style={styles.playerCard}>
              {roomState.players.length >= 2 ? (
                <>
                  <MaterialIcons name="person" size={28} color="#3B82F6" />
                  <Text style={styles.playerName} numberOfLines={1}>
                    {roomState.players[1]?.name ?? "..."}
                  </Text>
                  <Text style={styles.playerSlot}>CHALLENGER</Text>
                  {roomState.players[1]?.isReady && (
                    <View style={styles.readyBadge}>
                      <Text style={styles.readyBadgeText}>READY</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color="#333" />
                  <Text style={styles.waitingText}>Waiting for opponent...</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Ship Selection (only when both players are present) */}
        {isSelecting && (
          <View style={styles.shipsSection}>
            <Text style={styles.sectionLabel}>
              SELECT YOUR FLEET ({selectedShips.length}/{FLEET_SIZE})
            </Text>
            <View style={styles.shipsGrid}>
              {SHIP_TYPES_LIST.map((ship) => {
                const count = selectedShips.filter((id) => id === ship.id).length;
                const isSelected = count > 0;
                return (
                  <Pressable
                    key={ship.id}
                    onPress={() => handleToggleShip(ship.id)}
                    disabled={isReady}
                    style={({ pressed }) => [
                      styles.shipCard,
                      isSelected && styles.shipCardSelected,
                      pressed && { opacity: 0.7 },
                      isReady && { opacity: 0.5 },
                    ]}
                  >
                    <View style={styles.shipHeader}>
                      <Text style={styles.shipName}>{ship.name}</Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <MaterialIcons name="check" size={12} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.shipStats}>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>HP</Text>
                        <Text style={styles.statValue}>{ship.life}</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>DMG</Text>
                        <Text style={styles.statValue}>{ship.damage}</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>SPD</Text>
                        <Text style={styles.statValue}>{ship.speed}</Text>
                      </View>
                    </View>
                    <Text style={styles.shipDesc} numberOfLines={2}>
                      {ship.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Waiting state info */}
        {isWaiting && (
          <View style={styles.waitingSection}>
            <MaterialIcons name="wifi-tethering" size={48} color="#222" />
            <Text style={styles.waitingTitle}>Waiting for Opponent</Text>
            <Text style={styles.waitingSubtext}>
              Share the room code with a friend:
            </Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{roomState.id}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {isSelecting && !isReady && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={handleReady}
            disabled={selectedShips.length === 0}
            style={({ pressed }) => [
              styles.readyBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              selectedShips.length === 0 && { opacity: 0.3 },
            ]}
          >
            <MaterialIcons name="check-circle" size={20} color="#000" />
            <Text style={styles.readyBtnText}>READY</Text>
          </Pressable>
        </View>
      )}

      {isSelecting && isReady && (
        <View style={styles.bottomBar}>
          <View style={styles.waitingReady}>
            <ActivityIndicator size="small" color="#EF4444" />
            <Text style={styles.waitingReadyText}>
              Waiting for opponent to be ready...
            </Text>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  roomCode: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
  },
  connectionDot: { padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  scrollContent: { flex: 1 },
  scrollInner: { paddingBottom: 120 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#555" },
  playersSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 2,
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playerCard: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  playerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DDD",
    textAlign: "center",
  },
  playerSlot: {
    fontSize: 9,
    fontWeight: "900",
    color: "#444",
    letterSpacing: 2,
  },
  readyBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  readyBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  vsText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#333",
  },
  waitingText: {
    fontSize: 11,
    color: "#444",
    textAlign: "center",
  },
  shipsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  shipsGrid: { gap: 8 },
  shipCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  shipCardSelected: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  shipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  shipName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#DDD",
  },
  selectedBadge: {
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shipStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 6,
  },
  stat: { gap: 2 },
  statLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#888",
  },
  shipDesc: {
    fontSize: 11,
    color: "#444",
    lineHeight: 15,
  },
  waitingSection: {
    alignItems: "center",
    paddingTop: 40,
    gap: 12,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#444",
  },
  waitingSubtext: {
    fontSize: 13,
    color: "#333",
  },
  codeBox: {
    backgroundColor: "#111",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    marginTop: 4,
  },
  codeText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 6,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: "rgba(5,5,5,0.95)",
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  readyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 14,
  },
  readyBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  waitingReady: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  waitingReadyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
});
