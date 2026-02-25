import type { ConceptGraph, NodeId } from "../domain/types";

export interface NodePosition {
  x: number;
  y: number;
}

export interface GraphLayout {
  positions: Record<NodeId, NodePosition>;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

type EdgePair = [NodeId, NodeId];

function buildUndirectedNeighbors(graph: ConceptGraph): Record<NodeId, NodeId[]> {
  const undirected: Record<NodeId, NodeId[]> = {};

  for (const nodeId of Object.keys(graph.nodes)) {
    undirected[nodeId] = [];
  }

  for (const [from, neighbors] of Object.entries(graph.neighborsByNode)) {
    for (const to of neighbors) {
      if (!undirected[from].includes(to)) {
        undirected[from].push(to);
      }
      if (!undirected[to]) {
        undirected[to] = [];
      }
      if (!undirected[to].includes(from)) {
        undirected[to].push(from);
      }
    }
  }

  return undirected;
}

function getConnectedComponents(
  graph: ConceptGraph,
  undirected: Record<NodeId, NodeId[]>,
): NodeId[][] {
  const allNodes = Object.keys(graph.nodes).sort((a, b) => graph.nodes[a].label.localeCompare(graph.nodes[b].label));
  const orderedSeeds: NodeId[] = [];

  if (graph.rootNodeId && undirected[graph.rootNodeId]) {
    orderedSeeds.push(graph.rootNodeId);
  }

  for (const nodeId of allNodes) {
    if (!orderedSeeds.includes(nodeId)) {
      orderedSeeds.push(nodeId);
    }
  }

  const visited = new Set<NodeId>();
  const components: NodeId[][] = [];

  for (const seed of orderedSeeds) {
    if (visited.has(seed)) {
      continue;
    }

    const queue: NodeId[] = [seed];
    visited.add(seed);
    const component: NodeId[] = [];

    while (queue.length > 0) {
      const current = queue.shift() as NodeId;
      component.push(current);

      for (const neighbor of undirected[current] ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    components.push(component);
  }

  components.sort((a, b) => {
    const aHasRoot = graph.rootNodeId ? a.includes(graph.rootNodeId) : false;
    const bHasRoot = graph.rootNodeId ? b.includes(graph.rootNodeId) : false;

    if (aHasRoot && !bHasRoot) {
      return -1;
    }
    if (!aHasRoot && bHasRoot) {
      return 1;
    }

    if (b.length !== a.length) {
      return b.length - a.length;
    }

    const aFirst = graph.nodes[a[0]]?.label ?? a[0];
    const bFirst = graph.nodes[b[0]]?.label ?? b[0];
    return aFirst.localeCompare(bFirst);
  });

  return components;
}

function collectComponentEdges(
  componentNodes: NodeId[],
  undirected: Record<NodeId, NodeId[]>,
): EdgePair[] {
  const nodeSet = new Set(componentNodes);
  const edges: EdgePair[] = [];

  for (const nodeId of componentNodes) {
    for (const neighborId of undirected[nodeId] ?? []) {
      if (!nodeSet.has(neighborId)) {
        continue;
      }

      if (nodeId.localeCompare(neighborId) >= 0) {
        continue;
      }

      edges.push([nodeId, neighborId]);
    }
  }

  return edges;
}

function degreeOfNode(graph: ConceptGraph, nodeId: NodeId): number {
  return (graph.neighborsByNode[nodeId]?.length ?? 0) + (graph.reverseNeighborsByNode[nodeId]?.length ?? 0);
}

function initializeComponentPositions(
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
    const radius = 125 * Math.sqrt(index);
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

function runForceLayout(
  componentNodes: NodeId[],
  componentEdges: EdgePair[],
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

  const idealLength = nodeCount > 260 ? 140 : nodeCount > 130 ? 160 : 185;
  const iterations = nodeCount > 260 ? 170 : nodeCount > 130 ? 220 : 280;
  const gravityStrength = 0.015;
  const repulsionStrength = 1.0;
  const attractionStrength = 0.78;

  let temperature = idealLength * 2.4;
  const cooling = 0.965;
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

        const force = (idealLength * idealLength * repulsionStrength) / distance;
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

      const force = ((distance * distance) / idealLength) * attractionStrength;
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

export function computeGraphLayout(graph: ConceptGraph): GraphLayout {
  const undirected = buildUndirectedNeighbors(graph);
  const components = getConnectedComponents(graph, undirected);
  const positions: Record<NodeId, NodePosition> = {};

  const componentSpacing = 3400;
  const columns = 3;

  components.forEach((componentNodes, componentIndex) => {
    const center = {
      x: (componentIndex % columns) * componentSpacing,
      y: Math.floor(componentIndex / columns) * componentSpacing,
    };

    const anchorNodeId = graph.rootNodeId && componentNodes.includes(graph.rootNodeId)
      ? graph.rootNodeId
      : null;

    const componentPositions = initializeComponentPositions(
      graph,
      componentNodes,
      center,
      anchorNodeId,
    );

    const componentEdges = collectComponentEdges(componentNodes, undirected);

    runForceLayout(
      componentNodes,
      componentEdges,
      componentPositions,
      center,
      anchorNodeId,
    );

    for (const nodeId of componentNodes) {
      positions[nodeId] = componentPositions[nodeId];
    }
  });

  const allPositions = Object.values(positions);
  const bounds = allPositions.reduce(
    (accumulator, position) => ({
      minX: Math.min(accumulator.minX, position.x),
      maxX: Math.max(accumulator.maxX, position.x),
      minY: Math.min(accumulator.minY, position.y),
      maxY: Math.max(accumulator.maxY, position.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  if (!Number.isFinite(bounds.minX)) {
    return {
      positions,
      bounds: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
    };
  }

  return { positions, bounds };
}
