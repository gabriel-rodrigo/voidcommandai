import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Rect,
  Circle,
  Line,
  G,
  Defs,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { GameState, Bullet, Person, Player, Vector2 } from "@/lib/game/types";
import { SCENE_WIDTH, SCENE_HEIGHT } from "@/lib/game/constants";

interface DamagePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  isCritical: boolean;
}

interface BattleCanvasProps {
  gameState: GameState;
  bullets: Bullet[];
  selectedUnitId: string | null;
  selectionStep: 0 | 1 | 2;
  pendingMove: Vector2 | null;
  damagePopups: DamagePopup[];
  scale: number;
}

const SHIP_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#3B82F6",
};

const SHIP_GLOW: Record<number, string> = {
  1: "rgba(239,68,68,0.4)",
  2: "rgba(59,130,246,0.4)",
};

export function BattleCanvas({
  gameState,
  bullets,
  selectedUnitId,
  selectionStep,
  pendingMove,
  damagePopups,
  scale,
}: BattleCanvasProps) {
  const stars = useMemo(() => {
    const s = [];
    for (let i = 0; i < 50; i++) {
      s.push({
        x: Math.random() * SCENE_WIDTH,
        y: Math.random() * SCENE_HEIGHT,
        r: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    return s;
  }, []);

  const gridLines = useMemo(() => {
    const lines = [];
    for (let x = 0; x <= SCENE_WIDTH; x += 50) {
      lines.push({ x1: x, y1: 0, x2: x, y2: SCENE_HEIGHT });
    }
    for (let y = 0; y <= SCENE_HEIGHT; y += 50) {
      lines.push({ x1: 0, y1: y, x2: SCENE_WIDTH, y2: y });
    }
    return lines;
  }, []);

  const players = Object.values(gameState.players) as Player[];
  const myPlayer = gameState.players["human-player"];

  return (
    <View style={[styles.container, { width: SCENE_WIDTH * scale, height: SCENE_HEIGHT * scale }]}>
      <Svg
        width={SCENE_WIDTH * scale}
        height={SCENE_HEIGHT * scale}
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      >
        {/* Background */}
        <Rect x={0} y={0} width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="#050505" />

        {/* Stars */}
        {stars.map((star, i) => (
          <Circle
            key={`star-${i}`}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="white"
            opacity={star.opacity}
          />
        ))}

        {/* Grid */}
        {gridLines.map((line, i) => (
          <Line
            key={`grid-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#111"
            strokeWidth={0.5}
          />
        ))}

        {/* Pending actions for own units */}
        {myPlayer &&
          gameState.phase === "programming" &&
          myPlayer.persons.map((person) => {
            if (person.life <= 0) return null;
            const elements = [];

            if (person.pendingMove) {
              const dx = person.pendingMove.x - person.x;
              const dy = person.pendingMove.y - person.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              let tx = person.pendingMove.x;
              let ty = person.pendingMove.y;
              if (d > person.moveDistance) {
                tx = person.x + (dx / d) * person.moveDistance;
                ty = person.y + (dy / d) * person.moveDistance;
              }
              elements.push(
                <Line
                  key={`move-${person.id}`}
                  x1={person.x}
                  y1={person.y}
                  x2={tx}
                  y2={ty}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                  strokeDasharray="5,5"
                />,
                <Circle
                  key={`move-dot-${person.id}`}
                  cx={tx}
                  cy={ty}
                  r={4}
                  fill="rgba(255,255,255,0.2)"
                />
              );
            }

            if (person.pendingFire) {
              elements.push(
                <Line
                  key={`fire-${person.id}`}
                  x1={person.x}
                  y1={person.y}
                  x2={person.pendingFire.x}
                  y2={person.pendingFire.y}
                  stroke="rgba(239,68,68,0.3)"
                  strokeWidth={1}
                />,
                <Circle
                  key={`fire-dot-${person.id}`}
                  cx={person.pendingFire.x}
                  cy={person.pendingFire.y}
                  r={3}
                  fill="rgba(239,68,68,0.4)"
                />
              );
            }

            return elements;
          })}

        {/* Local pending move preview */}
        {selectedUnitId && selectionStep === 2 && pendingMove && myPlayer && (() => {
          const person = myPlayer.persons.find((p) => p.id === selectedUnitId);
          if (!person || person.life <= 0) return null;
          const dx = pendingMove.x - person.x;
          const dy = pendingMove.y - person.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          let tx = pendingMove.x;
          let ty = pendingMove.y;
          if (d > person.moveDistance) {
            tx = person.x + (dx / d) * person.moveDistance;
            ty = person.y + (dy / d) * person.moveDistance;
          }
          return (
            <>
              <Line
                x1={person.x}
                y1={person.y}
                x2={tx}
                y2={ty}
                stroke="white"
                strokeWidth={1}
                strokeDasharray="5,5"
              />
              <Circle cx={tx} cy={ty} r={5} fill="rgba(255,255,255,0.3)" />
            </>
          );
        })()}

        {/* Ships */}
        {players.map((player) =>
          player.persons.map((person) => {
            if (person.life <= 0) return null;
            const isSelected = selectedUnitId === person.id;
            const isOwn = player.id === "human-player";
            const color = SHIP_COLORS[player.slot] ?? "#888";
            const size = isSelected ? person.size * 1.2 : person.size;

            // Ship triangle pointing in angle direction
            const angle = person.angle;
            const tipX = person.x + Math.cos(angle) * size;
            const tipY = person.y + Math.sin(angle) * size;
            const leftX = person.x + Math.cos(angle + 2.5) * size * 0.7;
            const leftY = person.y + Math.sin(angle + 2.5) * size * 0.7;
            const rightX = person.x + Math.cos(angle - 2.5) * size * 0.7;
            const rightY = person.y + Math.sin(angle - 2.5) * size * 0.7;

            return (
              <G key={person.id}>
                {/* Selection glow */}
                {isSelected && (
                  <Circle
                    cx={person.x}
                    cy={person.y}
                    r={size + 12}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    opacity={0.5}
                  />
                )}

                {/* Move range indicator */}
                {isSelected && selectionStep === 1 && (
                  <Circle
                    cx={person.x}
                    cy={person.y}
                    r={person.moveDistance}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                )}

                {/* Ship body */}
                <Circle
                  cx={person.x}
                  cy={person.y}
                  r={size * 0.8}
                  fill={color}
                  opacity={0.3}
                />
                <Line
                  x1={person.x}
                  y1={person.y}
                  x2={tipX}
                  y2={tipY}
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <Line
                  x1={leftX}
                  y1={leftY}
                  x2={tipX}
                  y2={tipY}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Line
                  x1={rightX}
                  y1={rightY}
                  x2={tipX}
                  y2={tipY}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Circle
                  cx={person.x}
                  cy={person.y}
                  r={4}
                  fill="white"
                  opacity={0.8}
                />

                {/* Health bar */}
                {isOwn && (
                  <>
                    <Rect
                      x={person.x - 15}
                      y={person.y - size - 8}
                      width={30}
                      height={3}
                      rx={1.5}
                      fill="#333"
                    />
                    <Rect
                      x={person.x - 15}
                      y={person.y - size - 8}
                      width={30 * (person.life / person.maxLife)}
                      height={3}
                      rx={1.5}
                      fill={person.life / person.maxLife > 0.5 ? "#22C55E" : "#EF4444"}
                    />
                  </>
                )}

                {/* Unit type label */}
                <SvgText
                  x={person.x}
                  y={person.y + size + 12}
                  fill="rgba(255,255,255,0.4)"
                  fontSize={7}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {person.name}
                </SvgText>
              </G>
            );
          })
        )}

        {/* Bullets */}
        {bullets.map((bullet) => {
          const dx = bullet.targetX - bullet.x;
          const dy = bullet.targetY - bullet.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const tracerLen = 12;
          const tailX = d > 0 ? bullet.x - (dx / d) * tracerLen : bullet.x;
          const tailY = d > 0 ? bullet.y - (dy / d) * tracerLen : bullet.y;

          return (
            <G key={bullet.id}>
              <Line
                x1={tailX}
                y1={tailY}
                x2={bullet.x}
                y2={bullet.y}
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.8}
              />
              <Circle cx={bullet.x} cy={bullet.y} r={2} fill="white" />
            </G>
          );
        })}

        {/* Damage popups */}
        {damagePopups.map((popup) => (
          <SvgText
            key={popup.id}
            x={popup.x}
            y={popup.y}
            fill={popup.color}
            fontSize={popup.isCritical ? 14 : 11}
            fontWeight="bold"
            textAnchor="middle"
            opacity={popup.opacity}
          >
            {popup.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#050505",
    borderRadius: 8,
    overflow: "hidden",
  },
});
