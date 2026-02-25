"use client";

import { useRef, useState } from "react";

import type { ConceptGraph, NodeId } from "../domain/types";
import type { GraphLayout } from "../application/compute-graph-layout";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

const DRAG_THRESHOLD_PX = 6;

interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

interface ConstellationViewProps {
  graph: ConceptGraph;
  layout: GraphLayout;
  selectedNodeId: NodeId;
  neighborhoodDepths: Map<NodeId, number>;
  visibleNodeIds: Set<NodeId>;
  camera: CameraState;
  onSelectNode: (id: NodeId) => void;
  onPan: (deltaWorldX: number, deltaWorldY: number) => void;
  onZoomAtPoint: (screenX: number, screenY: number, multiplier: number) => void;
}

function edgeClass(
  from: NodeId,
  to: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
): string {
  const fromDepth = neighborhoodDepths.get(from);
  const toDepth = neighborhoodDepths.get(to);

  if (fromDepth === undefined && toDepth === undefined) {
    return "edge-far";
  }

  const bestDepth = Math.min(fromDepth ?? Number.POSITIVE_INFINITY, toDepth ?? Number.POSITIVE_INFINITY);
  if (bestDepth <= 1) {
    return "edge-near";
  }

  return "edge-mid";
}

function nodeClass(nodeId: NodeId, selectedNodeId: NodeId, neighborhoodDepths: Map<NodeId, number>): string {
  if (nodeId === selectedNodeId) {
    return "node-selected";
  }

  const depth = neighborhoodDepths.get(nodeId);
  if (depth === undefined) {
    return "node-far";
  }

  if (depth === 1) {
    return "node-near";
  }

  return "node-mid";
}

function shouldShowLabel(nodeId: NodeId, selectedNodeId: NodeId, neighborhoodDepths: Map<NodeId, number>): boolean {
  if (nodeId === selectedNodeId) {
    return true;
  }

  const depth = neighborhoodDepths.get(nodeId);
  return depth !== undefined && depth <= 1;
}

export function ConstellationView({
  graph,
  layout,
  selectedNodeId,
  neighborhoodDepths,
  visibleNodeIds,
  camera,
  onSelectNode,
  onPan,
  onZoomAtPoint,
}: ConstellationViewProps) {
  const [isDragging, setIsDragging] = useState(false);

  const interactionRef = useRef({
    pointerId: -1,
    lastClientX: 0,
    lastClientY: 0,
    dragDistance: 0,
  });

  const edges: Array<{ from: NodeId; to: NodeId }> = [];

  for (const [from, neighbors] of Object.entries(graph.neighborsByNode)) {
    if (!visibleNodeIds.has(from)) {
      continue;
    }
    for (const to of neighbors) {
      if (!visibleNodeIds.has(to)) {
        continue;
      }
      edges.push({ from, to });
    }
  }

  const visibleNodes = Array.from(visibleNodeIds)
    .map((nodeId) => graph.nodes[nodeId])
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .sort((a, b) => a.label.localeCompare(b.label));

  const transform = `translate(${VIEWPORT_WIDTH / 2} ${VIEWPORT_HEIGHT / 2}) scale(${camera.zoom}) translate(${-camera.x} ${-camera.y})`;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    if (interactionRef.current.pointerId !== -1) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(false);
    interactionRef.current = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      dragDistance: 0,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    if (interactionRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaScreenX = event.clientX - interactionRef.current.lastClientX;
    const deltaScreenY = event.clientY - interactionRef.current.lastClientY;

    interactionRef.current.lastClientX = event.clientX;
    interactionRef.current.lastClientY = event.clientY;

    const stepDistance = Math.hypot(deltaScreenX, deltaScreenY);
    const nextDragDistance = interactionRef.current.dragDistance + stepDistance;
    interactionRef.current.dragDistance = nextDragDistance;

    if (stepDistance === 0) {
      return;
    }

    if (nextDragDistance <= DRAG_THRESHOLD_PX) {
      return;
    }

    setIsDragging(true);
    event.preventDefault();
    onPan(-deltaScreenX / camera.zoom, -deltaScreenY / camera.zoom);
  }

  function finishPointerInteraction(event: React.PointerEvent<HTMLDivElement>): void {
    if (interactionRef.current.pointerId !== event.pointerId) {
      return;
    }

    const dragDistance = interactionRef.current.dragDistance;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    interactionRef.current.pointerId = -1;
    interactionRef.current.dragDistance = 0;
    setIsDragging(false);

    if (dragDistance <= DRAG_THRESHOLD_PX) {
      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const nodeElement = element?.closest("[data-node-id]") as HTMLElement | null;
      const nodeId = nodeElement?.dataset.nodeId;
      if (nodeId) {
        onSelectNode(nodeId);
      }
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    event.preventDefault();

    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;

    const screenX = xRatio * VIEWPORT_WIDTH;
    const screenY = yRatio * VIEWPORT_HEIGHT;
    const multiplier = Math.exp(-event.deltaY * 0.0015);

    onZoomAtPoint(screenX, screenY, multiplier);
  }

  return (
    <div
      className={`constellation-shell${isDragging ? " is-dragging" : ""}`}
      aria-label="Concept constellation map"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerInteraction}
      onPointerCancel={finishPointerInteraction}
      onLostPointerCapture={finishPointerInteraction}
      onWheel={handleWheel}
    >
      <svg className="constellation-lines" viewBox={`0 0 ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        <g transform={transform}>
          {edges.map((edge) => {
            const fromPosition = layout.positions[edge.from];
            const toPosition = layout.positions[edge.to];

            if (!fromPosition || !toPosition) {
              return null;
            }

            return (
              <line
                key={`edge-${edge.from}-${edge.to}`}
                x1={fromPosition.x}
                y1={fromPosition.y}
                x2={toPosition.x}
                y2={toPosition.y}
                className={`constellation-line ${edgeClass(edge.from, edge.to, neighborhoodDepths)}`}
              />
            );
          })}

          {visibleNodes.map((node) => {
            const position = layout.positions[node.id];
            if (!position) {
              return null;
            }

            const classes = nodeClass(node.id, selectedNodeId, neighborhoodDepths);
            const showLabel = shouldShowLabel(node.id, selectedNodeId, neighborhoodDepths);

            return (
              <g
                key={`node-${node.id}`}
                data-node-id={node.id}
                className={`constellation-node-group ${classes}`}
                transform={`translate(${position.x} ${position.y})`}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectNode(node.id);
                  }
                }}
              >
                <circle className="constellation-node-dot" r={node.id === selectedNodeId ? 18 : 10} />
                {showLabel ? (
                  <text className="constellation-node-label" x={14} y={-14}>
                    {node.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
