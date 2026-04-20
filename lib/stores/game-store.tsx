import React, { createContext, useContext, useReducer, useCallback, useRef, useMemo } from "react";
import {
  GameState,
  Bullet,
  GameEvent,
  Difficulty,
  Person,
  Vector2,
  MatchHistoryEntry,
  UserStats,
} from "@/lib/game/types";
import {
  createInitialState,
  createPlayer,
  createFleet,
  createAIFleet,
  updateGame,
  startExecutionPhase,
  processAI,
} from "@/lib/game/engine";
import { TICK_INTERVAL, TICK_RATE } from "@/lib/game/constants";

interface GameStoreState {
  gameState: GameState | null;
  bullets: Bullet[];
  myId: string;
  events: GameEvent[];
  selectedUnitId: string | null;
  selectionStep: 0 | 1 | 2;
  pendingMove: Vector2 | null;
}

type GameAction =
  | { type: "SET_GAME_STATE"; state: GameState; bullets: Bullet[] }
  | { type: "ADD_EVENTS"; events: GameEvent[] }
  | { type: "CLEAR_EVENTS" }
  | { type: "SELECT_UNIT"; unitId: string | null }
  | { type: "SET_STEP"; step: 0 | 1 | 2 }
  | { type: "SET_PENDING_MOVE"; move: Vector2 | null }
  | { type: "RESET" };

function gameReducer(state: GameStoreState, action: GameAction): GameStoreState {
  switch (action.type) {
    case "SET_GAME_STATE":
      return { ...state, gameState: action.state, bullets: action.bullets };
    case "ADD_EVENTS":
      return { ...state, events: [...state.events, ...action.events] };
    case "CLEAR_EVENTS":
      return { ...state, events: [] };
    case "SELECT_UNIT":
      return { ...state, selectedUnitId: action.unitId };
    case "SET_STEP":
      return { ...state, selectionStep: action.step };
    case "SET_PENDING_MOVE":
      return { ...state, pendingMove: action.move };
    case "RESET":
      return {
        ...state,
        gameState: null,
        bullets: [],
        events: [],
        selectedUnitId: null,
        selectionStep: 0,
        pendingMove: null,
      };
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameStoreState;
  startGame: (difficulty: Difficulty, shipTypeIds: string[], powerups?: string[]) => void;
  programAction: (personId: string, moveX: number, moveY: number, fireX: number, fireY: number) => void;
  setReady: () => void;
  selectUnit: (unitId: string | null) => void;
  setStep: (step: 0 | 1 | 2) => void;
  setPendingMove: (move: Vector2 | null) => void;
  stopGame: () => void;
  tick: () => GameEvent[];
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    gameState: null,
    bullets: [],
    myId: "human-player",
    events: [],
    selectedUnitId: null,
    selectionStep: 0,
    pendingMove: null,
  });

  const gameRef = useRef<{ state: GameState; bullets: Bullet[] } | null>(null);

  const startGame = useCallback(
    (difficulty: Difficulty, shipTypeIds: string[], powerups: string[] = []) => {
      const gs = createInitialState(difficulty);
      const human = createPlayer("human-player", 1, "Commander");
      human.powerups = powerups;
      human.persons = createFleet(human, shipTypeIds);

      const ai = createPlayer("ai-player", 2, "AI Player");
      ai.persons = createAIFleet(difficulty);

      gs.players["human-player"] = human;
      gs.players["ai-player"] = ai;
      gs.status = "playing";
      gs.phase = "programming";

      const bullets: Bullet[] = [];
      gameRef.current = { state: gs, bullets };
      dispatch({ type: "SET_GAME_STATE", state: { ...gs }, bullets: [...bullets] });
    },
    []
  );

  const programAction = useCallback(
    (personId: string, moveX: number, moveY: number, fireX: number, fireY: number) => {
      if (!gameRef.current) return;
      const gs = gameRef.current.state;
      const player = gs.players["human-player"];
      if (!player) return;
      const person = player.persons.find((p) => p.id === personId);
      if (!person) return;

      person.pendingMove = { x: moveX, y: moveY };
      person.pendingFire = { x: fireX, y: fireY };
      dispatch({ type: "SET_GAME_STATE", state: { ...gs }, bullets: [...gameRef.current.bullets] });
    },
    []
  );

  const setReady = useCallback(() => {
    if (!gameRef.current) return;
    const gs = gameRef.current.state;
    const player = gs.players["human-player"];
    if (player) player.isReady = true;
    dispatch({ type: "SET_GAME_STATE", state: { ...gs }, bullets: [...gameRef.current.bullets] });
  }, []);

  const tick = useCallback((): GameEvent[] => {
    if (!gameRef.current) return [];
    const events = updateGame(gameRef.current.state, gameRef.current.bullets);
    dispatch({
      type: "SET_GAME_STATE",
      state: { ...gameRef.current.state },
      bullets: [...gameRef.current.bullets],
    });
    return events;
  }, []);

  const selectUnit = useCallback((unitId: string | null) => {
    dispatch({ type: "SELECT_UNIT", unitId });
  }, []);

  const setStep = useCallback((step: 0 | 1 | 2) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const setPendingMove = useCallback((move: Vector2 | null) => {
    dispatch({ type: "SET_PENDING_MOVE", move });
  }, []);

  const stopGame = useCallback(() => {
    gameRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  const value = useMemo(
    () => ({
      state,
      startGame,
      programAction,
      setReady,
      selectUnit,
      setStep,
      setPendingMove,
      stopGame,
      tick,
    }),
    [state, startGame, programAction, setReady, selectUnit, setStep, setPendingMove, stopGame, tick]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
