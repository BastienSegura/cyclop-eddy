import type { ConceptEdge, ConceptGraph, ConceptNode, NodeId, ParsedConceptLine } from "../domain/types";

function toNodeId(label: string): NodeId {
  return label.trim().toLowerCase();
}

function decodePathSegment(segment: string): string {
  const trimmed = segment.trim();

  // New reversible encoding emitted by clean_concept_list.py
  if (trimmed.startsWith("~")) {
    const encoded = trimmed.slice(1);
    try {
      return decodeURIComponent(encoded).trim();
    } catch {
      return encoded.trim();
    }
  }

  // Legacy encoding: spaces were stored as hyphens.
  return trimmed.replace(/-/g, " ").trim();
}

function getParentLabel(pathPrefix: string): string {
  const segments = pathPrefix.split(".").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    return pathPrefix;
  }

  return decodePathSegment(segments[segments.length - 1]);
}

function ensureNode(
  nodes: Record<NodeId, ConceptNode>,
  label: string,
  pathPrefix: string,
): NodeId {
  const id = toNodeId(label);
  if (!nodes[id]) {
    nodes[id] = { id, label, pathPrefix };
  }
  return id;
}

function buildReverseIndex(neighborsByNode: Record<NodeId, NodeId[]>): Record<NodeId, NodeId[]> {
  const reverse: Record<NodeId, NodeId[]> = {};

  for (const [from, neighbors] of Object.entries(neighborsByNode)) {
    for (const to of neighbors) {
      if (!reverse[to]) {
        reverse[to] = [];
      }
      if (!reverse[to].includes(from)) {
        reverse[to].push(from);
      }
    }
  }

  return reverse;
}

function findRootNodeId(
  nodes: Record<NodeId, ConceptNode>,
  neighborsByNode: Record<NodeId, NodeId[]>,
  reverseNeighborsByNode: Record<NodeId, NodeId[]>,
): NodeId | null {
  const candidates = Object.keys(nodes)
    .filter((nodeId) => (reverseNeighborsByNode[nodeId]?.length ?? 0) === 0)
    .filter((nodeId) => (neighborsByNode[nodeId]?.length ?? 0) > 0);

  return candidates[0] ?? Object.keys(nodes)[0] ?? null;
}

export function buildConceptGraph(parsedLines: ParsedConceptLine[]): ConceptGraph {
  const nodes: Record<NodeId, ConceptNode> = {};
  const neighborsByNode: Record<NodeId, NodeId[]> = {};
  const edges = new Set<string>();

  for (const line of parsedLines) {
    const parentLabel = getParentLabel(line.pathPrefix);
    const childLabel = line.childLabel;

    if (!parentLabel || !childLabel) {
      continue;
    }

    const from = ensureNode(nodes, parentLabel, line.pathPrefix);
    const to = ensureNode(nodes, childLabel, line.pathPrefix);

    if (from === to) {
      continue;
    }

    const edgeKey = `${from}->${to}`;
    if (edges.has(edgeKey)) {
      continue;
    }
    edges.add(edgeKey);

    if (!neighborsByNode[from]) {
      neighborsByNode[from] = [];
    }
    neighborsByNode[from].push(to);
  }

  const reverseNeighborsByNode = buildReverseIndex(neighborsByNode);
  const rootNodeId = findRootNodeId(nodes, neighborsByNode, reverseNeighborsByNode);

  return {
    nodes,
    neighborsByNode,
    reverseNeighborsByNode,
    rootNodeId,
  };
}

export function listOutgoingEdges(graph: ConceptGraph, nodeId: NodeId): ConceptEdge[] {
  const neighbors = graph.neighborsByNode[nodeId] ?? [];
  return neighbors.map((neighborId) => ({ from: nodeId, to: neighborId }));
}
