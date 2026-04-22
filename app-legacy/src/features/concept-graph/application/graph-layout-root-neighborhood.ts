import type { ConceptGraph, NodeId } from "../domain/types";

import type { NodePosition } from "./graph-layout-types";
import { stableAngleSeed } from "./graph-layout-initial-placement";

export function enforceRootNeighborhoodRing(
  graph: ConceptGraph,
  positions: Record<NodeId, NodePosition>,
): void {
  const rootNodeId = graph.rootNodeId;
  if (!rootNodeId) {
    return;
  }

  const rootPosition = positions[rootNodeId];
  if (!rootPosition) {
    return;
  }

  const neighborIds = Array.from(
    new Set<NodeId>([
      ...(graph.neighborsByNode[rootNodeId] ?? []),
      ...(graph.reverseNeighborsByNode[rootNodeId] ?? []),
    ]),
  ).filter((nodeId) => nodeId !== rootNodeId && Boolean(positions[nodeId]));

  if (neighborIds.length === 0) {
    return;
  }

  const neighborEntries = neighborIds
    .map((nodeId) => {
      const nodePosition = positions[nodeId];
      if (!nodePosition) {
        return null;
      }

      const dx = nodePosition.x - rootPosition.x;
      const dy = nodePosition.y - rootPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = distance > 0.0001 ? Math.atan2(dy, dx) : stableAngleSeed(nodeId);

      return {
        nodeId,
        angle,
        label: graph.nodes[nodeId]?.label ?? nodeId,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => {
      if (a.angle !== b.angle) {
        return a.angle - b.angle;
      }
      return a.label.localeCompare(b.label);
    });

  if (neighborEntries.length === 0) {
    return;
  }

  const minChordLength = 72;
  const chordRadius = neighborEntries.length > 1
    ? minChordLength / (2 * Math.sin(Math.PI / neighborEntries.length))
    : minChordLength;
  const targetRadius = Math.min(190, Math.max(150, chordRadius));

  const startAngle = neighborEntries[0]?.angle ?? (-Math.PI / 2);
  const angleStep = (Math.PI * 2) / neighborEntries.length;

  neighborEntries.forEach((entry, index) => {
    const angle = startAngle + index * angleStep;
    positions[entry.nodeId] = {
      x: rootPosition.x + Math.cos(angle) * targetRadius,
      y: rootPosition.y + Math.sin(angle) * targetRadius,
    };
  });

  const protectedRadius = targetRadius + 80;
  const rootNeighborhood = new Set<NodeId>([rootNodeId, ...neighborEntries.map((entry) => entry.nodeId)]);

  for (const [nodeId, nodePosition] of Object.entries(positions)) {
    if (rootNeighborhood.has(nodeId)) {
      continue;
    }

    const dx = nodePosition.x - rootPosition.x;
    const dy = nodePosition.y - rootPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance >= protectedRadius) {
      continue;
    }

    const angle = distance > 0.0001 ? Math.atan2(dy, dx) : stableAngleSeed(nodeId);
    positions[nodeId] = {
      x: rootPosition.x + Math.cos(angle) * protectedRadius,
      y: rootPosition.y + Math.sin(angle) * protectedRadius,
    };
  }
}
