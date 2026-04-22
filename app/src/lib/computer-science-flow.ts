import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Edge, Node } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk.bundled.js";

const NODE_WIDTH = 188;
const NODE_HEIGHT = 56;
const COMPUTER_SCIENCE_MAP_PATH = path.resolve(
  process.cwd(),
  "..",
  "knowledge-map-gen",
  "maps",
  "computer-science.json",
);

const elk = new ELK();

interface KnowledgeMapFile {
  root: string;
  concepts: Record<string, string[]>;
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  kind: "root" | "branch" | "leaf";
  depth: number | null;
}

export interface ComputerScienceFlow {
  root: string;
  sourcePath: string;
  nodes: Array<Node<FlowNodeData>>;
  edges: Edge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    branchCount: number;
    leafCount: number;
    maxDepth: number;
  };
}

export async function loadComputerScienceFlow(): Promise<ComputerScienceFlow> {
  const input = await readKnowledgeMapFile();
  const depths = computeDepths(input.root, input.concepts);
  const labels = collectLabels(input.concepts).sort((left, right) => {
    const leftDepth = depths.get(left) ?? Number.POSITIVE_INFINITY;
    const rightDepth = depths.get(right) ?? Number.POSITIVE_INFINITY;

    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }

    return left.localeCompare(right);
  });

  const degreeByLabel = buildDegreeIndex(labels, input.concepts);
  const edges = buildFlowEdges(input.concepts);
  const positions = await computeNodePositions(labels, edges);

  const nodes = labels.map((label) => {
    const depth = depths.get(label) ?? null;
    const kind = resolveNodeKind(label, input.root, degreeByLabel.outdegree);
    const position = positions.get(label) ?? { x: 0, y: 0 };

    return {
      id: label,
      position,
      data: {
        label,
        kind,
        depth,
      },
      className: `knowledge-node knowledge-node--${kind}`,
      draggable: false,
      selectable: false,
      focusable: false,
      sourcePosition: "right" as Node<FlowNodeData>["sourcePosition"],
      targetPosition: "left" as Node<FlowNodeData>["targetPosition"],
      style: buildNodeStyle(kind),
    } satisfies Node<FlowNodeData>;
  });

  let branchCount = 0;
  let leafCount = 0;

  for (const label of labels) {
    if ((degreeByLabel.outdegree.get(label) ?? 0) === 0) {
      leafCount += 1;
    } else if (label !== input.root) {
      branchCount += 1;
    }
  }

  const maxDepth = Array.from(depths.values()).reduce(
    (currentMax, value) => Math.max(currentMax, value),
    0,
  );

  return {
    root: input.root,
    sourcePath: COMPUTER_SCIENCE_MAP_PATH,
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      branchCount,
      leafCount,
      maxDepth,
    },
  };
}

async function readKnowledgeMapFile(): Promise<KnowledgeMapFile> {
  const raw = await readFile(COMPUTER_SCIENCE_MAP_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<KnowledgeMapFile>;

  if (!parsed.root || !parsed.concepts) {
    throw new Error(`Invalid knowledge map payload in ${COMPUTER_SCIENCE_MAP_PATH}`);
  }

  return {
    root: parsed.root,
    concepts: parsed.concepts,
  };
}

function collectLabels(concepts: Record<string, string[]>): string[] {
  const labels = new Set<string>();

  for (const [source, targets] of Object.entries(concepts)) {
    labels.add(source);

    for (const target of targets) {
      labels.add(target);
    }
  }

  return Array.from(labels);
}

function buildDegreeIndex(labels: string[], concepts: Record<string, string[]>) {
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();

  for (const label of labels) {
    indegree.set(label, 0);
    outdegree.set(label, 0);
  }

  for (const [source, targets] of Object.entries(concepts)) {
    outdegree.set(source, targets.length);

    for (const target of targets) {
      indegree.set(target, (indegree.get(target) ?? 0) + 1);
    }
  }

  return { indegree, outdegree };
}

function buildFlowEdges(concepts: Record<string, string[]>): Edge[] {
  const edges: Edge[] = [];

  for (const [source, targets] of Object.entries(concepts)) {
    for (const target of targets) {
      edges.push({
        id: `${source}-->${target}`,
        source,
        target,
        type: "straight",
        selectable: false,
        focusable: false,
      });
    }
  }

  return edges;
}

function computeDepths(root: string, concepts: Record<string, string[]>): Map<string, number> {
  const depths = new Map<string, number>([[root, 0]]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const nextDepth = (depths.get(current) ?? 0) + 1;

    for (const neighbor of concepts[current] ?? []) {
      if (depths.has(neighbor)) {
        continue;
      }

      depths.set(neighbor, nextDepth);
      queue.push(neighbor);
    }
  }

  return depths;
}

async function computeNodePositions(
  labels: string[],
  edges: Edge[],
): Promise<Map<string, { x: number; y: number }>> {
  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph: ElkNode = {
    id: "computer-science-map",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.nodeNode": "40",
      "elk.padding": "[top=32,left=32,bottom=32,right=32]",
    },
    children: labels.map((label) => ({
      id: label,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: elkEdges,
  };

  const layout = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();

  for (const child of layout.children ?? []) {
    positions.set(child.id, {
      x: child.x ?? 0,
      y: child.y ?? 0,
    });
  }

  return positions;
}

function resolveNodeKind(
  label: string,
  root: string,
  outdegree: Map<string, number>,
): FlowNodeData["kind"] {
  if (label === root) {
    return "root";
  }

  return (outdegree.get(label) ?? 0) === 0 ? "leaf" : "branch";
}

function buildNodeStyle(kind: FlowNodeData["kind"]): Node<FlowNodeData>["style"] {
  if (kind === "root") {
    return {
      width: NODE_WIDTH,
      padding: "14px 16px",
      borderRadius: "18px",
      border: "1px solid rgba(244, 190, 92, 0.72)",
      background:
        "linear-gradient(180deg, rgba(244, 190, 92, 0.18), rgba(120, 84, 22, 0.55))",
      color: "#fff3d7",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.01em",
      boxShadow: "0 20px 45px rgba(6, 9, 18, 0.4)",
    };
  }

  if (kind === "leaf") {
    return {
      width: NODE_WIDTH,
      padding: "14px 16px",
      borderRadius: "16px",
      border: "1px solid rgba(134, 162, 194, 0.28)",
      background:
        "linear-gradient(180deg, rgba(25, 42, 62, 0.84), rgba(13, 22, 34, 0.92))",
      color: "#c4d4e6",
      fontSize: "12px",
      fontWeight: 600,
      boxShadow: "none",
    };
  }

  return {
    width: NODE_WIDTH,
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid rgba(92, 149, 214, 0.4)",
    background:
      "linear-gradient(180deg, rgba(34, 63, 93, 0.9), rgba(20, 34, 51, 0.95))",
    color: "#e9f3ff",
    fontSize: "12px",
    fontWeight: 650,
    boxShadow: "0 16px 36px rgba(6, 9, 18, 0.28)",
  };
}
