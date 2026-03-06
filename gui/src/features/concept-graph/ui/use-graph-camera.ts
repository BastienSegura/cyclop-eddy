"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { GraphLayout } from "../application/graph-layout-types";
import type { NodeId } from "../domain/types";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

import {
  type CameraState,
  FOCUS_ZOOM,
  buildZoomSliderValue,
  clampZoom,
  computeFitCameraForNodes,
  getZoomFromSliderValue,
} from "./graph-explorer-helpers";

const CAMERA_TRANSITION_DURATION_MS = 780;

interface UseGraphCameraArgs {
  layout: GraphLayout | null;
  currentNodeId: NodeId | null;
  visibleNodeIds: Set<NodeId>;
}

export function useGraphCamera({
  layout,
  currentNodeId,
  visibleNodeIds,
}: UseGraphCameraArgs) {
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: FOCUS_ZOOM });

  const hasInitializedCamera = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  function stopCameraAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  useEffect(() => () => {
    stopCameraAnimation();
  }, []);

  useEffect(() => {
    if (!layout || !currentNodeId) {
      return;
    }

    const targetPosition = layout.positions[currentNodeId];
    if (!targetPosition) {
      return;
    }

    const targetCamera: CameraState = {
      x: targetPosition.x,
      y: targetPosition.y,
      zoom: camera.zoom,
    };

    if (!hasInitializedCamera.current) {
      hasInitializedCamera.current = true;
      setCamera(computeFitCameraForNodes(layout.positions, visibleNodeIds, currentNodeId));
      return;
    }

    stopCameraAnimation();

    const startedAt = performance.now();

    setCamera((startCamera) => {
      const from = { ...startCamera };

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / CAMERA_TRANSITION_DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setCamera((latest) => ({
          ...latest,
          x: from.x + (targetCamera.x - from.x) * eased,
          y: from.y + (targetCamera.y - from.y) * eased,
        }));

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };

      animationFrameRef.current = requestAnimationFrame(tick);
      return startCamera;
    });
  }, [currentNodeId, layout, visibleNodeIds]);

  const zoomSliderValue = useMemo(
    () => buildZoomSliderValue(camera.zoom),
    [camera.zoom],
  );

  function panCamera(deltaWorldX: number, deltaWorldY: number) {
    stopCameraAnimation();
    setCamera((previous) => ({
      ...previous,
      x: previous.x + deltaWorldX,
      y: previous.y + deltaWorldY,
    }));
  }

  function zoomAtPoint(screenX: number, screenY: number, multiplier: number) {
    stopCameraAnimation();
    const safeMultiplier = Math.min(1.35, Math.max(0.65, multiplier));

    setCamera((previous) => {
      const newZoom = clampZoom(previous.zoom * safeMultiplier);

      const worldX = previous.x + (screenX - VIEWPORT_WIDTH / 2) / previous.zoom;
      const worldY = previous.y + (screenY - VIEWPORT_HEIGHT / 2) / previous.zoom;

      return {
        x: worldX - (screenX - VIEWPORT_WIDTH / 2) / newZoom,
        y: worldY - (screenY - VIEWPORT_HEIGHT / 2) / newZoom,
        zoom: newZoom,
      };
    });
  }

  function setZoomFromSlider(nextValue: number) {
    stopCameraAnimation();

    setCamera((previous) => ({
      ...previous,
      zoom: getZoomFromSliderValue(nextValue),
    }));
  }

  return {
    camera,
    zoomSliderValue,
    panCamera,
    zoomAtPoint,
    setZoomFromSlider,
  };
}
