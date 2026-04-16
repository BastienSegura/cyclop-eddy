import type { CSSProperties } from "react";

import type { NodeId } from "../domain/types";

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

const NODE_COLOR_PALETTE_HEX = [
  "#3B4A8F",
  "#4A5FA8",
  "#546BAB",
  "#BEA9DE",
  "#5B3FA8",
  "#1F5BD8",
  "#017ED5",
  "#E5CD8A",
] as const;

export const OVERVIEW_NODE_RADIUS_PX = 3;

function hashNodeId(nodeId: NodeId): number {
  let hash = 2166136261;

  for (let index = 0; index < nodeId.length; index += 1) {
    hash ^= nodeId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function hexToRgb(hex: string): RGBColor {
  const normalized = hex.replace("#", "");
  const parsed = Number.parseInt(normalized, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function mixTowardWhite(color: RGBColor, ratio: number): RGBColor {
  const clamped = Math.max(0, Math.min(1, ratio));

  return {
    r: Math.round(color.r + (255 - color.r) * clamped),
    g: Math.round(color.g + (255 - color.g) * clamped),
    b: Math.round(color.b + (255 - color.b) * clamped),
  };
}

function rgbToken(color: RGBColor): string {
  return `${color.r} ${color.g} ${color.b}`;
}

function colorForNode(nodeId: NodeId): RGBColor {
  const paletteColorHex = NODE_COLOR_PALETTE_HEX[hashNodeId(nodeId) % NODE_COLOR_PALETTE_HEX.length];
  return hexToRgb(paletteColorHex);
}

export function buildFourPointStarPoints(outerRadius: number): string {
  const innerOffset = outerRadius * 0.31;
  const points = [
    [0, -outerRadius],
    [innerOffset, -innerOffset],
    [outerRadius, 0],
    [innerOffset, innerOffset],
    [0, outerRadius],
    [-innerOffset, innerOffset],
    [-outerRadius, 0],
    [-innerOffset, -innerOffset],
  ];

  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

export function buildVisibleNodeStyle(nodeId: NodeId): CSSProperties {
  const baseColor = colorForNode(nodeId);
  const strokeColor = mixTowardWhite(baseColor, 0.35);
  const glowColor = mixTowardWhite(baseColor, 0.22);

  return {
    ["--node-fill-rgb" as string]: rgbToken(baseColor),
    ["--node-stroke-rgb" as string]: rgbToken(strokeColor),
    ["--node-glow-rgb" as string]: rgbToken(glowColor),
  } as CSSProperties;
}

export function buildOverviewNodeStyle(nodeId: NodeId): CSSProperties {
  const seed = hashNodeId(nodeId);
  const baseColor = colorForNode(nodeId);
  const fillColor = mixTowardWhite(baseColor, 0.1);
  const strokeColor = mixTowardWhite(baseColor, 0.44);
  const glowColor = mixTowardWhite(baseColor, 0.25);
  const durationMs = 4800 + (seed % 6200);
  const delayMs = seed % durationMs;
  const idleOpacity = 0.31 + ((seed >>> 8) % 15) / 100;
  const flashOpacity = 0.86 + ((seed >>> 16) % 14) / 100;
  const idleGlowRadiusPx = 4 + ((seed >>> 4) % 4);
  const flashGlowRadiusPx = idleGlowRadiusPx + 10 + (seed % 5);
  const idleGlowAlpha = 0.4 + ((seed >>> 24) % 20) / 100;
  const flashGlowAlpha = 0.92 + ((seed >>> 12) % 9) / 100;

  return {
    animationDuration: `${durationMs}ms`,
    animationDelay: `-${delayMs}ms`,
    ["--overview-node-fill-rgb" as string]: rgbToken(fillColor),
    ["--overview-node-stroke-rgb" as string]: rgbToken(strokeColor),
    ["--overview-node-glow-rgb" as string]: rgbToken(glowColor),
    ["--overview-node-idle-opacity" as string]: idleOpacity.toFixed(2),
    ["--overview-node-flash-opacity" as string]: flashOpacity.toFixed(2),
    ["--overview-node-idle-glow-alpha" as string]: idleGlowAlpha.toFixed(2),
    ["--overview-node-flash-glow-alpha" as string]: flashGlowAlpha.toFixed(2),
    ["--overview-node-idle-glow-radius" as string]: `${idleGlowRadiusPx}px`,
    ["--overview-node-flash-glow-radius" as string]: `${flashGlowRadiusPx}px`,
  } as CSSProperties;
}

export function edgeClass(
  from: NodeId,
  to: NodeId,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
): string {
  const fromDepth = neighborhoodDepths.get(from);
  const toDepth = neighborhoodDepths.get(to);

  if (from === selectedNodeId || to === selectedNodeId) {
    return "edge-near";
  }

  if (fromDepth === undefined && toDepth === undefined) {
    return "edge-far";
  }

  if (fromDepth !== undefined && toDepth !== undefined) {
    return "edge-near";
  }

  return "edge-mid";
}

export function nodeClass(
  nodeId: NodeId,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
): string {
  if (nodeId === selectedNodeId) {
    return "node-selected";
  }

  const depth = neighborhoodDepths.get(nodeId);
  if (depth === undefined) {
    return "node-far";
  }

  if (depth === 1) {
    return "node-near";
  }

  return "node-mid";
}
