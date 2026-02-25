"use client";

import { useMemo, useRef, useState } from "react";

import type { GraphLayout, NodePosition } from "../application/compute-graph-layout";
import type { ConceptGraph, NodeId } from "../domain/types";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

const DRAG_THRESHOLD_PX = 6;
const VIEWPORT_MARGIN_PX = 140;
const COLLISION_ITERATIONS = 7;
const BASE_NODE_DISTANCE_PX = 34;
const LABEL_OFFSET_X = 14;
const LABEL_OFFSET_Y = -14;
const LABEL_HEIGHT_PX = 14;
const LABEL_PADDING_PX = 5;

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

interface ScreenPoint {
  x: number;
  y: number;
}

interface LabelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function edgeClass(
  from: NodeId,
  to: NodeId,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
): string {
  const fromDepth = neighborhoodDepths.get(from);
  const toDepth = neighborhoodDepths.get(to);

  if (from === selectedNodeId || to === selectedNodeId) {
    return "edge-near";
  }

  if (fromDepth === undefined && toDepth === undefined) {
    return "edge-far";
  }

  if (fromDepth !== undefined && toDepth !== undefined) {
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

function screenFromWorld(world: NodePosition, camera: CameraState): ScreenPoint {
  return {
    x: (world.x - camera.x) * camera.zoom + VIEWPORT_WIDTH / 2,
    y: (world.y - camera.y) * camera.zoom + VIEWPORT_HEIGHT / 2,
  };
}

function worldFromScreen(screen: ScreenPoint, camera: CameraState): NodePosition {
  return {
    x: camera.x + (screen.x - VIEWPORT_WIDTH / 2) / camera.zoom,
    y: camera.y + (screen.y - VIEWPORT_HEIGHT / 2) / camera.zoom,
  };
}

function isWithinViewport(point: ScreenPoint, margin: number): boolean {
  return (
    point.x >= -margin
    && point.x <= VIEWPORT_WIDTH + margin
    && point.y >= -margin
    && point.y <= VIEWPORT_HEIGHT + margin
  );
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
}

function buildAdjustedVisiblePositions(
  visibleNodeIds: NodeId[],
  layout: GraphLayout,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
  camera: CameraState,
): Record<NodeId, NodePosition> {
  const adjustedByNodeId: Record<NodeId, NodePosition> = {};

  const baseScreenByNodeId = new Map<NodeId, ScreenPoint>();
  for (const nodeId of visibleNodeIds) {
    const world = layout.positions[nodeId];
    if (!world) {
      continue;
    }

    baseScreenByNodeId.set(nodeId, screenFromWorld(world, camera));
    adjustedByNodeId[nodeId] = world;
  }

  const activeNodeIds = visibleNodeIds.filter((nodeId) => {
    const screen = baseScreenByNodeId.get(nodeId);
    if (!screen) {
      return false;
    }

    if (nodeId === selectedNodeId) {
      return true;
    }

    const depth = neighborhoodDepths.get(nodeId);
    if (depth !== undefined && depth <= 1) {
      return true;
    }

    return isWithinViewport(screen, VIEWPORT_MARGIN_PX);
  });

  if (activeNodeIds.length <= 1 || camera.zoom <= 0) {
    return adjustedByNodeId;
  }

  const currentByNodeId = new Map<NodeId, ScreenPoint>();
  for (const nodeId of activeNodeIds) {
    const base = baseScreenByNodeId.get(nodeId);
    if (base) {
      currentByNodeId.set(nodeId, { ...base });
    }
  }

  for (let iteration = 0; iteration < COLLISION_ITERATIONS; iteration += 1) {
    for (let i = 0; i < activeNodeIds.length; i += 1) {
      for (let j = i + 1; j < activeNodeIds.length; j += 1) {
        const aNodeId = activeNodeIds[i];
        const bNodeId = activeNodeIds[j];

        const a = currentByNodeId.get(aNodeId);
        const b = currentByNodeId.get(bNodeId);
        if (!a || !b) {
          continue;
        }

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy + 0.01);

        let minDistance = BASE_NODE_DISTANCE_PX;
        if (aNodeId === selectedNodeId || bNodeId === selectedNodeId) {
          minDistance += 9;
        }

        const aDepth = neighborhoodDepths.get(aNodeId);
        const bDepth = neighborhoodDepths.get(bNodeId);
        if (aDepth === 1 || bDepth === 1) {
          minDistance += 5;
        }

        if (distance >= minDistance) {
          continue;
        }

        const overlap = (minDistance - distance) * 0.5;
        const unitX = dx / distance;
        const unitY = dy / distance;

        const aFixed = aNodeId === selectedNodeId;
        const bFixed = bNodeId === selectedNodeId;

        if (!aFixed) {
          const factor = bFixed ? 2 : 1;
          a.x += unitX * overlap * factor;
          a.y += unitY * overlap * factor;
        }
        if (!bFixed) {
          const factor = aFixed ? 2 : 1;
          b.x -= unitX * overlap * factor;
          b.y -= unitY * overlap * factor;
        }
      }
    }

    for (const nodeId of activeNodeIds) {
      if (nodeId === selectedNodeId) {
        continue;
      }

      const base = baseScreenByNodeId.get(nodeId);
      const current = currentByNodeId.get(nodeId);
      if (!base || !current) {
        continue;
      }

      current.x += (base.x - current.x) * 0.08;
      current.y += (base.y - current.y) * 0.08;
    }
  }

  for (const nodeId of activeNodeIds) {
    const current = currentByNodeId.get(nodeId);
    if (!current) {
      continue;
    }

    adjustedByNodeId[nodeId] = worldFromScreen(current, camera);
  }

  return adjustedByNodeId;
}

function buildVisibleLabelSet(
  graph: ConceptGraph,
  visibleNodeIds: NodeId[],
  adjustedPositions: Record<NodeId, NodePosition>,
  selectedNodeId: NodeId,
  neighborhoodDepths: Map<NodeId, number>,
  camera: CameraState,
): Set<NodeId> {
  const candidates = visibleNodeIds
    .filter((nodeId) => shouldShowLabel(nodeId, selectedNodeId, neighborhoodDepths))
    .sort((a, b) => {
      if (a === selectedNodeId) {
        return -1;
      }
      if (b === selectedNodeId) {
        return 1;
      }

      const aDepth = neighborhoodDepths.get(a) ?? 99;
      const bDepth = neighborhoodDepths.get(b) ?? 99;
      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }

      const aDegree = (graph.neighborsByNode[a]?.length ?? 0) + (graph.reverseNeighborsByNode[a]?.length ?? 0);
      const bDegree = (graph.neighborsByNode[b]?.length ?? 0) + (graph.reverseNeighborsByNode[b]?.length ?? 0);
      if (bDegree !== aDegree) {
        return bDegree - aDegree;
      }

      return graph.nodes[a].label.localeCompare(graph.nodes[b].label);
    });

  const acceptedLabelBoxes: LabelBox[] = [];
  const visibleLabelIds = new Set<NodeId>();

  for (const nodeId of candidates) {
    const world = adjustedPositions[nodeId];
    if (!world) {
      continue;
    }

    const screen = screenFromWorld(world, camera);

    if (nodeId !== selectedNodeId && !isWithinViewport(screen, VIEWPORT_MARGIN_PX / 2)) {
      continue;
    }

    const label = graph.nodes[nodeId].label;
    const estimatedWidth = Math.min(240, Math.max(48, label.length * 6.8 + 12));

    const box: LabelBox = {
      left: screen.x + LABEL_OFFSET_X - LABEL_PADDING_PX,
      top: screen.y + LABEL_OFFSET_Y - LABEL_HEIGHT_PX - LABEL_PADDING_PX,
      right: screen.x + LABEL_OFFSET_X + estimatedWidth + LABEL_PADDING_PX,
      bottom: screen.y + LABEL_OFFSET_Y + LABEL_PADDING_PX,
    };

    if (nodeId !== selectedNodeId) {
      const overlaps = acceptedLabelBoxes.some((acceptedBox) => boxesOverlap(box, acceptedBox));
      if (overlaps) {
        continue;
      }
    }

    acceptedLabelBoxes.push(box);
    visibleLabelIds.add(nodeId);
  }

  return visibleLabelIds;
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

  const visibleNodeIdList = visibleNodes.map((node) => node.id);

  const adjustedPositions = useMemo(
    () => buildAdjustedVisiblePositions(visibleNodeIdList, layout, selectedNodeId, neighborhoodDepths, camera),
    [visibleNodeIdList, layout, selectedNodeId, neighborhoodDepths, camera],
  );

  const visibleLabelIds = useMemo(
    () => buildVisibleLabelSet(graph, visibleNodeIdList, adjustedPositions, selectedNodeId, neighborhoodDepths, camera),
    [graph, visibleNodeIdList, adjustedPositions, selectedNodeId, neighborhoodDepths, camera],
  );

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
        return;
      }

      const edgeTargetElement = element?.closest("[data-target-node-id]") as HTMLElement | null;
      const targetNodeId = edgeTargetElement?.dataset.targetNodeId;
      if (targetNodeId) {
        onSelectNode(targetNodeId);
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
            const fromPosition = adjustedPositions[edge.from] ?? layout.positions[edge.from];
            const toPosition = adjustedPositions[edge.to] ?? layout.positions[edge.to];

            if (!fromPosition || !toPosition) {
              return null;
            }

            return (
              <g key={`edge-${edge.from}-${edge.to}`}>
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
                  data-target-node-id={edge.to}
                  className="constellation-line-hitzone"
                />
              </g>
            );
          })}

          {visibleNodes.map((node) => {
            const position = adjustedPositions[node.id] ?? layout.positions[node.id];
            if (!position) {
              return null;
            }

            const classes = nodeClass(node.id, selectedNodeId, neighborhoodDepths);
            const showLabel = shouldShowLabel(node.id, selectedNodeId, neighborhoodDepths)
              && visibleLabelIds.has(node.id);

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
                  <text className="constellation-node-label" x={LABEL_OFFSET_X} y={LABEL_OFFSET_Y}>
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
