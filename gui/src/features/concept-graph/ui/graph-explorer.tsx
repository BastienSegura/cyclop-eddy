"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { computeGraphLayout } from "../application/compute-graph-layout";
import { getNeighborhoodDepths } from "../application/get-neighborhood-depths";
import { buildLearningPrompt } from "../application/build-learning-prompt";
import { loadConceptGraphFromPublicFile } from "../infrastructure/load-graph";
import type { ConceptGraph, NodeId } from "../domain/types";
import { ConstellationView } from "./constellation-view";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./viewport-constants";

type LoadStatus = "loading" | "ready" | "error";

interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

const MIN_ZOOM = 0.07;
const MAX_ZOOM = 1.3;
const FOCUS_ZOOM = 0.18;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function GraphExplorer() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<NodeId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: FOCUS_ZOOM });

  const hasInitializedCamera = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  function stopCameraAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setStatus("loading");
        const loadedGraph = await loadConceptGraphFromPublicFile();
        if (cancelled) {
          return;
        }

        if (Object.keys(loadedGraph.nodes).length === 0) {
          throw new Error("Empty graph payload");
        }

        setGraph(loadedGraph);
        setCurrentNodeId(loadedGraph.rootNodeId);
        setStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        const message = error instanceof Error ? error.message : "Unknown loading error";
        setErrorMessage(message);
      }
    }

    run();

    return () => {
      cancelled = true;
      stopCameraAnimation();
    };
  }, []);

  const layout = useMemo(() => {
    if (!graph) {
      return null;
    }

    return computeGraphLayout(graph);
  }, [graph]);

  const currentNode = useMemo(() => {
    if (!graph || !currentNodeId) {
      return null;
    }
    return graph.nodes[currentNodeId] ?? null;
  }, [graph, currentNodeId]);

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
      setCamera((previous) => ({ ...previous, ...targetCamera }));
      return;
    }

    stopCameraAnimation();

    const animationDurationMs = 460;
    const startedAt = performance.now();

    setCamera((startCamera) => {
      const from = { ...startCamera };

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / animationDurationMs, 1);
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
  }, [layout, currentNodeId]);

  const neighborhoodDepths = useMemo(() => {
    if (!graph || !currentNodeId) {
      return new Map<NodeId, number>();
    }

    return getNeighborhoodDepths(graph, currentNodeId, 3);
  }, [graph, currentNodeId]);

  const outgoingNeighborIds = useMemo(() => {
    if (!graph || !currentNodeId) {
      return [] as NodeId[];
    }
    return graph.neighborsByNode[currentNodeId] ?? [];
  }, [graph, currentNodeId]);

  const parentIds = useMemo(() => {
    if (!graph || !currentNodeId) {
      return [] as NodeId[];
    }
    return graph.reverseNeighborsByNode[currentNodeId] ?? [];
  }, [graph, currentNodeId]);

  const connectedNeighbors = useMemo(() => {
    if (!graph || !currentNodeId) {
      return [];
    }

    const ids = new Set<NodeId>([...outgoingNeighborIds, ...parentIds]);

    return Array.from(ids)
      .map((nodeId) => graph.nodes[nodeId])
      .filter((node): node is NonNullable<typeof node> => Boolean(node))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [graph, currentNodeId, outgoingNeighborIds, parentIds]);

  const promptTemplate = useMemo(() => {
    if (!currentNode) {
      return "";
    }
    return buildLearningPrompt(currentNode.label);
  }, [currentNode]);

  const totalNodes = graph ? Object.keys(graph.nodes).length : 0;
  const totalEdges = graph
    ? Object.values(graph.neighborsByNode).reduce((sum, items) => sum + items.length, 0)
    : 0;

  const canGoBack = parentIds.length > 0;
  const firstParent = canGoBack ? parentIds[0] : null;

  async function copyPrompt() {
    if (!promptTemplate) {
      return;
    }

    try {
      await navigator.clipboard.writeText(promptTemplate);
      setCopyFeedback("Prompt copied.");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    } catch {
      setCopyFeedback("Copy failed.");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    }
  }

  function updateZoom(multiplier: number) {
    zoomAtPoint(VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2, multiplier);
  }

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

  function resetCameraZoom() {
    setCamera((previous) => ({
      ...previous,
      zoom: FOCUS_ZOOM,
    }));
  }

  if (status === "loading") {
    return <p className="status-banner">Loading concept universe...</p>;
  }

  if (status === "error") {
    return <p className="status-banner error">Failed to load data: {errorMessage}</p>;
  }

  if (!graph || !layout || !currentNodeId || !currentNode) {
    return <p className="status-banner error">No concept data available.</p>;
  }

  return (
    <main className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Cyclop Eddy</h1>
          <p>Prototype: smooth constellation travel. Click any visible node to move through the universe.</p>
        </div>
        <div className="meta-stats">
          <span>{totalNodes} nodes</span>
          <span>{totalEdges} edges</span>
          <span>zoom {camera.zoom.toFixed(2)}x</span>
        </div>
      </header>

      <section className="explorer-layout">
        <article className="constellation-panel">
          <div className="panel-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={!canGoBack}
              onClick={() => {
                if (firstParent) {
                  setCurrentNodeId(firstParent);
                }
              }}
            >
              Go to parent
            </button>

            <div className="camera-controls">
              <button type="button" className="ghost-button" onClick={() => updateZoom(1.15)}>
                Zoom +
              </button>
              <button type="button" className="ghost-button" onClick={() => updateZoom(0.87)}>
                Zoom -
              </button>
              <button type="button" className="ghost-button" onClick={resetCameraZoom}>
                Reset zoom
              </button>
            </div>
          </div>

          <ConstellationView
            graph={graph}
            layout={layout}
            selectedNodeId={currentNodeId}
            neighborhoodDepths={neighborhoodDepths}
            camera={camera}
            onSelectNode={(nodeId) => setCurrentNodeId(nodeId)}
            onPan={panCamera}
            onZoomAtPoint={zoomAtPoint}
          />
        </article>

        <aside className="details-panel">
          <h2>{currentNode.label}</h2>
          <p className="path-prefix">Path: {currentNode.pathPrefix}</p>

          <div className="prompt-box">
            <h3>Learning prompt template</h3>
            <pre>{promptTemplate}</pre>
            <button type="button" className="primary-button" onClick={copyPrompt}>
              Copy prompt
            </button>
            {copyFeedback ? <p className="copy-feedback">{copyFeedback}</p> : null}
          </div>

          <div className="neighbors-list">
            <h3>Connected concepts</h3>
            {connectedNeighbors.length === 0 ? (
              <p>No direct links from this node.</p>
            ) : (
              <ul>
                {connectedNeighbors.slice(0, 20).map((neighbor) => (
                  <li key={`list-${neighbor.id}`}>
                    <button type="button" onClick={() => setCurrentNodeId(neighbor.id)}>
                      {neighbor.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
