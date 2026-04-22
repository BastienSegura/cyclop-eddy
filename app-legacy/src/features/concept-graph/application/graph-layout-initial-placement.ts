import type { ConceptGraph, NodeId } from "../domain/types";

import type { NodePosition } from "./graph-layout-types";

function degreeOfNode(graph: ConceptGraph, nodeId: NodeId): number {
  return (graph.neighborsByNode[nodeId]?.length ?? 0) + (graph.reverseNeighborsByNode[nodeId]?.length ?? 0);
}

export function initializeComponentPositions(
  graph: ConceptGraph,
  componentNodes: NodeId[],
  center: NodePosition,
  anchorNodeId: NodeId | null,
): Record<NodeId, NodePosition> {
  const sortedNodes = [...componentNodes].sort((a, b) => {
    const degreeDelta = degreeOfNode(graph, b) - degreeOfNode(graph, a);
    if (degreeDelta !== 0) {
      return degreeDelta;
    }
    return graph.nodes[a].label.localeCompare(graph.nodes[b].label);
  });

  const positions: Record<NodeId, NodePosition> = {};
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  let index = 0;
  for (const nodeId of sortedNodes) {
    if (anchorNodeId && nodeId === anchorNodeId) {
      positions[nodeId] = { ...center };
      continue;
    }

    index += 1;
    const radius = 155 * Math.sqrt(index);
    const angle = index * goldenAngle;

    positions[nodeId] = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  }

  if (anchorNodeId && !positions[anchorNodeId]) {
    positions[anchorNodeId] = { ...center };
  }

  return positions;
}

export function scaleComponentPositions(
  componentNodes: NodeId[],
  positions: Record<NodeId, NodePosition>,
  center: NodePosition,
): void {
  const nodeCount = componentNodes.length;
  const scaleFactor = nodeCount > 600
    ? 2.65
    : nodeCount > 300
      ? 2.35
      : nodeCount > 160
        ? 2.1
        : nodeCount > 80
          ? 1.85
          : 1.65;

  for (const nodeId of componentNodes) {
    const current = positions[nodeId];
    if (!current) {
      continue;
    }

    positions[nodeId] = {
      x: center.x + (current.x - center.x) * scaleFactor,
      y: center.y + (current.y - center.y) * scaleFactor,
    };
  }
}

export function stableAngleSeed(nodeId: NodeId): number {
  let hash = 2166136261;
  for (let index = 0; index < nodeId.length; index += 1) {
    hash ^= nodeId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 360) * (Math.PI / 180);
}
