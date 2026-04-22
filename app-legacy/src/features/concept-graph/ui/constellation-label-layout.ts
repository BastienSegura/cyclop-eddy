import type { NodePosition } from "../application/graph-layout-types";
import type { ConceptGraph, NodeId } from "../domain/types";

import type { CameraState } from "./graph-explorer-helpers";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

const VIEWPORT_MARGIN_PX = 140;
const COLLISION_ITERATIONS = 14;
const BASE_NODE_DISTANCE_PX = 82;
const LABEL_HEIGHT_PX = 14;
const LABEL_PADDING_PX = 5;

export const LABEL_OFFSET_X = 14;
export const LABEL_OFFSET_Y = -14;

interface ScreenPoint {
  x: number;
  y: number;
}

interface LabelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function screenFromWorld(world: NodePosition, camera: CameraState): ScreenPoint {
  return {
    x: (world.x - camera.x) * camera.zoom + VIEWPORT_WIDTH / 2,
    y: (world.y - camera.y) * camera.zoom + VIEWPORT_HEIGHT / 2,
  };
}

function worldFromScreen(screen: ScreenPoint, camera: CameraState): NodePosition {
  return {
    x: camera.x + (screen.x - VIEWPORT_WIDTH / 2) / camera.zoom,
    y: camera.y + (screen.y - VIEWPORT_HEIGHT / 2) / camera.zoom,
  };
}

function isWithinViewport(point: ScreenPoint, margin: number): boolean {
  return (
    point.x >= -margin
    && point.x <= VIEWPORT_WIDTH + margin
    && point.y >= -margin
    && point.y <= VIEWPORT_HEIGHT + margin
  );
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
}

export function shouldShowLabel(
  nodeId: NodeId,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
): boolean {
  if (nodeId === selectedNodeId) {
    return true;
  }

  const depth = neighborhoodDepths.get(nodeId);
  return depth !== undefined && depth <= 1;
}

export function buildAdjustedVisiblePositions(
  visibleNodeIds: NodeId[],
  positions: Record<NodeId, NodePosition>,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
  camera: CameraState,
): Record<NodeId, NodePosition> {
  const adjustedByNodeId: Record<NodeId, NodePosition> = {};

  const baseScreenByNodeId = new Map<NodeId, ScreenPoint>();
  for (const nodeId of visibleNodeIds) {
    const world = positions[nodeId];
    if (!world) {
      continue;
    }

    baseScreenByNodeId.set(nodeId, screenFromWorld(world, camera));
    adjustedByNodeId[nodeId] = world;
  }

  const activeNodeIds = visibleNodeIds.filter((nodeId) => {
    const screen = baseScreenByNodeId.get(nodeId);
    if (!screen) {
      return false;
    }

    if (nodeId === selectedNodeId) {
      return true;
    }

    const depth = neighborhoodDepths.get(nodeId);
    if (depth !== undefined && depth <= 1) {
      return true;
    }

    return isWithinViewport(screen, VIEWPORT_MARGIN_PX);
  });

  if (activeNodeIds.length <= 1 || camera.zoom <= 0) {
    return adjustedByNodeId;
  }

  const currentByNodeId = new Map<NodeId, ScreenPoint>();
  for (const nodeId of activeNodeIds) {
    const base = baseScreenByNodeId.get(nodeId);
    if (base) {
      currentByNodeId.set(nodeId, { ...base });
    }
  }

  for (let iteration = 0; iteration < COLLISION_ITERATIONS; iteration += 1) {
    for (let i = 0; i < activeNodeIds.length; i += 1) {
      for (let j = i + 1; j < activeNodeIds.length; j += 1) {
        const aNodeId = activeNodeIds[i];
        const bNodeId = activeNodeIds[j];

        const a = currentByNodeId.get(aNodeId);
        const b = currentByNodeId.get(bNodeId);
        if (!a || !b) {
          continue;
        }

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy + 0.01);

        let minDistance = BASE_NODE_DISTANCE_PX;
        if (aNodeId === selectedNodeId || bNodeId === selectedNodeId) {
          minDistance += 22;
        }

        const aDepth = neighborhoodDepths.get(aNodeId);
        const bDepth = neighborhoodDepths.get(bNodeId);
        if (aDepth === 1 || bDepth === 1) {
          minDistance += 12;
        }

        if (distance >= minDistance) {
          continue;
        }

        const overlap = (minDistance - distance) * 0.5;
        const unitX = dx / distance;
        const unitY = dy / distance;

        const aFixed = aNodeId === selectedNodeId;
        const bFixed = bNodeId === selectedNodeId;

        if (!aFixed) {
          const factor = bFixed ? 2 : 1;
          a.x += unitX * overlap * factor;
          a.y += unitY * overlap * factor;
        }
        if (!bFixed) {
          const factor = aFixed ? 2 : 1;
          b.x -= unitX * overlap * factor;
          b.y -= unitY * overlap * factor;
        }
      }
    }

    for (const nodeId of activeNodeIds) {
      if (nodeId === selectedNodeId) {
        continue;
      }

      const base = baseScreenByNodeId.get(nodeId);
      const current = currentByNodeId.get(nodeId);
      if (!base || !current) {
        continue;
      }

      current.x += (base.x - current.x) * 0.045;
      current.y += (base.y - current.y) * 0.045;
    }
  }

  for (const nodeId of activeNodeIds) {
    const current = currentByNodeId.get(nodeId);
    if (!current) {
      continue;
    }

    adjustedByNodeId[nodeId] = worldFromScreen(current, camera);
  }

  return adjustedByNodeId;
}

export function buildVisibleLabelSet(
  graph: ConceptGraph,
  visibleNodeIds: NodeId[],
  adjustedPositions: Record<NodeId, NodePosition>,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
  camera: CameraState,
): Set<NodeId> {
  const candidates = visibleNodeIds
    .filter((nodeId) => shouldShowLabel(nodeId, selectedNodeId, neighborhoodDepths))
    .sort((a, b) => {
      if (a === selectedNodeId) {
        return -1;
      }
      if (b === selectedNodeId) {
        return 1;
      }

      const aDepth = neighborhoodDepths.get(a) ?? 99;
      const bDepth = neighborhoodDepths.get(b) ?? 99;
      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }

      const aDegree = (graph.neighborsByNode[a]?.length ?? 0) + (graph.reverseNeighborsByNode[a]?.length ?? 0);
      const bDegree = (graph.neighborsByNode[b]?.length ?? 0) + (graph.reverseNeighborsByNode[b]?.length ?? 0);
      if (bDegree !== aDegree) {
        return bDegree - aDegree;
      }

      return graph.nodes[a].label.localeCompare(graph.nodes[b].label);
    });

  const acceptedLabelBoxes: LabelBox[] = [];
  const visibleLabelIds = new Set<NodeId>();

  for (const nodeId of candidates) {
    const world = adjustedPositions[nodeId];
    if (!world) {
      continue;
    }

    const screen = screenFromWorld(world, camera);

    if (nodeId !== selectedNodeId && !isWithinViewport(screen, VIEWPORT_MARGIN_PX / 2)) {
      continue;
    }

    const label = graph.nodes[nodeId].label;
    const estimatedWidth = Math.min(240, Math.max(48, label.length * 6.8 + 12));

    const box: LabelBox = {
      left: screen.x + LABEL_OFFSET_X - LABEL_PADDING_PX,
      top: screen.y + LABEL_OFFSET_Y - LABEL_HEIGHT_PX - LABEL_PADDING_PX,
      right: screen.x + LABEL_OFFSET_X + estimatedWidth + LABEL_PADDING_PX,
      bottom: screen.y + LABEL_OFFSET_Y + LABEL_PADDING_PX,
    };

    if (nodeId !== selectedNodeId) {
      const overlaps = acceptedLabelBoxes.some((acceptedBox) => boxesOverlap(box, acceptedBox));
      if (overlaps) {
        continue;
      }
    }

    acceptedLabelBoxes.push(box);
    visibleLabelIds.add(nodeId);
  }

  return visibleLabelIds;
}
