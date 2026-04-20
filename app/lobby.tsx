import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSocket } from "@/hooks/use-socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import type { RoomInfo } from "@/shared/multiplayer-types";

const PLAYER_NAME_KEY = "@voidcommand_player_name";

export default function LobbyScreen() {
  const router = useRouter();
  const {
    connected,
    rooms,
    roomState,
    error,
    createRoom,
    joinRoom,
    refreshRooms,
    clearError,
  } = useSocket();

  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Load saved player name
  useEffect(() => {
    AsyncStorage.getItem(PLAYER_NAME_KEY).then((name) => {
      if (name) setPlayerName(name);
    });
  }, []);

  // Refresh rooms on mount and periodically
  useEffect(() => {
    if (connected) {
      refreshRooms();
      const interval = setInterval(refreshRooms, 3000);
      return () => clearInterval(interval);
    }
  }, [connected, refreshRooms]);

  // Navigate to waiting room when we join a room
  useEffect(() => {
    if (roomState) {
      router.push("/waiting-room" as any);
    }
  }, [roomState]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setLocalError("Enter your callsign first");
      return;
    }
    setIsCreating(true);
    setLocalError(null);
    await AsyncStorage.setItem(PLAYER_NAME_KEY, playerName.trim());

    const res = await createRoom(
      roomName.trim() || `${playerName.trim()}'s Room`,
      playerName.trim()
    );

    if (!res.ok) {
      setLocalError(res.error ?? "Failed to create room");
    } else {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
    setIsCreating(false);
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!playerName.trim()) {
      setLocalError("Enter your callsign first");
      return;
    }
    setIsJoining(roomId);
    setLocalError(null);
    await AsyncStorage.setItem(PLAYER_NAME_KEY, playerName.trim());

    const res = await joinRoom(roomId, playerName.trim());

    if (!res.ok) {
      setLocalError(res.error ?? "Failed to join room");
    } else {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    setIsJoining(null);
  };

  const renderRoom = useCallback(
    ({ item }: { item: RoomInfo }) => {
      const isJoiningThis = isJoining === item.id;
      return (
        <Pressable
          onPress={() => handleJoinRoom(item.id)}
          disabled={isJoiningThis || item.playerCount >= 2}
          style={({ pressed }) => [
            styles.roomCard,
            pressed && { opacity: 0.7 },
            item.playerCount >= 2 && styles.roomCardFull,
          ]}
        >
          <View style={styles.roomInfo}>
            <Text style={styles.roomName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.roomHost}>
              Host: {item.hostName}
            </Text>
          </View>
          <View style={styles.roomRight}>
            <View style={styles.playerCount}>
              <MaterialIcons name="person" size={14} color="#888" />
              <Text style={styles.playerCountText}>
                {item.playerCount}/2
              </Text>
            </View>
            {item.playerCount < 2 ? (
              isJoiningThis ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <View style={styles.joinBadge}>
                  <Text style={styles.joinBadgeText}>JOIN</Text>
                </View>
              )
            ) : (
              <View style={styles.fullBadge}>
                <Text style={styles.fullBadgeText}>FULL</Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [isJoining, playerName]
  );

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-[#050505]"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>MULTIPLAYER</Text>
        <View style={styles.connectionDot}>
          <View
            style={[
              styles.dot,
              { backgroundColor: connected ? "#22C55E" : "#EF4444" },
            ]}
          />
          <Text style={styles.connectionText}>
            {connected ? "ONLINE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      {/* Player Name Input */}
      <View style={styles.nameSection}>
        <Text style={styles.nameLabel}>YOUR CALLSIGN</Text>
        <TextInput
          style={styles.nameInput}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter callsign..."
          placeholderTextColor="#444"
          maxLength={20}
          returnKeyType="done"
        />
      </View>

      {/* Error */}
      {(localError || error) && (
        <Pressable
          onPress={() => {
            setLocalError(null);
            clearError();
          }}
          style={styles.errorBanner}
        >
          <MaterialIcons name="error-outline" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{localError || error}</Text>
          <MaterialIcons name="close" size={14} color="#666" />
        </Pressable>
      )}

      {/* Create Room */}
      {showCreate ? (
        <View style={styles.createSection}>
          <TextInput
            style={styles.roomNameInput}
            value={roomName}
            onChangeText={setRoomName}
            placeholder="Room name (optional)..."
            placeholderTextColor="#444"
            maxLength={30}
            returnKeyType="done"
          />
          <View style={styles.createActions}>
            <Pressable
              onPress={() => setShowCreate(false)}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </Pressable>
            <Pressable
              onPress={handleCreateRoom}
              disabled={isCreating || !connected}
              style={({ pressed }) => [
                styles.confirmCreateBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                (!connected || isCreating) && { opacity: 0.4 },
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.confirmCreateBtnText}>CREATE</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowCreate(true)}
          disabled={!connected}
          style={({ pressed }) => [
            styles.createBtn,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            !connected && { opacity: 0.4 },
          ]}
        >
          <MaterialIcons name="add" size={20} color="#000" />
          <Text style={styles.createBtnText}>CREATE ROOM</Text>
        </Pressable>
      )}

      {/* Room List */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>AVAILABLE ROOMS</Text>
        <Text style={styles.listCount}>{rooms.length}</Text>
      </View>

      {!connected ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.emptyText}>Connecting to server...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="wifi-tethering" size={48} color="#222" />
          <Text style={styles.emptyTitle}>No Rooms Available</Text>
          <Text style={styles.emptyText}>
            Create a room and wait for an opponent
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refreshRooms}
              tintColor="#EF4444"
            />
          }
        />
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
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
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
  connectionText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 1,
  },
  nameSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  nameLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 2,
  },
  nameInput: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#EF4444",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  createSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  roomNameInput: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  createActions: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 1,
  },
  confirmCreateBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  confirmCreateBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 1,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  listTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 2,
  },
  listCount: {
    fontSize: 12,
    fontWeight: "900",
    color: "#444",
    backgroundColor: "#111",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 8,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  roomCardFull: {
    opacity: 0.5,
  },
  roomInfo: {
    flex: 1,
    gap: 4,
  },
  roomName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DDD",
  },
  roomHost: {
    fontSize: 11,
    color: "#666",
  },
  roomRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  playerCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  playerCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
  },
  joinBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  joinBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  fullBadge: {
    backgroundColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: "900",
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
  emptyText: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },
});
