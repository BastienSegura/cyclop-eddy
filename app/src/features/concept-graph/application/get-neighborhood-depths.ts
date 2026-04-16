import type { ConceptGraph, NodeId } from "../domain/types";

function getUndirectedNeighbors(graph: ConceptGraph, nodeId: NodeId): NodeId[] {
  const outgoing = graph.neighborsByNode[nodeId] ?? [];
  const incoming = graph.reverseNeighborsByNode[nodeId] ?? [];
  const merged = new Set<NodeId>([...outgoing, ...incoming]);
  return Array.from(merged);
}

export function getNeighborhoodDepths(
  graph: ConceptGraph,
  startNodeId: NodeId,
  maxDepth: number,
): Map<NodeId, number> {
  const depths = new Map<NodeId, number>();
  const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

  depths.set(startNodeId, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const neighborId of getUndirectedNeighbors(graph, current.nodeId)) {
      if (depths.has(neighborId)) {
        continue;
      }

      const neighborDepth = current.depth + 1;
      depths.set(neighborId, neighborDepth);
      queue.push({ nodeId: neighborId, depth: neighborDepth });
    }
  }

  return depths;
}
