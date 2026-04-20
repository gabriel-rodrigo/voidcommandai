import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AdBanner } from "@/components/game/AdBanner";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SHIP_TYPES_LIST, FLEET_SIZE } from "@/lib/game/constants";
import { ShipType, Difficulty } from "@/lib/game/types";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ShipyardScreen() {
  const router = useRouter();
  const { difficulty = "normal" } = useLocalSearchParams<{ difficulty: string }>();
  const [selectedShips, setSelectedShips] = useState<string[]>([]);

  const toggleShip = useCallback(
    (shipId: string) => {
      setSelectedShips((prev) => {
        if (prev.includes(shipId)) {
          return prev.filter((id) => id !== shipId);
        }
        if (prev.length >= FLEET_SIZE) return prev;
        return [...prev, shipId];
      });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    []
  );

  const handleConfirm = () => {
    if (selectedShips.length !== FLEET_SIZE) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: "/battle",
      params: {
        difficulty,
        ships: selectedShips.join(","),
      },
    } as any);
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedShips([]);
  };

  const hasSelection = selectedShips.length > 0;
  const fleetComplete = selectedShips.length === FLEET_SIZE;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#050505]">
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>SHIPYARD</Text>
          <Text style={styles.headerSub}>
            Select {FLEET_SIZE} ships for your fleet
          </Text>
        </View>
      </View>

      {/* Fleet slots */}
      <View style={styles.slotsRow}>
        {Array.from({ length: FLEET_SIZE }).map((_, i) => {
          const shipId = selectedShips[i];
          const ship = shipId
            ? SHIP_TYPES_LIST.find((s) => s.id === shipId)
            : null;
          return (
            <View
              key={i}
              style={[
                styles.slot,
                ship ? styles.slotFilled : styles.slotEmpty,
              ]}
            >
              {ship ? (
                <>
                  <MaterialIcons name="rocket-launch" size={18} color="#EF4444" />
                  <Text style={styles.slotName}>{ship.name}</Text>
                </>
              ) : (
                <Text style={styles.slotPlaceholder}>Slot {i + 1}</Text>
              )}
            </View>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.shipList}
        showsVerticalScrollIndicator={false}
      >
        {SHIP_TYPES_LIST.map((ship) => {
          const isSelected = selectedShips.includes(ship.id);
          return (
            <Pressable
              key={ship.id}
              onPress={() => toggleShip(ship.id)}
              style={({ pressed }) => [
                styles.shipCard,
                isSelected && styles.shipCardSelected,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.shipHeader}>
                <View style={styles.shipNameRow}>
                  <MaterialIcons
                    name="rocket-launch"
                    size={20}
                    color={isSelected ? "#EF4444" : "#666"}
                  />
                  <Text
                    style={[
                      styles.shipName,
                      isSelected && styles.shipNameSelected,
                    ]}
                  >
                    {ship.name}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <MaterialIcons name="check" size={14} color="#FFF" />
                  </View>
                )}
              </View>

              <Text style={styles.shipDesc}>{ship.description}</Text>

              <View style={styles.statsGrid}>
                <StatBar label="HP" value={ship.life} max={200} color="#22C55E" />
                <StatBar label="SPD" value={ship.speed} max={170} color="#3B82F6" />
                <StatBar label="DEF" value={ship.defense} max={20} color="#EAB308" />
                <StatBar label="DMG" value={ship.damage} max={40} color="#EF4444" />
                <StatBar label="RNG" value={ship.range} max={500} color="#A855F7" />
                <StatBar label="MOV" value={ship.moveDistance} max={300} color="#06B6D4" />
              </View>
            </Pressable>
          );
        })}

        <View style={styles.adContainer}>
          <AdBanner size="small" />
        </View>
      </ScrollView>

      {/* Floating Action Buttons */}
      {hasSelection && (
        <View style={styles.floatingBar}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.floatingBtnBack,
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
          >
            <MaterialIcons name="refresh" size={20} color="#FFF" />
            <Text style={styles.floatingBtnBackText}>BACK</Text>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
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
              <MaterialIcons name="chevron-right" size={20} color="#000" />
            )}
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={statStyles.container}>
      <Text style={statStyles.label}>{label}</Text>
      <View style={statStyles.barBg}>
        <View
          style={[
            statStyles.barFill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "48%",
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    color: "#666",
    width: 28,
    letterSpacing: 1,
  },
  barBg: {
    flex: 1,
    height: 4,
    backgroundColor: "#222",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  value: {
    fontSize: 9,
    fontWeight: "700",
    color: "#888",
    width: 24,
    textAlign: "right",
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    color: "#666",
    marginTop: 1,
  },
  slotsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  slot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  slotFilled: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  slotEmpty: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: "#222",
    borderStyle: "dashed",
  },
  slotName: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EF4444",
    letterSpacing: 1,
  },
  slotPlaceholder: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
  },
  shipList: {
    padding: 16,
    gap: 12,
    paddingBottom: 120,
  },
  shipCard: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222",
    gap: 10,
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
  shipNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shipName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  shipNameSelected: {
    color: "#EF4444",
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  shipDesc: {
    fontSize: 11,
    color: "#888",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  adContainer: {
    marginTop: 8,
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
    // Shadow
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
    // Shadow
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
});
