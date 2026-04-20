import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { BattleCanvas } from "@/components/game/BattleCanvas";
import { useGame } from "@/lib/stores/game-store";
import { SCENE_WIDTH, SCENE_HEIGHT, TICK_RATE } from "@/lib/game/constants";
import { Difficulty, GameEvent, Vector2 } from "@/lib/game/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useKeepAwake } from "expo-keep-awake";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DamagePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  isCritical: boolean;
}

export default function BattleScreen() {
  useKeepAwake();
  const router = useRouter();
  const params = useLocalSearchParams<{ difficulty: string; ships: string }>();
  const difficulty = (params.difficulty ?? "normal") as Difficulty;
  const shipIds = (params.ships ?? "vanguard,vanguard,vanguard").split(",");

  const {
    state: gameStore,
    startGame,
    programAction,
    setReady,
    selectUnit,
    setStep,
    setPendingMove,
    stopGame,
    tick,
  } = useGame();

  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  // Calculate scale to fit screen
  const maxCanvasWidth = SCREEN_WIDTH - 16;
  const maxCanvasHeight = SCREEN_HEIGHT - 200;
  const scale = Math.min(maxCanvasWidth / SCENE_WIDTH, maxCanvasHeight / SCENE_HEIGHT);

  // Start game
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startGame(difficulty, shipIds);
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameStore.gameState || gameStore.gameState.status !== "playing") return;

    tickRef.current = setInterval(() => {
      const events = tick();
      if (events.length > 0) {
        processEvents(events);
      }
    }, 1000 / TICK_RATE);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [gameStore.gameState?.status, tick]);

  // Navigate to results when game finishes
  useEffect(() => {
    if (gameStore.gameState?.status === "finished") {
      if (tickRef.current) clearInterval(tickRef.current);
      const gs = gameStore.gameState;
      const humanPlayer = gs.players["human-player"];
      const aiPlayer = gs.players["ai-player"];
      const result =
        gs.winner === 1 ? "victory" : gs.winner === 2 ? "defeat" : "draw";

      setTimeout(() => {
        router.replace({
          pathname: "/results",
          params: {
            result,
            turns: gs.currentTurn.toString(),
            playerDamage: humanPlayer?.stats.damageDealt.toString() ?? "0",
            playerShipsLost: humanPlayer?.stats.shipsLost.toString() ?? "0",
            aiDamage: aiPlayer?.stats.damageDealt.toString() ?? "0",
            aiShipsLost: aiPlayer?.stats.shipsLost.toString() ?? "0",
            difficulty,
          },
        } as any);
        stopGame();
      }, 1500);
    }
  }, [gameStore.gameState?.status]);

  const processEvents = useCallback((events: GameEvent[]) => {
    const newPopups: DamagePopup[] = [];
    for (const event of events) {
      if (event.type === "hit" && event.damage) {
        newPopups.push({
          id: `popup_${Date.now()}_${Math.random()}`,
          x: event.x,
          y: event.y - 15,
          text: event.isCritical ? `CRIT ${event.damage}` : `${event.damage}`,
          color: event.isCritical ? "#F59E0B" : "#FFF",
          opacity: 1,
          isCritical: event.isCritical ?? false,
        });
      }
      if (event.type === "ship_destroyed") {
        newPopups.push({
          id: `popup_${Date.now()}_${Math.random()}`,
          x: event.x,
          y: event.y - 20,
          text: "DESTROYED",
          color: "#EF4444",
          opacity: 1,
          isCritical: true,
        });
      }
    }
    if (newPopups.length > 0) {
      setDamagePopups((prev) => [...prev, ...newPopups]);
      setTimeout(() => {
        setDamagePopups((prev) =>
          prev.filter((p) => !newPopups.find((np) => np.id === p.id))
        );
      }, 1200);
    }
  }, []);

  // Touch handler for canvas
  const handleCanvasTap = useCallback(
    (x: number, y: number) => {
      if (!gameStore.gameState || gameStore.gameState.phase !== "programming") return;
      const myPlayer = gameStore.gameState.players["human-player"];
      if (!myPlayer) return;

      const sceneX = x / scale;
      const sceneY = y / scale;

      const { selectedUnitId, selectionStep } = gameStore;

      if (selectionStep === 0) {
        // Try to select a unit
        for (const person of myPlayer.persons) {
          if (person.life <= 0) continue;
          const dx = person.x - sceneX;
          const dy = person.y - sceneY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < person.size + 20) {
            selectUnit(person.id);
            setStep(1);
            return;
          }
        }
      } else if (selectionStep === 1 && selectedUnitId) {
        // Set move target
        setPendingMove({ x: sceneX, y: sceneY });
        setStep(2);
      } else if (selectionStep === 2 && selectedUnitId && gameStore.pendingMove) {
        // Set fire target and commit
        programAction(
          selectedUnitId,
          gameStore.pendingMove.x,
          gameStore.pendingMove.y,
          sceneX,
          sceneY
        );
        selectUnit(null);
        setStep(0);
        setPendingMove(null);
      }
    },
    [gameStore, scale, selectUnit, setStep, setPendingMove, programAction]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((e) => {
          handleCanvasTap(e.x, e.y);
        }),
    [handleCanvasTap]
  );

  const gs = gameStore.gameState;
  if (!gs) {
    return (
      <ScreenContainer containerClassName="bg-[#050505]">
        <View style={styles.loading}>
          <Text style={styles.loadingText}>INITIALIZING...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const myPlayer = gs.players["human-player"];
  const isProgramming = gs.phase === "programming";
  const allProgrammed =
    myPlayer?.persons.every(
      (p) => p.life <= 0 || (p.pendingMove && p.pendingFire)
    ) ?? false;

  const instructionText = (() => {
    if (!isProgramming) return "EXECUTING...";
    switch (gameStore.selectionStep) {
      case 0:
        return "TAP A SHIP TO SELECT";
      case 1:
        return "TAP TO SET MOVE TARGET";
      case 2:
        return "TAP TO SET FIRE TARGET";
      default:
        return "";
    }
  })();

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-[#050505]">
      {/* HUD Top */}
      <View style={styles.hudTop}>
        <View style={styles.hudLeft}>
          <Text style={styles.turnLabel}>TURN</Text>
          <Text style={styles.turnValue}>
            {gs.currentTurn}/{gs.maxTurns}
          </Text>
        </View>
        <View style={styles.hudCenter}>
          <Text
            style={[
              styles.phaseLabel,
              isProgramming ? styles.phaseProgramming : styles.phaseExecuting,
            ]}
          >
            {isProgramming ? "PROGRAM" : "EXECUTE"}
          </Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.timerLabel}>TIME</Text>
          <Text style={styles.timerValue}>{Math.ceil(gs.turnTime)}s</Text>
        </View>
      </View>

      {/* Battle Canvas */}
      <View style={styles.canvasContainer}>
        <GestureDetector gesture={tapGesture}>
          <View>
            <BattleCanvas
              gameState={gs}
              bullets={gameStore.bullets}
              selectedUnitId={gameStore.selectedUnitId}
              selectionStep={gameStore.selectionStep}
              pendingMove={gameStore.pendingMove}
              damagePopups={damagePopups}
              scale={scale}
            />
          </View>
        </GestureDetector>
      </View>

      {/* Instruction */}
      <View style={styles.instructionBar}>
        <Text style={styles.instructionText}>{instructionText}</Text>
      </View>

      {/* HUD Bottom */}
      <View style={styles.hudBottom}>
        {isProgramming ? (
          <View style={styles.actionRow}>
            {gameStore.selectedUnitId && (
              <Pressable
                onPress={() => {
                  selectUnit(null);
                  setStep(0);
                  setPendingMove(null);
                }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="close" size={18} color="#EF4444" />
                <Text style={styles.cancelText}>CANCEL</Text>
              </Pressable>
            )}
            <Pressable
              onPress={setReady}
              disabled={!allProgrammed}
              style={({ pressed }) => [
                styles.executeBtn,
                !allProgrammed && styles.executeBtnDisabled,
                pressed && allProgrammed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text
                style={[
                  styles.executeBtnText,
                  !allProgrammed && styles.executeBtnTextDisabled,
                ]}
              >
                {allProgrammed ? "EXECUTE ACTIONS" : "PROGRAM ALL SHIPS"}
              </Text>
              {allProgrammed && (
                <MaterialIcons name="play-arrow" size={20} color="#000" />
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.executingBar}>
            <View style={styles.executingDot} />
            <Text style={styles.executingText}>EXECUTING TURN...</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 3,
  },
  hudTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  hudLeft: {
    alignItems: "center",
  },
  hudCenter: {
    alignItems: "center",
  },
  hudRight: {
    alignItems: "center",
  },
  turnLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 2,
  },
  turnValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
  },
  phaseLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 3,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  phaseProgramming: {
    backgroundColor: "rgba(34,197,94,0.15)",
    color: "#22C55E",
  },
  phaseExecuting: {
    backgroundColor: "rgba(239,68,68,0.15)",
    color: "#EF4444",
  },
  timerLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 2,
  },
  timerValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
  },
  canvasContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  instructionBar: {
    alignItems: "center",
    paddingVertical: 6,
  },
  instructionText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 2,
  },
  hudBottom: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  cancelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EF4444",
    letterSpacing: 1,
  },
  executeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFF",
  },
  executeBtnDisabled: {
    backgroundColor: "#222",
  },
  executeBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  executeBtnTextDisabled: {
    color: "#555",
  },
  executingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  executingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  executingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EF4444",
    letterSpacing: 2,
  },
});
