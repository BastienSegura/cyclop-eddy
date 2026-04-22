import type { NodePosition } from "../application/graph-layout-types";
import type { ConceptGraph, NodeId } from "../domain/types";

import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.07;
export const MAX_ZOOM = 2.1;
export const FOCUS_ZOOM = 1.5;
export const STATIC_ENTRY_NODE_ID = "computer science";

const INITIAL_MIN_ZOOM = 1.56;
const INITIAL_LOAD_ZOOM_MULTIPLIER = 1;
const ZOOM_SLIDER_CENTER = INITIAL_MIN_ZOOM;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function getDirectNeighborIds(graph: ConceptGraph, nodeId: NodeId): NodeId[] {
  const outgoing = graph.neighborsByNode[nodeId] ?? [];
  const incoming = graph.reverseNeighborsByNode[nodeId] ?? [];
  return Array.from(new Set<NodeId>([...outgoing, ...incoming]));
}

export function getLeafNodeIds(graph: ConceptGraph): Set<NodeId> {
  const leafNodeIds = new Set<NodeId>();

  for (const nodeId of Object.keys(graph.nodes)) {
    if (getDirectNeighborIds(graph, nodeId).length <= 1) {
      leafNodeIds.add(nodeId);
    }
  }

  return leafNodeIds;
}

export function expandVisibleNodes(
  graph: ConceptGraph,
  currentVisible: Set<NodeId>,
  focusNodeId: NodeId,
): Set<NodeId> {
  const nextVisible = new Set<NodeId>(currentVisible);
  nextVisible.add(focusNodeId);

  for (const neighborId of getDirectNeighborIds(graph, focusNodeId)) {
    nextVisible.add(neighborId);
  }

  return nextVisible;
}

export function getInitialEntryNodeId(graph: ConceptGraph): NodeId | null {
  if (graph.nodes[STATIC_ENTRY_NODE_ID]) {
    return STATIC_ENTRY_NODE_ID;
  }

  return graph.rootNodeId;
}

export function computeFitCameraForNodes(
  positions: Record<NodeId, NodePosition>,
  nodeIds: Set<NodeId>,
  focusNodeId: NodeId,
): CameraState {
  const candidateIds = nodeIds.size > 0 ? Array.from(nodeIds) : [focusNodeId];
  const visiblePositions = candidateIds
    .map((nodeId) => positions[nodeId])
    .filter((position): position is NodePosition => Boolean(position));

  const focusPosition = positions[focusNodeId];
  if (visiblePositions.length === 0 || !focusPosition) {
    return { x: 0, y: 0, zoom: FOCUS_ZOOM };
  }

  const sortedRadii = visiblePositions
    .map((position) => {
      const dx = position.x - focusPosition.x;
      const dy = position.y - focusPosition.y;
      return Math.sqrt(dx * dx + dy * dy);
    })
    .sort((a, b) => a - b);

  const robustRadiusIndex = Math.max(0, Math.floor((sortedRadii.length - 1) * 0.88));
  const robustRadius = sortedRadii[robustRadiusIndex] ?? 0;
  const effectiveRadius = Math.max(180, robustRadius + 70);
  const fitWidth = VIEWPORT_WIDTH / 2 - 70;
  const fitHeight = VIEWPORT_HEIGHT / 2 - 70;
  const zoomToFit = Math.min(fitWidth / effectiveRadius, fitHeight / effectiveRadius);

  return {
    x: focusPosition.x,
    y: focusPosition.y,
    zoom: clampZoom(Math.max(zoomToFit, INITIAL_MIN_ZOOM) * INITIAL_LOAD_ZOOM_MULTIPLIER),
  };
}

export function buildZoomSliderValue(zoom: number): number {
  const zoomSliderValueUnrounded = zoom >= ZOOM_SLIDER_CENTER
    ? 50 + ((zoom - ZOOM_SLIDER_CENTER) / Math.max(MAX_ZOOM - ZOOM_SLIDER_CENTER, 0.001)) * 50
    : 50 - ((ZOOM_SLIDER_CENTER - zoom) / Math.max(ZOOM_SLIDER_CENTER - MIN_ZOOM, 0.001)) * 50;

  return Math.min(
    100,
    Math.max(0, Math.round(zoomSliderValueUnrounded)),
  );
}

export function getZoomFromSliderValue(nextValue: number): number {
  const clampedValue = Math.min(100, Math.max(0, nextValue));
  const targetZoom = clampedValue >= 50
    ? ZOOM_SLIDER_CENTER + ((clampedValue - 50) / 50) * (MAX_ZOOM - ZOOM_SLIDER_CENTER)
    : ZOOM_SLIDER_CENTER - ((50 - clampedValue) / 50) * (ZOOM_SLIDER_CENTER - MIN_ZOOM);
  return clampZoom(targetZoom);
}
