import type { NodeId } from "../domain/types";

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

export type LayoutEdgePair = [NodeId, NodeId];
