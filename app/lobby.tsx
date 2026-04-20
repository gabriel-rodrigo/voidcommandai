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
  Modal,
  KeyboardAvoidingView,
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
  const [showCreate, setShowCreate] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Password modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);

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

    const pw = roomPassword.trim() || undefined;
    const res = await createRoom(playerName.trim(), pw);

    if (!res.ok) {
      setLocalError(res.error ?? "Failed to create room");
    } else {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setRoomPassword("");
      setShowCreate(false);
    }
    setIsCreating(false);
  };

  const handleJoinRoom = async (roomId: string, hasPassword: boolean) => {
    if (!playerName.trim()) {
      setLocalError("Enter your callsign first");
      return;
    }

    // If room has password, show modal
    if (hasPassword) {
      setPendingJoinRoomId(roomId);
      setPasswordInput("");
      setPasswordModalVisible(true);
      return;
    }

    await doJoinRoom(roomId);
  };

  const doJoinRoom = async (roomId: string, password?: string) => {
    setIsJoining(roomId);
    setLocalError(null);
    await AsyncStorage.setItem(PLAYER_NAME_KEY, playerName.trim());

    const res = await joinRoom(roomId, playerName.trim(), password);

    if (!res.ok) {
      setLocalError(res.error ?? "Failed to join room");
    } else {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    setIsJoining(null);
  };

  const handlePasswordSubmit = async () => {
    if (!pendingJoinRoomId) return;
    setPasswordModalVisible(false);
    await doJoinRoom(pendingJoinRoomId, passwordInput.trim());
    setPendingJoinRoomId(null);
    setPasswordInput("");
  };

  const handleBackToMenu = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace("/(tabs)" as any);
  };

  const renderRoom = useCallback(
    ({ item }: { item: RoomInfo }) => {
      const isJoiningThis = isJoining === item.id;
      return (
        <Pressable
          onPress={() => handleJoinRoom(item.id, item.hasPassword)}
          disabled={isJoiningThis || item.playerCount >= 2}
          style={({ pressed }) => [
            styles.roomCard,
            pressed && { opacity: 0.7 },
            item.playerCount >= 2 && styles.roomCardFull,
          ]}
        >
          <View style={styles.roomInfo}>
            <View style={styles.roomNameRow}>
              {item.hasPassword && (
                <MaterialIcons name="lock" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.roomName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
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
          onPress={handleBackToMenu}
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
          <View style={styles.createInfo}>
            <MaterialIcons name="info-outline" size={14} color="#555" />
            <Text style={styles.createInfoText}>
              A random name will be assigned to your room
            </Text>
          </View>
          <View style={styles.passwordRow}>
            <MaterialIcons name="lock-outline" size={16} color="#666" />
            <TextInput
              style={styles.passwordInput}
              value={roomPassword}
              onChangeText={setRoomPassword}
              placeholder="Room password (optional)"
              placeholderTextColor="#444"
              maxLength={20}
              secureTextEntry
              returnKeyType="done"
            />
          </View>
          <View style={styles.createActions}>
            <Pressable
              onPress={() => {
                setShowCreate(false);
                setRoomPassword("");
              }}
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

      {/* Back to Menu Button (bottom) */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleBackToMenu}
          style={({ pressed }) => [
            styles.menuBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="home" size={18} color="#888" />
          <Text style={styles.menuBtnText}>MAIN MENU</Text>
        </Pressable>
      </View>

      {/* Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPasswordModalVisible(false);
          setPendingJoinRoomId(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="lock" size={24} color="#F59E0B" />
              <Text style={styles.modalTitle}>Password Required</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              This room is password-protected. Enter the password to join.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Enter password..."
              placeholderTextColor="#444"
              secureTextEntry
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handlePasswordSubmit}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setPasswordModalVisible(false);
                  setPendingJoinRoomId(null);
                }}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable
                onPress={handlePasswordSubmit}
                disabled={!passwordInput.trim()}
                style={({ pressed }) => [
                  styles.modalJoinBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  !passwordInput.trim() && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.modalJoinText}>JOIN</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  createInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  createInfoText: {
    fontSize: 11,
    color: "#555",
    fontStyle: "italic",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
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
  roomNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DDD",
    flex: 1,
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
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  menuBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#888",
    letterSpacing: 1,
  },
  // Password Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#222",
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: "#0a0a0a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#222",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#222",
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 1,
  },
  modalJoinBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#EF4444",
  },
  modalJoinText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
});
