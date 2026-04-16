import type { ConceptGraph, NodeId } from "../domain/types";

import {
  buildUndirectedNeighbors,
  collectComponentEdges,
  getConnectedComponents,
} from "./graph-layout-components";
import { runForceLayout } from "./graph-layout-force-simulation";
import {
  initializeComponentPositions,
  scaleComponentPositions,
} from "./graph-layout-initial-placement";
import { enforceRootNeighborhoodRing } from "./graph-layout-root-neighborhood";
import type { GraphLayout, NodePosition } from "./graph-layout-types";

export type { GraphLayout, NodePosition } from "./graph-layout-types";

export function computeGraphLayout(graph: ConceptGraph): GraphLayout {
  const undirected = buildUndirectedNeighbors(graph);
  const components = getConnectedComponents(graph, undirected);
  const positions: Record<NodeId, NodePosition> = {};

  const componentSpacing = 5200;
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

    scaleComponentPositions(componentNodes, componentPositions, center);

    for (const nodeId of componentNodes) {
      positions[nodeId] = componentPositions[nodeId];
    }
  });

  enforceRootNeighborhoodRing(graph, positions);

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
