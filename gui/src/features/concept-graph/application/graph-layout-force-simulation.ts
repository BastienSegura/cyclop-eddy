import type { NodeId } from "../domain/types";

import type { LayoutEdgePair, NodePosition } from "./graph-layout-types";

export function runForceLayout(
  componentNodes: NodeId[],
  componentEdges: LayoutEdgePair[],
  positions: Record<NodeId, NodePosition>,
  center: NodePosition,
  anchorNodeId: NodeId | null,
): void {
  const nodeCount = componentNodes.length;
  if (nodeCount <= 1) {
    return;
  }

  const nodeIndexes = new Map<NodeId, number>();
  componentNodes.forEach((nodeId, index) => nodeIndexes.set(nodeId, index));

  const x = new Array<number>(nodeCount);
  const y = new Array<number>(nodeCount);
  const dispX = new Array<number>(nodeCount).fill(0);
  const dispY = new Array<number>(nodeCount).fill(0);

  componentNodes.forEach((nodeId, index) => {
    x[index] = positions[nodeId].x;
    y[index] = positions[nodeId].y;
  });

  const edgeIndexes: Array<[number, number]> = componentEdges
    .map(([from, to]) => {
      const fromIndex = nodeIndexes.get(from);
      const toIndex = nodeIndexes.get(to);
      if (fromIndex === undefined || toIndex === undefined) {
        return null;
      }
      return [fromIndex, toIndex] as [number, number];
    })
    .filter((value): value is [number, number] => Boolean(value));

  const idealLength = nodeCount > 260 ? 210 : nodeCount > 130 ? 228 : 248;
  const iterations = nodeCount > 260 ? 260 : nodeCount > 130 ? 340 : 420;
  const gravityStrength = 0.01;
  const repulsionStrength = 1.45;
  const attractionStrength = 0.2;
  const repulsionCutoff = idealLength * 6.4;
  const minEdgeLength = idealLength * 0.72;
  const maxEdgeLength = idealLength * 1.86;

  const degreeByIndex = new Array<number>(nodeCount).fill(0);
  for (const [fromIndex, toIndex] of edgeIndexes) {
    degreeByIndex[fromIndex] += 1;
    degreeByIndex[toIndex] += 1;
  }

  let temperature = idealLength * 3.1;
  const cooling = 0.976;
  const anchorIndex = anchorNodeId ? nodeIndexes.get(anchorNodeId) ?? -1 : -1;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    dispX.fill(0);
    dispY.fill(0);

    for (let i = 0; i < nodeCount; i += 1) {
      for (let j = i + 1; j < nodeCount; j += 1) {
        const dx = x[i] - x[j];
        const dy = y[i] - y[j];
        const distanceSquared = dx * dx + dy * dy + 0.01;
        const distance = Math.sqrt(distanceSquared);
        if (distance > repulsionCutoff) {
          continue;
        }

        const force = (idealLength * idealLength * repulsionStrength) / distanceSquared;
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;

        dispX[i] += forceX;
        dispY[i] += forceY;
        dispX[j] -= forceX;
        dispY[j] -= forceY;
      }
    }

    for (const [fromIndex, toIndex] of edgeIndexes) {
      const dx = x[fromIndex] - x[toIndex];
      const dy = y[fromIndex] - y[toIndex];
      const distance = Math.sqrt(dx * dx + dy * dy + 0.01);

      const isLeafEdge = degreeByIndex[fromIndex] <= 1 || degreeByIndex[toIndex] <= 1;
      const localAttraction = isLeafEdge ? attractionStrength * 1.28 : attractionStrength;
      const force = (distance - idealLength) * localAttraction;
      const forceX = (dx / distance) * force;
      const forceY = (dy / distance) * force;

      dispX[fromIndex] -= forceX;
      dispY[fromIndex] -= forceY;
      dispX[toIndex] += forceX;
      dispY[toIndex] += forceY;
    }

    for (let i = 0; i < nodeCount; i += 1) {
      const dx = x[i] - center.x;
      const dy = y[i] - center.y;
      dispX[i] -= dx * gravityStrength;
      dispY[i] -= dy * gravityStrength;
    }

    for (let i = 0; i < nodeCount; i += 1) {
      if (i === anchorIndex) {
        continue;
      }

      const displacement = Math.sqrt(dispX[i] * dispX[i] + dispY[i] * dispY[i]);
      if (displacement === 0) {
        continue;
      }

      const step = Math.min(temperature, displacement);
      x[i] += (dispX[i] / displacement) * step;
      y[i] += (dispY[i] / displacement) * step;
    }

    for (const [fromIndex, toIndex] of edgeIndexes) {
      const dx = x[toIndex] - x[fromIndex];
      const dy = y[toIndex] - y[fromIndex];
      const distance = Math.sqrt(dx * dx + dy * dy + 0.01);

      if (distance >= minEdgeLength && distance <= maxEdgeLength) {
        continue;
      }

      const targetDistance = Math.min(maxEdgeLength, Math.max(minEdgeLength, distance));
      const correction = (distance - targetDistance) * 0.5;
      const correctionX = (dx / distance) * correction;
      const correctionY = (dy / distance) * correction;

      if (fromIndex !== anchorIndex) {
        x[fromIndex] += correctionX;
        y[fromIndex] += correctionY;
      }
      if (toIndex !== anchorIndex) {
        x[toIndex] -= correctionX;
        y[toIndex] -= correctionY;
      }
    }

    if (anchorIndex >= 0) {
      x[anchorIndex] = center.x;
      y[anchorIndex] = center.y;
    }

    temperature *= cooling;
  }

  componentNodes.forEach((nodeId, index) => {
    positions[nodeId] = { x: x[index], y: y[index] };
  });
}
