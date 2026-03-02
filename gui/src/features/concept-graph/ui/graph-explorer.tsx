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
const MAX_ZOOM = 2.1;
const FOCUS_ZOOM = 1.5;
const STATIC_ENTRY_NODE_ID = "computer science";
const INITIAL_MIN_ZOOM = 1.56;
const INITIAL_LOAD_ZOOM_MULTIPLIER = 1;
const ZOOM_SLIDER_CENTER = INITIAL_MIN_ZOOM;
const CAMERA_TRANSITION_DURATION_MS = 780;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function getDirectNeighborIds(graph: ConceptGraph, nodeId: NodeId): NodeId[] {
  const outgoing = graph.neighborsByNode[nodeId] ?? [];
  const incoming = graph.reverseNeighborsByNode[nodeId] ?? [];
  return Array.from(new Set<NodeId>([...outgoing, ...incoming]));
}

function getLeafNodeIds(graph: ConceptGraph): Set<NodeId> {
  const leafNodeIds = new Set<NodeId>();

  for (const nodeId of Object.keys(graph.nodes)) {
    if (getDirectNeighborIds(graph, nodeId).length <= 1) {
      leafNodeIds.add(nodeId);
    }
  }

  return leafNodeIds;
}

function expandVisibleNodes(
  graph: ConceptGraph,
  currentVisible: Set<NodeId>,
  focusNodeId: NodeId,
): Set<NodeId> {
  const nextVisible = new Set<NodeId>(currentVisible);
  nextVisible.add(focusNodeId);

  for (const neighborId of getDirectNeighborIds(graph, focusNodeId)) {
    nextVisible.add(neighborId);
  }

  return nextVisible;
}

function computeFitCameraForNodes(
  positions: Record<NodeId, { x: number; y: number }>,
  nodeIds: Set<NodeId>,
  focusNodeId: NodeId,
): CameraState {
  const candidateIds = nodeIds.size > 0 ? Array.from(nodeIds) : [focusNodeId];
  const visiblePositions = candidateIds
    .map((nodeId) => positions[nodeId])
    .filter((position): position is { x: number; y: number } => Boolean(position));

  const focusPosition = positions[focusNodeId];
  if (visiblePositions.length === 0 || !focusPosition) {
    return { x: 0, y: 0, zoom: FOCUS_ZOOM };
  }

  const sortedRadii = visiblePositions
    .map((position) => {
      const dx = position.x - focusPosition.x;
      const dy = position.y - focusPosition.y;
      return Math.sqrt(dx * dx + dy * dy);
    })
    .sort((a, b) => a - b);

  const robustRadiusIndex = Math.max(0, Math.floor((sortedRadii.length - 1) * 0.88));
  const robustRadius = sortedRadii[robustRadiusIndex] ?? 0;
  const effectiveRadius = Math.max(180, robustRadius + 70);
  const fitWidth = VIEWPORT_WIDTH / 2 - 70;
  const fitHeight = VIEWPORT_HEIGHT / 2 - 70;
  const zoomToFit = Math.min(fitWidth / effectiveRadius, fitHeight / effectiveRadius);

  return {
    x: focusPosition.x,
    y: focusPosition.y,
    zoom: clampZoom(Math.max(zoomToFit, INITIAL_MIN_ZOOM) * INITIAL_LOAD_ZOOM_MULTIPLIER),
  };
}

export function GraphExplorer() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<NodeId | null>(null);
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<NodeId>>(new Set<NodeId>());
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: FOCUS_ZOOM });
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);

  const hasInitializedCamera = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const constellationPanelRef = useRef<HTMLElement | null>(null);

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

        const initialNodeId = loadedGraph.nodes[STATIC_ENTRY_NODE_ID]
          ? STATIC_ENTRY_NODE_ID
          : loadedGraph.rootNodeId;

        if (!initialNodeId) {
          throw new Error("No root node available in loaded graph");
        }

        const initialVisibleNodeIds = expandVisibleNodes(
          loadedGraph,
          new Set<NodeId>(),
          initialNodeId,
        );

        setGraph(loadedGraph);
        setCurrentNodeId(initialNodeId);
        setVisibleNodeIds(initialVisibleNodeIds);
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

  useEffect(() => {
    setIsFullscreenSupported(document.fullscreenEnabled);

    const syncFullscreenState = () => {
      setIsGraphFullscreen(document.fullscreenElement === constellationPanelRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
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
      setCamera(computeFitCameraForNodes(layout.positions, visibleNodeIds, currentNodeId));
      return;
    }

    stopCameraAnimation();

    const animationDurationMs = CAMERA_TRANSITION_DURATION_MS;
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
  }, [layout, currentNodeId, visibleNodeIds]);

  const neighborhoodDepths = useMemo(() => {
    if (!graph || !currentNodeId) {
      return new Map<NodeId, number>();
    }

    return getNeighborhoodDepths(graph, currentNodeId, 1);
  }, [graph, currentNodeId]);

  const leafNodeIds = useMemo(() => {
    if (!graph) {
      return new Set<NodeId>();
    }

    return getLeafNodeIds(graph);
  }, [graph]);

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
  const hasDiscoveredAllNodes = visibleNodeIds.size >= totalNodes;
  const zoomSliderValueUnrounded = camera.zoom >= ZOOM_SLIDER_CENTER
    ? 50 + ((camera.zoom - ZOOM_SLIDER_CENTER) / Math.max(MAX_ZOOM - ZOOM_SLIDER_CENTER, 0.001)) * 50
    : 50 - ((ZOOM_SLIDER_CENTER - camera.zoom) / Math.max(ZOOM_SLIDER_CENTER - MIN_ZOOM, 0.001)) * 50;
  const zoomSliderValue = Math.min(
    100,
    Math.max(0, Math.round(zoomSliderValueUnrounded)),
  );

  function focusNode(nodeId: NodeId) {
    if (!graph) {
      return;
    }

    setCurrentNodeId(nodeId);
    setVisibleNodeIds((previousVisibleNodeIds) =>
      expandVisibleNodes(graph, previousVisibleNodeIds, nodeId),
    );
  }

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
    const clampedValue = Math.min(100, Math.max(0, nextValue));
    const targetZoom = clampedValue >= 50
      ? ZOOM_SLIDER_CENTER + ((clampedValue - 50) / 50) * (MAX_ZOOM - ZOOM_SLIDER_CENTER)
      : ZOOM_SLIDER_CENTER - ((50 - clampedValue) / 50) * (ZOOM_SLIDER_CENTER - MIN_ZOOM);
    stopCameraAnimation();

    setCamera((previous) => ({
      ...previous,
      zoom: clampZoom(targetZoom),
    }));
  }

  function revealAllNodes() {
    if (!graph) {
      return;
    }

    setVisibleNodeIds(new Set<NodeId>(Object.keys(graph.nodes) as NodeId[]));
  }

  async function toggleGraphFullscreen() {
    if (!isFullscreenSupported || !constellationPanelRef.current) {
      return;
    }

    try {
      if (document.fullscreenElement === constellationPanelRef.current) {
        await document.exitFullscreen();
        return;
      }

      await constellationPanelRef.current.requestFullscreen();
    } catch {
      // Ignore fullscreen errors (for example browser restrictions or canceled requests).
    }
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
          <span>{leafNodeIds.size} dead ends</span>
        </div>
      </header>

      <section className="explorer-layout">
        <article ref={constellationPanelRef} className="constellation-panel">
          <div className="panel-actions">
            <div className="navigation-controls">
              <button
                type="button"
                className="ghost-button"
                disabled={!canGoBack}
                onClick={() => {
                  if (firstParent) {
                    focusNode(firstParent);
                  }
                }}
              >
                Go to parent
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={hasDiscoveredAllNodes}
                onClick={revealAllNodes}
              >
                Discover all graph
              </button>
            </div>

            <div className="camera-controls">
              <div className="zoom-indicator" aria-label="Zoom level control">
                <label htmlFor="zoom-level-slider" className="zoom-indicator-text">Zoom Level</label>
                <input
                  id="zoom-level-slider"
                  className="zoom-level-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={zoomSliderValue}
                  onChange={(event) => setZoomFromSlider(Number(event.currentTarget.value))}
                />
              </div>
              <button
                type="button"
                className="fullscreen-toggle-button"
                aria-label={isGraphFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isGraphFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                disabled={!isFullscreenSupported}
                onClick={toggleGraphFullscreen}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {isGraphFullscreen ? (
                    <path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" />
                  ) : (
                    <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          <ConstellationView
            graph={graph}
            layout={layout}
            selectedNodeId={currentNodeId}
            neighborhoodDepths={neighborhoodDepths}
            visibleNodeIds={visibleNodeIds}
            leafNodeIds={leafNodeIds}
            camera={camera}
            onSelectNode={(nodeId) => focusNode(nodeId)}
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
                    <button type="button" onClick={() => focusNode(neighbor.id)}>
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
