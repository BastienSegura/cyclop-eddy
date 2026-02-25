export type NodeId = string;

export interface ConceptNode {
  id: NodeId;
  label: string;
  pathPrefix: string;
}

export interface ConceptEdge {
  from: NodeId;
  to: NodeId;
}

export interface ConceptGraph {
  nodes: Record<NodeId, ConceptNode>;
  neighborsByNode: Record<NodeId, NodeId[]>;
  reverseNeighborsByNode: Record<NodeId, NodeId[]>;
  rootNodeId: NodeId | null;
}

export interface ParsedConceptLine {
  pathPrefix: string;
  childLabel: string;
}
