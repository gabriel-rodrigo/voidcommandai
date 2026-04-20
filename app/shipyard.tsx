import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AdBanner } from "@/components/game/AdBanner";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SHIP_TYPES_LIST, FLEET_SIZE } from "@/lib/game/constants";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ShipyardScreen() {
  const router = useRouter();
  const { difficulty = "normal" } = useLocalSearchParams<{
    difficulty: string;
  }>();
  const [selectedShips, setSelectedShips] = useState<string[]>([]);

  const toggleShip = useCallback((shipId: string) => {
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
  }, []);

  const handleConfirm = useCallback(() => {
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
  }, [selectedShips, difficulty, router]);

  const handleClearSelection = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedShips([]);
  }, []);

  const hasSelection = selectedShips.length > 0;
  const fleetComplete = selectedShips.length === FLEET_SIZE;

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-[#050505]"
    >
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.6}
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerSub}>
            {difficulty.toUpperCase()} MODE
          </Text>
        </View>
      </View>

      {/* Big Title */}
      <View style={styles.titleSection}>
        <Text style={styles.bigTitle}>SHIPYARD</Text>
        <Text style={styles.titleSub}>
          Select {FLEET_SIZE} ships for your fleet
        </Text>
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
                  <MaterialIcons
                    name="rocket-launch"
                    size={14}
                    color="#EF4444"
                  />
                  <Text style={styles.slotName} numberOfLines={1}>
                    {ship.name}
                  </Text>
                </>
              ) : (
                <Text style={styles.slotPlaceholder}>{i + 1}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Ship list */}
      <ScrollView
        contentContainerStyle={[
          styles.shipList,
          hasSelection && { paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {SHIP_TYPES_LIST.map((ship) => {
          const isSelected = selectedShips.includes(ship.id);
          return (
            <TouchableOpacity
              key={ship.id}
              onPress={() => toggleShip(ship.id)}
              activeOpacity={0.75}
              style={[
                styles.shipCard,
                isSelected && styles.shipCardSelected,
              ]}
            >
              <View style={styles.shipCardHeader}>
                <View style={styles.shipNameRow}>
                  <MaterialIcons
                    name="rocket-launch"
                    size={18}
                    color={isSelected ? "#EF4444" : "#555"}
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
                  <View style={styles.checkBadge}>
                    <MaterialIcons name="check" size={13} color="#FFF" />
                  </View>
                )}
              </View>

              <Text style={styles.shipDesc} numberOfLines={2}>
                {ship.description}
              </Text>

              <View style={styles.statsRow}>
                <MiniStat label="HP" value={ship.life} color="#22C55E" />
                <MiniStat label="SPD" value={ship.speed} color="#3B82F6" />
                <MiniStat label="DEF" value={ship.defense} color="#EAB308" />
                <MiniStat label="DMG" value={ship.damage} color="#EF4444" />
                <MiniStat label="RNG" value={ship.range} color="#A855F7" />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.adContainer}>
          <AdBanner size="small" />
        </View>
      </ScrollView>

      {/* Floating Action Buttons - outside ScrollView, high zIndex */}
      {hasSelection && (
        <View style={styles.floatingBar} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleClearSelection}
            activeOpacity={0.7}
            style={styles.floatingBtnBack}
          >
            <MaterialIcons name="refresh" size={22} color="#FFF" />
            <Text style={styles.floatingBtnBackText}>BACK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={fleetComplete ? handleConfirm : undefined}
            activeOpacity={fleetComplete ? 0.7 : 1}
            style={[
              styles.floatingBtnOk,
              !fleetComplete && styles.floatingBtnOkDisabled,
            ]}
          >
            {fleetComplete ? (
              <>
                <MaterialIcons name="play-arrow" size={24} color="#000" />
                <Text style={styles.floatingBtnOkText}>OK</Text>
              </>
            ) : (
              <Text style={styles.floatingBtnOkTextDisabled}>
                {selectedShips.length}/{FLEET_SIZE}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={miniStyles.container}>
      <Text style={[miniStyles.label, { color }]}>{label}</Text>
      <Text style={miniStyles.value}>{value}</Text>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
    minWidth: 36,
  },
  label: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  value: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CCC",
  },
});

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 2,
  },
  // Big title section
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  bigTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 4,
  },
  titleSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  // Fleet slots
  slotsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  slot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  slotFilled: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.25)",
  },
  slotEmpty: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: "#222",
    borderStyle: "dashed",
  },
  slotName: {
    fontSize: 9,
    fontWeight: "800",
    color: "#EF4444",
    letterSpacing: 0.5,
  },
  slotPlaceholder: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
  },
  // Ship list
  shipList: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  shipCard: {
    backgroundColor: "#0E0E0E",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    gap: 8,
  },
  shipCardSelected: {
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.04)",
  },
  shipCardHeader: {
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
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  shipNameSelected: {
    color: "#EF4444",
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  shipDesc: {
    fontSize: 11,
    color: "#777",
    lineHeight: 15,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 4,
  },
  adContainer: {
    marginTop: 8,
  },
  // Floating action buttons
  floatingBar: {
    position: "absolute",
    bottom: 28,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 12,
    zIndex: 999,
    elevation: 999,
  },
  floatingBtnBack: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  floatingBtnBackText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
  },
  floatingBtnOk: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  floatingBtnOkDisabled: {
    backgroundColor: "#222",
    shadowOpacity: 0,
    elevation: 4,
  },
  floatingBtnOkText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 3,
  },
  floatingBtnOkTextDisabled: {
    fontSize: 15,
    fontWeight: "900",
    color: "#555",
    letterSpacing: 2,
  },
});
