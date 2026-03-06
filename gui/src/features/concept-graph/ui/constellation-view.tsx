"use client";

import { type CSSProperties, useMemo, useRef } from "react";

import type { GraphLayout, NodePosition } from "../application/graph-layout-types";
import type { ConceptGraph, NodeId } from "../domain/types";
import {
  LABEL_OFFSET_X,
  LABEL_OFFSET_Y,
  buildAdjustedVisiblePositions,
  buildVisibleLabelSet,
  shouldShowLabel,
} from "./constellation-label-layout";
import {
  OVERVIEW_NODE_RADIUS_PX,
  buildFourPointStarPoints,
  buildOverviewNodeStyle,
  buildVisibleNodeStyle,
  edgeClass,
  nodeClass,
} from "./constellation-node-styles";
import type { CameraState } from "./graph-explorer-helpers";
import { useConstellationInteractions } from "./use-constellation-interactions";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

interface ConstellationViewProps {
  graph: ConceptGraph;
  layout: GraphLayout;
  selectedNodeId: NodeId;
  neighborhoodDepths: Map<NodeId, number>;
  visibleNodeIds: Set<NodeId>;
  leafNodeIds: Set<NodeId>;
  camera: CameraState;
  onSelectNode: (id: NodeId) => void;
  onPan: (deltaWorldX: number, deltaWorldY: number) => void;
  onZoomAtPoint: (screenX: number, screenY: number, multiplier: number) => void;
}

export function ConstellationView({
  graph,
  layout,
  selectedNodeId,
  neighborhoodDepths,
  visibleNodeIds,
  leafNodeIds,
  camera,
  onSelectNode,
  onPan,
  onZoomAtPoint,
}: ConstellationViewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const {
    isDragging,
    edgeHoverTooltip,
    handlePointerDown,
    handlePointerMove,
    finishPointerInteraction,
    handleWheel,
    updateEdgeHoverTooltip,
    clearEdgeHoverTooltip,
  } = useConstellationInteractions({
    camera,
    graph,
    selectedNodeId,
    shellRef,
    onSelectNode,
    onPan,
    onZoomAtPoint,
  });

  const {
    edges,
    overviewEdges,
    overviewNodes,
    visibleNodes,
    visibleNodeIdList,
  } = useMemo(() => {
    const nextEdges: Array<{ from: NodeId; to: NodeId }> = [];
    const nextOverviewEdges: Array<{ from: NodePosition; to: NodePosition }> = [];
    const nextOverviewNodes: Array<{ id: NodeId; position: NodePosition }> = [];

    for (const [from, neighbors] of Object.entries(graph.neighborsByNode)) {
      const fromPosition = layout.positions[from];

      for (const to of neighbors) {
        if (visibleNodeIds.has(from) && visibleNodeIds.has(to)) {
          nextEdges.push({ from, to });
          continue;
        }

        if (!fromPosition) {
          continue;
        }

        const toPosition = layout.positions[to];
        if (!toPosition) {
          continue;
        }

        nextOverviewEdges.push({
          from: fromPosition,
          to: toPosition,
        });
      }
    }

    for (const nodeId of Object.keys(graph.nodes)) {
      if (visibleNodeIds.has(nodeId)) {
        continue;
      }

      const position = layout.positions[nodeId];
      if (!position) {
        continue;
      }

      nextOverviewNodes.push({ id: nodeId, position });
    }

    const nextVisibleNodes = Array.from(visibleNodeIds)
      .map((nodeId) => graph.nodes[nodeId])
      .filter((node): node is NonNullable<typeof node> => Boolean(node))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      edges: nextEdges,
      overviewEdges: nextOverviewEdges,
      overviewNodes: nextOverviewNodes,
      visibleNodes: nextVisibleNodes,
      visibleNodeIdList: nextVisibleNodes.map((node) => node.id),
    };
  }, [graph, layout, visibleNodeIds]);

  const visibleNodeStyleById = useMemo(() => {
    const stylesByNodeId = new Map<NodeId, CSSProperties>();

    for (const node of visibleNodes) {
      stylesByNodeId.set(node.id, buildVisibleNodeStyle(node.id));
    }

    return stylesByNodeId;
  }, [visibleNodes]);

  const overviewNodeStyleById = useMemo(() => {
    const stylesByNodeId = new Map<NodeId, CSSProperties>();

    for (const node of overviewNodes) {
      stylesByNodeId.set(node.id, buildOverviewNodeStyle(node.id));
    }

    return stylesByNodeId;
  }, [overviewNodes]);

  const overviewStarPoints = useMemo(
    () => buildFourPointStarPoints(OVERVIEW_NODE_RADIUS_PX * 1.25),
    [],
  );
  const defaultVisibleStarPoints = useMemo(
    () => buildFourPointStarPoints(8.5),
    [],
  );
  const selectedVisibleStarPoints = useMemo(
    () => buildFourPointStarPoints(10.5),
    [],
  );

  const adjustedPositions = useMemo(
    () => buildAdjustedVisiblePositions(
      visibleNodeIdList,
      layout.positions,
      selectedNodeId,
      neighborhoodDepths,
      camera,
    ),
    [visibleNodeIdList, layout.positions, selectedNodeId, neighborhoodDepths, camera],
  );

  const visibleLabelIds = useMemo(
    () => buildVisibleLabelSet(graph, visibleNodeIdList, adjustedPositions, selectedNodeId, neighborhoodDepths, camera),
    [graph, visibleNodeIdList, adjustedPositions, selectedNodeId, neighborhoodDepths, camera],
  );

  const transform = `translate(${VIEWPORT_WIDTH / 2} ${VIEWPORT_HEIGHT / 2}) scale(${camera.zoom}) translate(${-camera.x} ${-camera.y})`;

  return (
    <div
      ref={shellRef}
      className={`constellation-shell${isDragging ? " is-dragging" : ""}`}
      aria-label="Concept constellation map"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerInteraction}
      onPointerCancel={finishPointerInteraction}
      onLostPointerCapture={finishPointerInteraction}
      onPointerLeave={clearEdgeHoverTooltip}
      onWheel={handleWheel}
    >
      <svg className="constellation-lines" viewBox={`0 0 ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        <g transform={transform}>
          <g className="constellation-overview-layer" aria-hidden="true">
            {overviewEdges.map((edge, index) => (
              <line
                key={`overview-edge-${index}`}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                className="constellation-line-overview"
              />
            ))}
            {overviewNodes.map((node) => (
              <g
                key={`overview-node-${node.id}`}
                className="constellation-node-overview"
                transform={`translate(${node.position.x} ${node.position.y})`}
                style={overviewNodeStyleById.get(node.id)}
              >
                <polygon className="constellation-node-overview-shape" points={overviewStarPoints} />
              </g>
            ))}
          </g>

          {edges.map((edge) => {
            const fromPosition = adjustedPositions[edge.from] ?? layout.positions[edge.from];
            const toPosition = adjustedPositions[edge.to] ?? layout.positions[edge.to];

            if (!fromPosition || !toPosition) {
              return null;
            }

            return (
              <g key={`edge-${edge.from}-${edge.to}`}>
                {/*
                  Animated dashed overlay follows the directed edge orientation (from -> to),
                  making the graph "current" visible without changing interaction hit targets.
                */}
                <line
                  x1={fromPosition.x}
                  y1={fromPosition.y}
                  x2={toPosition.x}
                  y2={toPosition.y}
                  className={`constellation-line ${edgeClass(
                    edge.from,
                    edge.to,
                    selectedNodeId,
                    neighborhoodDepths,
                  )}`}
                />
                <line
                  x1={fromPosition.x}
                  y1={fromPosition.y}
                  x2={toPosition.x}
                  y2={toPosition.y}
                  className={`constellation-line-flow ${edgeClass(
                    edge.from,
                    edge.to,
                    selectedNodeId,
                    neighborhoodDepths,
                  )}`}
                />
                <line
                  x1={fromPosition.x}
                  y1={fromPosition.y}
                  x2={toPosition.x}
                  y2={toPosition.y}
                  data-edge-from-node-id={edge.from}
                  data-edge-to-node-id={edge.to}
                  className="constellation-line-hitzone"
                  onPointerEnter={(event) => updateEdgeHoverTooltip(event, edge.from, edge.to)}
                  onPointerMove={(event) => updateEdgeHoverTooltip(event, edge.from, edge.to)}
                  onPointerLeave={clearEdgeHoverTooltip}
                />
              </g>
            );
          })}

          {visibleNodes.map((node) => {
            const position = adjustedPositions[node.id] ?? layout.positions[node.id];
            if (!position) {
              return null;
            }

            const isLeaf = leafNodeIds.has(node.id);
            const isSelectedNode = node.id === selectedNodeId;
            const leafSize = node.id === selectedNodeId ? 16 : 13;
            const leafHalfSize = leafSize / 2;
            const starPoints = isSelectedNode ? selectedVisibleStarPoints : defaultVisibleStarPoints;
            const classes = nodeClass(node.id, selectedNodeId, neighborhoodDepths);
            const showLabel = shouldShowLabel(node.id, selectedNodeId, neighborhoodDepths)
              && visibleLabelIds.has(node.id);

            return (
              <g
                key={`node-${node.id}`}
                data-node-id={node.id}
                className={`constellation-node-group ${classes}${isLeaf ? " node-leaf" : ""}`}
                transform={`translate(${position.x} ${position.y})`}
                style={visibleNodeStyleById.get(node.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectNode(node.id);
                  }
                }}
              >
                {isLeaf ? (
                  <rect
                    className="constellation-node-dot constellation-node-leaf-marker"
                    x={-leafHalfSize}
                    y={-leafHalfSize}
                    width={leafSize}
                    height={leafSize}
                    rx={2}
                    ry={2}
                    transform="rotate(45)"
                  />
                ) : (
                  <g className="constellation-node-star">
                    <polygon className="constellation-node-dot" points={starPoints} />
                  </g>
                )}
                {showLabel ? (
                  <text className="constellation-node-label" x={LABEL_OFFSET_X} y={LABEL_OFFSET_Y}>
                    {node.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
      {edgeHoverTooltip ? (
        <div
          className="edge-hover-tooltip"
          style={{
            left: edgeHoverTooltip.screenX,
            top: edgeHoverTooltip.screenY,
          }}
        >
          {edgeHoverTooltip.label}
        </div>
      ) : null}
    </div>
  );
}
