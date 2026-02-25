"use client";

import { useRef, useState } from "react";

import type { ConceptGraph, NodeId } from "../domain/types";
import type { GraphLayout } from "../application/compute-graph-layout";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

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
  const suppressNodeClickRef = useRef(false);

  const edges: Array<{ from: NodeId; to: NodeId }> = [];

  for (const [from, neighbors] of Object.entries(graph.neighborsByNode)) {
    for (const to of neighbors) {
      edges.push({ from, to });
    }
  }

  const transform = `translate(${VIEWPORT_WIDTH / 2} ${VIEWPORT_HEIGHT / 2}) scale(${camera.zoom}) translate(${-camera.x} ${-camera.y})`;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      dragDistance: 0,
    };
    setIsDragging(true);
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
    interactionRef.current.dragDistance += stepDistance;

    if (interactionRef.current.dragDistance > 4) {
      suppressNodeClickRef.current = true;
    }

    if (stepDistance === 0) {
      return;
    }

    event.preventDefault();
    onPan(-deltaScreenX / camera.zoom, -deltaScreenY / camera.zoom);
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>): void {
    if (interactionRef.current.pointerId !== event.pointerId) {
      return;
    }

    interactionRef.current.pointerId = -1;
    setIsDragging(false);

    if (interactionRef.current.dragDistance <= 4) {
      suppressNodeClickRef.current = false;
      return;
    }

    window.setTimeout(() => {
      suppressNodeClickRef.current = false;
    }, 0);
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
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
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

          {Object.values(graph.nodes).map((node) => {
            const position = layout.positions[node.id];
            if (!position) {
              return null;
            }

            const classes = nodeClass(node.id, selectedNodeId, neighborhoodDepths);
            const showLabel = shouldShowLabel(node.id, selectedNodeId, neighborhoodDepths);

            return (
              <g
                key={`node-${node.id}`}
                className={`constellation-node-group ${classes}`}
                transform={`translate(${position.x} ${position.y})`}
                onClick={() => {
                  if (suppressNodeClickRef.current) {
                    return;
                  }
                  onSelectNode(node.id);
                }}
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
