import type { ConceptGraph, NodeId } from "../domain/types";

import type { LayoutEdgePair } from "./graph-layout-types";

export function buildUndirectedNeighbors(graph: ConceptGraph): Record<NodeId, NodeId[]> {
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

export function getConnectedComponents(
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

export function collectComponentEdges(
  componentNodes: NodeId[],
  undirected: Record<NodeId, NodeId[]>,
): LayoutEdgePair[] {
  const nodeSet = new Set(componentNodes);
  const edges: LayoutEdgePair[] = [];

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
