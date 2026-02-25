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

function buildUndirectedNeighbors(graph: ConceptGraph): Record<NodeId, NodeId[]> {
  const undirected: Record<NodeId, NodeId[]> = {};

  for (const nodeId of Object.keys(graph.nodes)) {
    undirected[nodeId] = [];
  }

  for (const [from, targets] of Object.entries(graph.neighborsByNode)) {
    for (const to of targets) {
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

function chooseComponentSeed(
  candidates: NodeId[],
  graph: ConceptGraph,
  rootNodeId: NodeId | null,
): NodeId {
  if (rootNodeId && candidates.includes(rootNodeId)) {
    return rootNodeId;
  }

  return [...candidates].sort((a, b) => {
    const degreeA = (graph.neighborsByNode[a]?.length ?? 0) + (graph.reverseNeighborsByNode[a]?.length ?? 0);
    const degreeB = (graph.neighborsByNode[b]?.length ?? 0) + (graph.reverseNeighborsByNode[b]?.length ?? 0);
    if (degreeB !== degreeA) {
      return degreeB - degreeA;
    }
    return graph.nodes[a].label.localeCompare(graph.nodes[b].label);
  })[0];
}

function getComponentNodes(seed: NodeId, undirected: Record<NodeId, NodeId[]>): NodeId[] {
  const queue: NodeId[] = [seed];
  const visited = new Set<NodeId>([seed]);
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

  return component;
}

function assignComponentPositions(
  componentNodes: NodeId[],
  seed: NodeId,
  graph: ConceptGraph,
  undirected: Record<NodeId, NodeId[]>,
  componentCenter: NodePosition,
): Record<NodeId, NodePosition> {
  const levels = new Map<NodeId, number>();
  const queue: NodeId[] = [seed];
  levels.set(seed, 0);

  while (queue.length > 0) {
    const current = queue.shift() as NodeId;
    const currentLevel = levels.get(current) ?? 0;

    for (const neighbor of undirected[current] ?? []) {
      if (levels.has(neighbor)) {
        continue;
      }
      levels.set(neighbor, currentLevel + 1);
      queue.push(neighbor);
    }
  }

  const nodesByLevel = new Map<number, NodeId[]>();
  for (const nodeId of componentNodes) {
    const level = levels.get(nodeId) ?? 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)?.push(nodeId);
  }

  const positions: Record<NodeId, NodePosition> = {};
  positions[seed] = { ...componentCenter };

  const maxLevel = Math.max(...Array.from(nodesByLevel.keys()));
  const levelRadiusStep = 280;

  for (let level = 1; level <= maxLevel; level += 1) {
    const nodes = (nodesByLevel.get(level) ?? []).sort((a, b) => {
      const degreeA = (graph.neighborsByNode[a]?.length ?? 0) + (graph.reverseNeighborsByNode[a]?.length ?? 0);
      const degreeB = (graph.neighborsByNode[b]?.length ?? 0) + (graph.reverseNeighborsByNode[b]?.length ?? 0);
      if (degreeB !== degreeA) {
        return degreeB - degreeA;
      }
      return graph.nodes[a].label.localeCompare(graph.nodes[b].label);
    });

    if (nodes.length === 0) {
      continue;
    }

    const radius = level * levelRadiusStep;
    const angleOffset = level * 0.35;

    for (let index = 0; index < nodes.length; index += 1) {
      const angle = (index / nodes.length) * Math.PI * 2 + angleOffset;
      positions[nodes[index]] = {
        x: componentCenter.x + Math.cos(angle) * radius,
        y: componentCenter.y + Math.sin(angle) * radius,
      };
    }
  }

  return positions;
}

function mergeBounds(bounds: GraphLayout["bounds"], position: NodePosition): GraphLayout["bounds"] {
  return {
    minX: Math.min(bounds.minX, position.x),
    maxX: Math.max(bounds.maxX, position.x),
    minY: Math.min(bounds.minY, position.y),
    maxY: Math.max(bounds.maxY, position.y),
  };
}

export function computeGraphLayout(graph: ConceptGraph): GraphLayout {
  const undirected = buildUndirectedNeighbors(graph);
  const unassigned = new Set<NodeId>(Object.keys(graph.nodes));
  const positions: Record<NodeId, NodePosition> = {};

  let componentIndex = 0;

  while (unassigned.size > 0) {
    const candidates = Array.from(unassigned);
    const seed = chooseComponentSeed(candidates, graph, graph.rootNodeId);
    const componentNodes = getComponentNodes(seed, undirected);

    const componentCenter = {
      x: (componentIndex % 3) * 2800,
      y: Math.floor(componentIndex / 3) * 2800,
    };

    const componentPositions = assignComponentPositions(
      componentNodes,
      seed,
      graph,
      undirected,
      componentCenter,
    );

    for (const nodeId of componentNodes) {
      positions[nodeId] = componentPositions[nodeId] ?? componentCenter;
      unassigned.delete(nodeId);
    }

    componentIndex += 1;
  }

  let bounds: GraphLayout["bounds"] = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (const position of Object.values(positions)) {
    bounds = mergeBounds(bounds, position);
  }

  if (!Number.isFinite(bounds.minX)) {
    bounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 };
  }

  return { positions, bounds };
}
