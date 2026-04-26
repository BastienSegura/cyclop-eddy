"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";

import type { FlowNodeData } from "@/lib/computer-science-flow";

const CENTER_NODE_ORIGIN: [number, number] = [0.5, 0.5];
const INITIAL_ZOOM = 0.72;

interface KnowledgeMapFlowProps {
  nodes: Array<Node<FlowNodeData>>;
  edges: Edge[];
}

export function KnowledgeMapFlow(props: KnowledgeMapFlowProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeMapCanvas {...props} />
    </ReactFlowProvider>
  );
}

function KnowledgeMapCanvas({ nodes, edges }: KnowledgeMapFlowProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeOrigin={CENTER_NODE_ORIGIN}
      defaultViewport={{ x: 0, y: 0, zoom: INITIAL_ZOOM }}
      onInit={(instance) => {
        void instance.setCenter(0, 0, { zoom: INITIAL_ZOOM, duration: 0 });
      }}
      minZoom={0.16}
      maxZoom={1.4}
      onlyRenderVisibleElements
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      zoomOnDoubleClick={false}
      defaultEdgeOptions={{
        type: "straight",
        selectable: false,
        focusable: false,
        style: {
          stroke: "rgba(126, 157, 192, 0.44)",
          strokeWidth: 1,
        },
      }}
    >
      <Controls showInteractive={false} fitViewOptions={{ padding: 0.18, maxZoom: 0.72 }} />
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
