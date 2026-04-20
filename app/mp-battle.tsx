import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSocket } from "@/hooks/use-socket";
import { BattleCanvas } from "@/components/game/BattleCanvas";
import { SCENE_WIDTH, SCENE_HEIGHT } from "@/lib/game/constants";
import * as Haptics from "expo-haptics";
import type { GameSnapshot, GameEventData } from "@/shared/multiplayer-types";

interface DamagePopup {
  id: string;
  x: number;
  y: number;
  damage: number;
  isCritical: boolean;
  createdAt: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_WIDTH = SCREEN_WIDTH;
const CANVAS_HEIGHT = CANVAS_WIDTH * (SCENE_HEIGHT / SCENE_WIDTH);

export default function MpBattleScreen() {
  const router = useRouter();
  const {
    socket,
    roomState,
    gameSnapshot,
    gameEvents,
    gamePhase,
    gameFinished,
    programAction,
    confirmTurn,
    leaveRoom,
    clearGameFinished,
  } = useSocket();

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectionStep, setSelectionStep] = useState<0 | 1 | 2>(0);
  const [pendingMove, setPendingMove] = useState<{ x: number; y: number } | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const popupIdRef = useRef(0);

  // My socket id for identifying which player I am
  const mySocketId = socket?.id ?? "";

  // Process game events into damage popups
  useEffect(() => {
    if (gameEvents.length === 0) return;
    const scaleX = CANVAS_WIDTH / SCENE_WIDTH;
    const scaleY = CANVAS_HEIGHT / SCENE_HEIGHT;

    const newPopups: DamagePopup[] = gameEvents
      .filter((e) => e.type === "hit" && e.damage)
      .map((e) => ({
        id: `popup_${++popupIdRef.current}`,
        x: e.x * scaleX,
        y: e.y * scaleY,
        damage: e.damage!,
        isCritical: e.isCritical ?? false,
        createdAt: Date.now(),
      }));

    if (newPopups.length > 0) {
      setDamagePopups((prev) => [...prev, ...newPopups]);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [gameEvents]);

  // Clear old popups
  useEffect(() => {
    const interval = setInterval(() => {
      setDamagePopups((prev) =>
        prev.filter((p) => Date.now() - p.createdAt < 1500)
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Reset confirmed state on new programming phase
  useEffect(() => {
    if (gamePhase?.phase === "programming") {
      setIsConfirmed(false);
      setSelectedUnitId(null);
      setSelectionStep(0);
      setPendingMove(null);
    }
  }, [gamePhase?.phase, gamePhase?.currentTurn]);

  // Handle game finished
  useEffect(() => {
    if (gameFinished) {
      const myPlayer = gameFinished.snapshot.players[mySocketId];
      const opponentId = Object.keys(gameFinished.snapshot.players).find(
        (id) => id !== mySocketId
      );
      const opPlayer = opponentId
        ? gameFinished.snapshot.players[opponentId]
        : null;

      let result: "victory" | "defeat" | "draw" = "draw";
      if (gameFinished.winner === 0) {
        result = "draw";
      } else if (myPlayer && myPlayer.slot === gameFinished.winner) {
        result = "victory";
      } else {
        result = "defeat";
      }

      const myStats = myPlayer?.stats;
      const opStats = opPlayer?.stats;

      // Navigate to results with params compatible with results.tsx
      router.replace({
        pathname: "/results",
        params: {
          result,
          turns: String(gameFinished.snapshot.currentTurn),
          playerDamage: String(myStats?.damageDealt ?? 0),
          playerShipsLost: String(myStats?.shipsLost ?? 0),
          aiDamage: String(opStats?.damageDealt ?? 0),
          aiShipsLost: String(opStats?.shipsLost ?? 0),
          difficulty: "normal",
        },
      } as any);

      leaveRoom();
      clearGameFinished();
    }
  }, [gameFinished]);

  // Convert snapshot to game-store compatible format for BattleCanvas
  const canvasGameState = gameSnapshot
    ? {
        players: Object.fromEntries(
          Object.entries(gameSnapshot.players).map(([id, p]) => [
            id,
            {
              ...p,
              credits: 0,
              powerups: [] as string[],
              persons: p.persons.map((u) => ({
                ...u,
                speed: 0,
                defense: 0,
                moveDistance: 0,
                weapons: [],
              })),
            },
          ])
        ),
        status: gameSnapshot.status as any,
        mode: "multiplayer" as const,
        difficulty: "normal" as const,
        winner: gameSnapshot.winner,
        turnTime: gameSnapshot.turnTime,
        phase: gameSnapshot.phase as any,
        currentTurn: gameSnapshot.currentTurn,
        maxTurns: gameSnapshot.maxTurns,
      }
    : null;

  const canvasBullets = gameSnapshot?.bullets ?? [];

  // Find my player and opponent
  const myPlayer = gameSnapshot?.players[mySocketId];
  const opponentId = gameSnapshot
    ? Object.keys(gameSnapshot.players).find((id) => id !== mySocketId)
    : null;
  const opPlayer = opponentId ? gameSnapshot?.players[opponentId] : null;

  const myAlive = myPlayer?.persons.filter((u) => u.life > 0).length ?? 0;
  const opAlive = opPlayer?.persons.filter((u) => u.life > 0).length ?? 0;

  const phase = gamePhase?.phase ?? gameSnapshot?.phase ?? "programming";
  const turnTime = gamePhase?.turnTime ?? gameSnapshot?.turnTime ?? 0;
  const currentTurn = gamePhase?.currentTurn ?? gameSnapshot?.currentTurn ?? 1;
  const maxTurns = gameSnapshot?.maxTurns ?? 10;

  // Handle canvas tap
  const handleCanvasTap = useCallback(
    (x: number, y: number) => {
      if (phase !== "programming" || isConfirmed || !myPlayer) return;

      const scaleX = SCENE_WIDTH / CANVAS_WIDTH;
      const scaleY = SCENE_HEIGHT / CANVAS_HEIGHT;
      const gameX = x * scaleX;
      const gameY = y * scaleY;

      if (selectionStep === 0) {
        // Try to select own unit
        const unit = myPlayer.persons.find((u) => {
          if (u.life <= 0) return false;
          const dx = u.x - gameX;
          const dy = u.y - gameY;
          return Math.sqrt(dx * dx + dy * dy) < u.size + 20;
        });
        if (unit) {
          setSelectedUnitId(unit.id);
          setSelectionStep(1);
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      } else if (selectionStep === 1) {
        // Set move target
        setPendingMove({ x: gameX, y: gameY });
        setSelectionStep(2);
      } else if (selectionStep === 2 && selectedUnitId && pendingMove) {
        // Set fire target and send action
        programAction(
          selectedUnitId,
          pendingMove.x,
          pendingMove.y,
          gameX,
          gameY
        );
        setSelectedUnitId(null);
        setSelectionStep(0);
        setPendingMove(null);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    },
    [phase, isConfirmed, myPlayer, selectionStep, selectedUnitId, pendingMove]
  );

  const handleConfirmTurn = () => {
    confirmTurn();
    setIsConfirmed(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const handleCancelSelection = () => {
    setSelectedUnitId(null);
    setSelectionStep(0);
    setPendingMove(null);
  };

  const handleForfeit = () => {
    leaveRoom();
    router.replace("/(tabs)" as any);
  };

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      containerClassName="bg-[#050505]"
    >
      {/* Top HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.hudLabel}>YOU</Text>
          <Text style={styles.hudValue}>{myAlive} ships</Text>
        </View>
        <View style={styles.hudCenter}>
          <Text style={styles.turnText}>
            TURN {currentTurn}/{maxTurns}
          </Text>
          <Text style={styles.phaseText}>
            {phase === "programming" ? "PROGRAM" : "EXECUTE"}
          </Text>
          <Text style={styles.timerText}>{Math.max(0, turnTime).toFixed(1)}s</Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.hudLabel}>ENEMY</Text>
          <Text style={styles.hudValue}>{opAlive} ships</Text>
        </View>
      </View>

      {/* Battle Canvas */}
      <Pressable
        onPress={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          handleCanvasTap(locationX, locationY);
        }}
        style={styles.canvasContainer}
      >
        {canvasGameState && (
          <BattleCanvas
            gameState={canvasGameState}
            bullets={canvasBullets}
            myId={mySocketId}
            selectedUnitId={selectedUnitId}
            pendingMove={pendingMove}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          />
        )}

        {/* Damage popups */}
        {damagePopups.map((popup) => (
          <View
            key={popup.id}
            style={[
              styles.damagePopup,
              {
                left: popup.x - 20,
                top: popup.y - 20 - (Date.now() - popup.createdAt) * 0.03,
                opacity: Math.max(0, 1 - (Date.now() - popup.createdAt) / 1500),
              },
            ]}
          >
            <Text
              style={[
                styles.damageText,
                popup.isCritical && styles.criticalText,
              ]}
            >
              {popup.isCritical ? "CRIT " : ""}-{popup.damage}
            </Text>
          </View>
        ))}
      </Pressable>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        {phase === "programming" ? (
          <>
            {/* Selection hint */}
            <View style={styles.hintRow}>
              <Text style={styles.hintText}>
                {selectionStep === 0
                  ? "Tap a ship to select"
                  : selectionStep === 1
                  ? "Tap to set move target"
                  : "Tap to set fire target"}
              </Text>
              {selectionStep > 0 && (
                <Pressable
                  onPress={handleCancelSelection}
                  style={({ pressed }) => [
                    styles.cancelSelBtn,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.cancelSelText}>CANCEL</Text>
                </Pressable>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleForfeit}
                style={({ pressed }) => [
                  styles.forfeitBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="flag" size={16} color="#EF4444" />
                <Text style={styles.forfeitText}>FORFEIT</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmTurn}
                disabled={isConfirmed}
                style={({ pressed }) => [
                  styles.readyBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  isConfirmed && { opacity: 0.4 },
                ]}
              >
                <MaterialIcons
                  name={isConfirmed ? "hourglass-empty" : "check-circle"}
                  size={18}
                  color="#000"
                />
                <Text style={styles.readyBtnText}>
                  {isConfirmed ? "WAITING..." : "CONFIRM"}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.executingRow}>
            <MaterialIcons name="play-circle-fill" size={20} color="#EF4444" />
            <Text style={styles.executingText}>EXECUTING COMMANDS...</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hud: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  hudLeft: { flex: 1, alignItems: "flex-start" },
  hudCenter: { alignItems: "center", gap: 2 },
  hudRight: { flex: 1, alignItems: "flex-end" },
  hudLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 2,
  },
  hudValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DDD",
  },
  turnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#888",
    letterSpacing: 1,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 2,
  },
  timerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    position: "relative",
  },
  damagePopup: {
    position: "absolute",
    zIndex: 100,
  },
  damageText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FF6B6B",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  criticalText: {
    fontSize: 15,
    color: "#FFD700",
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#111",
    gap: 8,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hintText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
  cancelSelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
  },
  cancelSelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#888",
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  forfeitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  forfeitText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EF4444",
    letterSpacing: 1,
  },
  readyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 12,
  },
  readyBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  executingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  executingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 1,
  },
});
