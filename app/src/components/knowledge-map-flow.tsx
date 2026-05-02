"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Edge, Node, NodeMouseHandler } from "@xyflow/react";

import type { FlowNodeData } from "@/lib/computer-science-flow";

const CENTER_NODE_ORIGIN: [number, number] = [0.5, 0.5];
const INITIAL_ZOOM = 0.72;
const FIT_VIEW_OPTIONS = { padding: 0.18, maxZoom: INITIAL_ZOOM };
const BASE_EDGE_STYLE = {
  stroke: "rgba(126, 157, 192, 0.44)",
  strokeWidth: 1,
};
const DIMMED_EDGE_STYLE = {
  stroke: "rgba(84, 109, 139, 0.12)",
  strokeWidth: 0.8,
};
const HIGHLIGHTED_EDGE_STYLE = {
  stroke: "rgba(244, 190, 92, 0.86)",
  strokeWidth: 2.2,
};
const DIMMED_NODE_OPACITY = 0.2;
const NODE_STYLE_TRANSITION =
  "opacity 160ms ease, filter 160ms ease, box-shadow 160ms ease, border-color 160ms ease";

interface KnowledgeMapFlowProps {
  nodes: Array<Node<FlowNodeData>>;
  edges: Edge[];
}

type KnowledgeMapNode = Node<FlowNodeData>;

export function KnowledgeMapFlow(props: KnowledgeMapFlowProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeMapCanvas {...props} />
    </ReactFlowProvider>
  );
}

function KnowledgeMapCanvas({ nodes, edges }: KnowledgeMapFlowProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const linkedNodeIds = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    const linkedIds = new Set<string>([selectedNodeId]);

    for (const edge of edges) {
      if (edge.source === selectedNodeId) {
        linkedIds.add(edge.target);
      } else if (edge.target === selectedNodeId) {
        linkedIds.add(edge.source);
      }
    }

    return linkedIds;
  }, [edges, selectedNodeId]);

  const linkedEdgeIds = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    return new Set(
      edges
        .filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId)
        .map((edge) => edge.id),
    );
  }, [edges, selectedNodeId]);

  const highlightedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const isActive = linkedNodeIds?.has(node.id) ?? true;
        const isSelected = node.id === selectedNodeId;
        const isLinked = isActive && !isSelected && selectedNodeId !== null;

        return {
          ...node,
          zIndex: isSelected ? 2 : isLinked ? 1 : 0,
          style: {
            ...node.style,
            cursor: "pointer",
            opacity: isActive ? 1 : DIMMED_NODE_OPACITY,
            filter: isActive ? undefined : "saturate(0.45)",
            transition: NODE_STYLE_TRANSITION,
            border: isSelected
              ? "1px solid rgba(244, 190, 92, 0.94)"
              : isLinked
                ? "1px solid rgba(120, 213, 255, 0.72)"
                : node.style?.border,
            boxShadow: isSelected
              ? "0 0 0 2px rgba(244, 190, 92, 0.22), 0 22px 52px rgba(6, 9, 18, 0.5)"
              : isLinked
                ? "0 0 0 1px rgba(120, 213, 255, 0.18), 0 16px 36px rgba(6, 9, 18, 0.32)"
                : node.style?.boxShadow,
          },
        } satisfies KnowledgeMapNode;
      }),
    [linkedNodeIds, nodes, selectedNodeId],
  );

  const highlightedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const isActive = linkedEdgeIds?.has(edge.id) ?? true;

        return {
          ...edge,
          style: {
            ...BASE_EDGE_STYLE,
            ...edge.style,
            ...(linkedEdgeIds ? (isActive ? HIGHLIGHTED_EDGE_STYLE : DIMMED_EDGE_STYLE) : {}),
          },
        } satisfies Edge;
      }),
    [edges, linkedEdgeIds],
  );

  const handleNodeClick = useCallback<NodeMouseHandler<KnowledgeMapNode>>((_, node) => {
    setSelectedNodeId((currentNodeId) => (currentNodeId === node.id ? null : node.id));
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <ReactFlow
      nodes={highlightedNodes}
      edges={highlightedEdges}
      nodeOrigin={CENTER_NODE_ORIGIN}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      minZoom={0.08}
      maxZoom={1.4}
      onlyRenderVisibleElements
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      zoomOnDoubleClick={false}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      defaultEdgeOptions={{
        type: "default",
        selectable: false,
        focusable: false,
        style: BASE_EDGE_STYLE,
      }}
    >
      <Controls showInteractive={false} fitViewOptions={FIT_VIEW_OPTIONS} />
      <Background
        id="major-grid"
        variant={BackgroundVariant.Dots}
        gap={30}
        size={1.2}
        color="rgba(120, 213, 255, 0.16)"
        bgColor="transparent"
      />
      <Background
        id="minor-grid"
        variant={BackgroundVariant.Dots}
        gap={150}
        size={2.8}
        color="rgba(244, 190, 92, 0.12)"
        bgColor="transparent"
      />
    </ReactFlow>
  );
}
