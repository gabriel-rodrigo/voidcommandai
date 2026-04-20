import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/constants/oauth";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomInfo,
  RoomState,
  GameSnapshot,
  GameEventData,
} from "@/shared/multiplayer-types";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function getSocketUrl(): string {
  const base = getApiBaseUrl();
  if (base) return base;
  return "http://localhost:3000";
}

export interface UseSocketReturn {
  connected: boolean;
  socket: TypedSocket | null;
  rooms: RoomInfo[];
  roomState: RoomState | null;
  gameSnapshot: GameSnapshot | null;
  gameEvents: GameEventData[];
  gamePhase: { phase: string; turnTime: number; currentTurn: number } | null;
  gameFinished: { winner: number; snapshot: GameSnapshot } | null;
  error: string | null;
  createRoom: (playerName: string, password?: string) => Promise<{ ok: boolean; roomId?: string; error?: string }>;
  joinRoom: (roomId: string, playerName: string, password?: string) => Promise<{ ok: boolean; error?: string }>;
  leaveRoom: () => void;
  refreshRooms: () => void;
  selectShips: (ships: string[]) => void;
  markReady: () => void;
  programAction: (personId: string, moveX: number, moveY: number, fireX: number, fireY: number) => void;
  confirmTurn: () => void;
  clearGameFinished: () => void;
  clearError: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameSnapshot, setGameSnapshot] = useState<GameSnapshot | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEventData[]>([]);
  const [gamePhase, setGamePhase] = useState<{ phase: string; turnTime: number; currentTurn: number } | null>(null);
  const [gameFinished, setGameFinished] = useState<{ winner: number; snapshot: GameSnapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = getSocketUrl();
    console.log("[Socket] Connecting to:", url);

    const socket: TypedSocket = io(url, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    }) as any;

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      setConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.log("[Socket] Connection error:", err.message);
      setError("Connection failed. Retrying...");
    });

    // Room events
    socket.on("room:state", (state) => {
      setRoomState(state);
    });

    socket.on("room:listUpdate", (list) => {
      setRooms(list);
    });

    socket.on("room:playerJoined", () => {
      // Room state update will follow
    });

    socket.on("room:playerLeft", () => {
      // Room state update will follow
    });

    // Game events
    socket.on("game:start", () => {
      setGameFinished(null);
    });

    socket.on("game:snapshot", (snapshot) => {
      setGameSnapshot(snapshot);
    });

    socket.on("game:events", (events) => {
      setGameEvents(events);
    });

    socket.on("game:phaseChange", (data) => {
      setGamePhase(data);
    });

    socket.on("game:finished", (data) => {
      setGameFinished(data);
    });

    socket.on("error", (msg) => {
      setError(msg);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const createRoom = useCallback(
    (playerName: string, password?: string): Promise<{ ok: boolean; roomId?: string; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current?.connected) {
          resolve({ ok: false, error: "Not connected" });
          return;
        }
        socketRef.current.emit(
          "room:create",
          { roomName: "", playerName, password },
          (res) => {
            resolve(res);
          }
        );
      });
    },
    []
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string, password?: string): Promise<{ ok: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current?.connected) {
          resolve({ ok: false, error: "Not connected" });
          return;
        }
        socketRef.current.emit(
          "room:join",
          { roomId, playerName, password },
          (res) => {
            resolve(res);
          }
        );
      });
    },
    []
  );

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("room:leave");
    setRoomState(null);
    setGameSnapshot(null);
    setGameEvents([]);
    setGamePhase(null);
    setGameFinished(null);
  }, []);

  const refreshRooms = useCallback(() => {
    socketRef.current?.emit("room:list", (list) => {
      setRooms(list);
    });
  }, []);

  const selectShips = useCallback((ships: string[]) => {
    socketRef.current?.emit("game:selectShips", { ships });
  }, []);

  const markReady = useCallback(() => {
    socketRef.current?.emit("game:ready");
  }, []);

  const programAction = useCallback(
    (personId: string, moveX: number, moveY: number, fireX: number, fireY: number) => {
      socketRef.current?.emit("game:programAction", { personId, moveX, moveY, fireX, fireY });
    },
    []
  );

  const confirmTurn = useCallback(() => {
    socketRef.current?.emit("game:confirmTurn");
  }, []);

  const clearGameFinished = useCallback(() => {
    setGameFinished(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connected,
    socket: socketRef.current,
    rooms,
    roomState,
    gameSnapshot,
    gameEvents,
    gamePhase,
    gameFinished,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRooms,
    selectShips,
    markReady,
    programAction,
    confirmTurn,
    clearGameFinished,
    clearError,
  };
}
