import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
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
    if (selectedShips.length !== FLEET_SIZE) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsReady(true);
    markReady();
  };

  const handleClearSelection = () => {
    if (isReady) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedShips([]);
    selectShips([]);
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

  const isSelecting = roomState.status === "selecting";
  const isWaiting = roomState.status === "waiting";
  const hasSelection = selectedShips.length > 0;
  const fleetComplete = selectedShips.length === FLEET_SIZE;

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      containerClassName="bg-[#050505]"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleLeave}
          style={styles.backBtn}
          activeOpacity={0.6}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
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
                const isSelected = selectedShips.includes(ship.id);
                return (
                  <TouchableOpacity
                    key={ship.id}
                    onPress={() => handleToggleShip(ship.id)}
                    disabled={isReady}
                    activeOpacity={0.75}
                    style={[
                      styles.shipCard,
                      isSelected && styles.shipCardSelected,
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
                  </TouchableOpacity>
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

      {/* Bottom Action Bar - flex layout, NOT absolute */}
      {isSelecting && !isReady && hasSelection && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={handleClearSelection}
            activeOpacity={0.7}
            style={styles.btnBack}
          >
            <MaterialIcons name="refresh" size={22} color="#FFF" />
            <Text style={styles.btnBackText}>BACK</Text>
          </TouchableOpacity>

          {fleetComplete ? (
            <TouchableOpacity
              onPress={handleReady}
              activeOpacity={0.7}
              style={styles.btnOk}
            >
              <MaterialIcons name="check-circle" size={22} color="#000" />
              <Text style={styles.btnOkText}>READY</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.btnOkDisabled}>
              <Text style={styles.btnOkTextDisabled}>
                {selectedShips.length} / {FLEET_SIZE}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Waiting for opponent ready state */}
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
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
  connectionDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  scrollContent: { flex: 1 },
  scrollInner: { paddingBottom: 16 },
  playersSection: {
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
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
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  playerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
  },
  playerSlot: {
    fontSize: 9,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 2,
  },
  readyBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readyBadgeText: {
    fontSize: 9,
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
    gap: 12,
  },
  shipsGrid: {
    gap: 10,
  },
  shipCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 8,
  },
  shipCardSelected: {
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  shipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shipName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  shipStats: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#AAA",
  },
  shipDesc: {
    fontSize: 11,
    color: "#666",
    lineHeight: 15,
  },
  waitingSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 60,
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
    borderColor: "#222",
  },
  codeText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 4,
  },
  // Bottom action bar - flex layout, NOT absolute
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 24,
    backgroundColor: "#050505",
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  btnBack: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  btnBackText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  btnOk: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 14,
  },
  btnOkDisabled: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#222",
    paddingVertical: 16,
    borderRadius: 14,
  },
  btnOkText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 3,
  },
  btnOkTextDisabled: {
    fontSize: 15,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 2,
  },
  waitingReady: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1A1A1A",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  waitingReadyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
  },
});
