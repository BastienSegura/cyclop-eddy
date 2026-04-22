"use client";

import { useMemo, useState } from "react";

import { computeGraphLayout } from "../application/compute-graph-layout";
import { getNeighborhoodDepths } from "../application/get-neighborhood-depths";
import { buildLearningPrompt } from "../application/build-learning-prompt";
import type { NodeId } from "../domain/types";
import { ConstellationView } from "./constellation-view";
import { GraphExplorerHeader } from "./graph-explorer-header";
import { getLeafNodeIds } from "./graph-explorer-helpers";
import { GraphExplorerSidebar } from "./graph-explorer-sidebar";
import { GraphExplorerToolbar } from "./graph-explorer-toolbar";
import { useGraphCamera } from "./use-graph-camera";
import { useGraphExplorerData } from "./use-graph-explorer-data";
import { useGraphFullscreen } from "./use-graph-fullscreen";

export function GraphExplorer() {
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const {
    status,
    graph,
    currentNodeId,
    visibleNodeIds,
    errorMessage,
    focusNode,
    revealAllNodes,
  } = useGraphExplorerData();

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

  const {
    camera,
    zoomSliderValue,
    panCamera,
    zoomAtPoint,
    setZoomFromSlider,
  } = useGraphCamera({
    layout,
    currentNodeId,
    visibleNodeIds,
  });

  const {
    panelRef,
    isGraphFullscreen,
    isFullscreenSupported,
    toggleGraphFullscreen,
  } = useGraphFullscreen();

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
  const rootNodeId = graph?.rootNodeId ?? null;
  const canGoToRoot = Boolean(rootNodeId && currentNodeId !== rootNodeId);
  const hasDiscoveredAllNodes = visibleNodeIds.size >= totalNodes;

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
      <GraphExplorerHeader
        totalNodes={totalNodes}
        totalEdges={totalEdges}
        leafNodeCount={leafNodeIds.size}
      />

      <section className="explorer-layout">
        <article ref={panelRef} className="constellation-panel">
          <GraphExplorerToolbar
            canGoBack={canGoBack}
            canGoToRoot={canGoToRoot}
            hasDiscoveredAllNodes={hasDiscoveredAllNodes}
            firstParent={firstParent}
            rootNodeId={rootNodeId}
            zoomSliderValue={zoomSliderValue}
            isGraphFullscreen={isGraphFullscreen}
            isFullscreenSupported={isFullscreenSupported}
            onFocusNode={focusNode}
            onRevealAllNodes={revealAllNodes}
            onSetZoomFromSlider={setZoomFromSlider}
            onToggleGraphFullscreen={toggleGraphFullscreen}
          />

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

        <GraphExplorerSidebar
          currentNode={currentNode}
          promptTemplate={promptTemplate}
          copyFeedback={copyFeedback}
          connectedNeighbors={connectedNeighbors}
          onCopyPrompt={copyPrompt}
          onFocusNode={focusNode}
        />
      </section>
    </main>
  );
}
