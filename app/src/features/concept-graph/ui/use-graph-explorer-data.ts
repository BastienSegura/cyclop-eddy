"use client";

import { useEffect, useState } from "react";

import type { ConceptGraph, NodeId } from "../domain/types";
import { loadConceptGraphFromPublicFile } from "../infrastructure/load-graph";

import {
  expandVisibleNodes,
  getInitialEntryNodeId,
} from "./graph-explorer-helpers";

export type LoadStatus = "loading" | "ready" | "error";

export function useGraphExplorerData() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<NodeId | null>(null);
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<NodeId>>(new Set<NodeId>());
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setStatus("loading");
        setErrorMessage("");
        const loadedGraph = await loadConceptGraphFromPublicFile();
        if (cancelled) {
          return;
        }

        if (Object.keys(loadedGraph.nodes).length === 0) {
          throw new Error("Empty graph payload");
        }

        const initialNodeId = getInitialEntryNodeId(loadedGraph);
        if (!initialNodeId) {
          throw new Error("No root node available in loaded graph");
        }

        setGraph(loadedGraph);
        setCurrentNodeId(initialNodeId);
        setVisibleNodeIds(expandVisibleNodes(loadedGraph, new Set<NodeId>(), initialNodeId));
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

  function focusNode(nodeId: NodeId) {
    if (!graph) {
      return;
    }

    setCurrentNodeId(nodeId);
    setVisibleNodeIds((previousVisibleNodeIds) =>
      expandVisibleNodes(graph, previousVisibleNodeIds, nodeId),
    );
  }

  function revealAllNodes() {
    if (!graph) {
      return;
    }

    setVisibleNodeIds(new Set<NodeId>(Object.keys(graph.nodes) as NodeId[]));
  }

  return {
    status,
    graph,
    currentNodeId,
    visibleNodeIds,
    errorMessage,
    focusNode,
    revealAllNodes,
  };
}
