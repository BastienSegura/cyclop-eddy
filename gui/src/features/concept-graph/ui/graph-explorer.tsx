"use client";

import { useEffect, useMemo, useState } from "react";

import { buildLearningPrompt } from "../application/build-learning-prompt";
import { loadConceptGraphFromPublicFile } from "../infrastructure/load-graph";
import type { ConceptGraph, NodeId } from "../domain/types";
import { ConstellationView } from "./constellation-view";

type LoadStatus = "loading" | "ready" | "error";

export function GraphExplorer() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<NodeId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setStatus("loading");
        const loadedGraph = await loadConceptGraphFromPublicFile();
        if (cancelled) {
          return;
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
    };
  }, []);

  const currentNode = useMemo(() => {
    if (!graph || !currentNodeId) {
      return null;
    }
    return graph.nodes[currentNodeId] ?? null;
  }, [graph, currentNodeId]);

  const neighborIds = useMemo(() => {
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

  const neighbors = useMemo(() => {
    if (!graph) {
      return [];
    }

    return neighborIds
      .map((nodeId) => graph.nodes[nodeId])
      .filter((node): node is NonNullable<typeof node> => Boolean(node))
      .slice(0, 12)
      .map((node) => ({ id: node.id, label: node.label }));
  }, [graph, neighborIds]);

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

  if (status === "loading") {
    return <p className="status-banner">Loading concept universe...</p>;
  }

  if (status === "error") {
    return <p className="status-banner error">Failed to load data: {errorMessage}</p>;
  }

  if (!graph || !currentNode) {
    return <p className="status-banner error">No concept data available.</p>;
  }

  return (
    <main className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Cyclop Eddy</h1>
          <p>Prototype: travel through a concept constellation.</p>
        </div>
        <div className="meta-stats">
          <span>{totalNodes} nodes</span>
          <span>{totalEdges} edges</span>
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
            <span>{neighbors.length} direct connections</span>
          </div>

          <ConstellationView
            centerLabel={currentNode.label}
            neighbors={neighbors}
            onSelectNeighbor={(nodeId) => setCurrentNodeId(nodeId)}
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
            {neighbors.length === 0 ? (
              <p>No outward links from this node.</p>
            ) : (
              <ul>
                {neighbors.map((neighbor) => (
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
