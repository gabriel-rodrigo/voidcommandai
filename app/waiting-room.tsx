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
                const isSelected = selectedShips.includes(ship.id);
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

      {/* Floating Action Buttons (ship selection phase, not ready yet) */}
      {isSelecting && !isReady && hasSelection && (
        <View style={styles.floatingBar}>
          <Pressable
            onPress={handleClearSelection}
            style={({ pressed }) => [
              styles.floatingBtnBack,
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
          >
            <MaterialIcons name="refresh" size={20} color="#FFF" />
            <Text style={styles.floatingBtnBackText}>BACK</Text>
          </Pressable>

          <Pressable
            onPress={handleReady}
            disabled={!fleetComplete}
            style={({ pressed }) => [
              styles.floatingBtnOk,
              !fleetComplete && styles.floatingBtnOkDisabled,
              pressed && fleetComplete && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text
              style={[
                styles.floatingBtnOkText,
                !fleetComplete && styles.floatingBtnOkTextDisabled,
              ]}
            >
              {fleetComplete ? "OK" : `${selectedShips.length}/${FLEET_SIZE}`}
            </Text>
            {fleetComplete && (
              <MaterialIcons name="check-circle" size={20} color="#000" />
            )}
          </Pressable>
        </View>
      )}

      {/* Waiting for opponent ready state */}
      {isSelecting && isReady && (
        <View style={styles.floatingBar}>
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
  scrollInner: { paddingBottom: 120 },
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
  // Floating action buttons
  floatingBar: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 12,
  },
  floatingBtnBack: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(30,30,30,0.95)",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingBtnBackText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  floatingBtnOk: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingBtnOkDisabled: {
    backgroundColor: "#333",
    shadowOpacity: 0,
    elevation: 0,
  },
  floatingBtnOkText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  floatingBtnOkTextDisabled: {
    color: "#666",
  },
  waitingReady: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(30,30,30,0.95)",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  waitingReadyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
  },
});
