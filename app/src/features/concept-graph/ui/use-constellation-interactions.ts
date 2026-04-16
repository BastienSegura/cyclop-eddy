"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent } from "react";

import type { ConceptGraph, NodeId } from "../domain/types";

import type { CameraState } from "./graph-explorer-helpers";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

const DRAG_THRESHOLD_PX = 6;

export interface EdgeHoverTooltip {
  label: string;
  screenX: number;
  screenY: number;
}

interface UseConstellationInteractionsArgs {
  camera: CameraState;
  graph: ConceptGraph;
  selectedNodeId: NodeId;
  shellRef: RefObject<HTMLDivElement | null>;
  onSelectNode: (id: NodeId) => void;
  onPan: (deltaWorldX: number, deltaWorldY: number) => void;
  onZoomAtPoint: (screenX: number, screenY: number, multiplier: number) => void;
}

export function useConstellationInteractions({
  camera,
  graph,
  selectedNodeId,
  shellRef,
  onSelectNode,
  onPan,
  onZoomAtPoint,
}: UseConstellationInteractionsArgs) {
  const [isDragging, setIsDragging] = useState(false);
  const [edgeHoverTooltip, setEdgeHoverTooltip] = useState<EdgeHoverTooltip | null>(null);

  const interactionRef = useRef({
    pointerId: -1,
    lastClientX: 0,
    lastClientY: 0,
    dragDistance: 0,
  });

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
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

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
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
    setEdgeHoverTooltip(null);
    event.preventDefault();
    onPan(-deltaScreenX / camera.zoom, -deltaScreenY / camera.zoom);
  }

  function finishPointerInteraction(event: ReactPointerEvent<HTMLDivElement>): void {
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

      const edgeElement = element?.closest("[data-edge-from-node-id][data-edge-to-node-id]") as HTMLElement | null;
      const edgeFromNodeId = edgeElement?.dataset.edgeFromNodeId;
      const edgeToNodeId = edgeElement?.dataset.edgeToNodeId;
      if (edgeFromNodeId && edgeToNodeId) {
        if (selectedNodeId === edgeFromNodeId) {
          onSelectNode(edgeToNodeId);
          return;
        }

        if (selectedNodeId === edgeToNodeId) {
          onSelectNode(edgeFromNodeId);
          return;
        }

        onSelectNode(edgeToNodeId);
      }
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>): void {
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

  function updateEdgeHoverTooltip(
    event: ReactPointerEvent<SVGLineElement>,
    edgeFromNodeId: NodeId,
    edgeToNodeId: NodeId,
  ): void {
    if (interactionRef.current.pointerId !== -1) {
      return;
    }

    const targetNodeId = selectedNodeId === edgeFromNodeId
      ? edgeToNodeId
      : selectedNodeId === edgeToNodeId
        ? edgeFromNodeId
        : edgeToNodeId;
    const targetNodeLabel = graph.nodes[targetNodeId]?.label ?? targetNodeId;
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (!shellRect) {
      return;
    }

    setEdgeHoverTooltip({
      label: targetNodeLabel,
      screenX: event.clientX - shellRect.left + 14,
      screenY: event.clientY - shellRect.top + 14,
    });
  }

  function clearEdgeHoverTooltip() {
    setEdgeHoverTooltip(null);
  }

  return {
    isDragging,
    edgeHoverTooltip,
    handlePointerDown,
    handlePointerMove,
    finishPointerInteraction,
    handleWheel,
    updateEdgeHoverTooltip,
    clearEdgeHoverTooltip,
  };
}
