import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Edge, Node } from "@xyflow/react";

const NODE_WIDTH = 188;
const NODE_HEIGHT = 56;
const MIN_DESCENDANT_SPAN = Math.PI / 5;
const MAX_DESCENDANT_SPAN = Math.PI * 0.95;
const ROOT_START_ANGLE = -Math.PI / 2;
const COMPUTER_SCIENCE_MAP_PATH = path.resolve(
  process.cwd(),
  "..",
  "knowledge-map-gen",
  "maps",
  "computer-science.json",
);

export interface RadialLayoutOptions {
  rootChildRadius: number;
  branchChildRadius: number;
  outerChildRadius: number;
  minSiblingArc: number;
  rootChildMinArc: number;
  collisionPadding: number;
  collisionIterations: number;
  maxCollisionShift: number;
  maxCollisionOffset: number;
}

interface RadialLayoutTuningField {
  key: keyof RadialLayoutOptions;
  label: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
}

export const DEFAULT_RADIAL_LAYOUT_OPTIONS: RadialLayoutOptions = {
  rootChildRadius: 540,
  branchChildRadius: 520,
  outerChildRadius: 420,
  minSiblingArc: 240,
  rootChildMinArc: NODE_WIDTH + 32,
  collisionPadding: 28,
  collisionIterations: 36,
  maxCollisionShift: 60,
  maxCollisionOffset: 180,
};

export const RADIAL_LAYOUT_TUNING_FIELDS: RadialLayoutTuningField[] = [
  { key: "rootChildRadius", label: "Root radius", min: 320, max: 900, step: 10 },
  { key: "branchChildRadius", label: "Branch radius", min: 280, max: 900, step: 10 },
  { key: "outerChildRadius", label: "Outer radius", min: 240, max: 760, step: 10 },
  { key: "minSiblingArc", label: "Sibling arc", min: 160, max: 420, step: 10 },
  { key: "rootChildMinArc", label: "Root min arc", min: 160, max: 420, step: 10 },
  { key: "collisionPadding", label: "Collision pad", min: 0, max: 80, step: 2 },
  { key: "collisionIterations", label: "Collision passes", min: 0, max: 80, step: 1, integer: true },
  { key: "maxCollisionShift", label: "Max shift", min: 10, max: 140, step: 5 },
  { key: "maxCollisionOffset", label: "Max offset", min: 40, max: 420, step: 10 },
];

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

interface RadialLayout {
  angles: Map<string, number>;
  positions: Map<string, { x: number; y: number }>;
}

type FlowNodePosition = NonNullable<Node<FlowNodeData>["sourcePosition"]>;

const HANDLE_TOP = "top" as FlowNodePosition;
const HANDLE_RIGHT = "right" as FlowNodePosition;
const HANDLE_BOTTOM = "bottom" as FlowNodePosition;
const HANDLE_LEFT = "left" as FlowNodePosition;

export async function loadComputerScienceFlow(
  options: Partial<RadialLayoutOptions> = {},
): Promise<ComputerScienceFlow> {
  const input = await readKnowledgeMapFile();
  const layoutOptions = resolveRadialLayoutOptions(options);
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
  const layout = computeRadialLayout(input.root, labels, input.concepts, layoutOptions);

  const nodes = labels.map((label) => {
    const depth = depths.get(label) ?? null;
    const kind = resolveNodeKind(label, input.root, degreeByLabel.outdegree);
    const position = layout.positions.get(label) ?? { x: 0, y: 0 };
    const angle = layout.angles.get(label) ?? 0;

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
      sourcePosition: label === input.root ? HANDLE_RIGHT : handlePositionFromAngle(angle),
      targetPosition: label === input.root ? HANDLE_LEFT : handlePositionFromAngle(angle + Math.PI),
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

export function resolveRadialLayoutOptions(
  options: Partial<RadialLayoutOptions> = {},
): RadialLayoutOptions {
  const resolved = { ...DEFAULT_RADIAL_LAYOUT_OPTIONS };

  for (const field of RADIAL_LAYOUT_TUNING_FIELDS) {
    const value = options[field.key];

    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }

    const clampedValue = clamp(value, field.min, field.max);
    resolved[field.key] = field.integer ? Math.round(clampedValue) : clampedValue;
  }

  return resolved;
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

function computeRadialLayout(
  root: string,
  labels: string[],
  concepts: Record<string, string[]>,
  options: RadialLayoutOptions,
): RadialLayout {
  const positions = new Map<string, { x: number; y: number }>();
  const angles = new Map<string, number>();
  const treeChildren = buildTreeChildren(root, labels, concepts);
  const subtreeSizes = buildSubtreeSizeIndex(root, treeChildren);
  const treeParents = buildTreeParentIndex(treeChildren);
  const treeDepths = buildTreeDepthIndex(root, treeChildren);
  const treeRootBranches = buildTreeRootBranchIndex(root, treeChildren);

  positions.set(root, { x: 0, y: 0 });
  angles.set(root, ROOT_START_ANGLE);
  placeRadialChildren(
    root,
    ROOT_START_ANGLE,
    0,
    treeChildren,
    subtreeSizes,
    options,
    positions,
    angles,
  );

  const disconnectedLabels = labels.filter((label) => !positions.has(label));
  const disconnectedRadius =
    options.rootChildRadius + options.branchChildRadius + options.outerChildRadius;

  for (const [index, label] of disconnectedLabels.entries()) {
    const angle = Math.PI / 2 + (2 * Math.PI * index) / Math.max(disconnectedLabels.length, 1);
    positions.set(label, polarPoint({ x: 0, y: 0 }, disconnectedRadius, angle));
    angles.set(label, angle);
    treeDepths.set(label, 1);
    treeRootBranches.set(label, label);
  }

  resolveLayoutCollisions(
    labels,
    root,
    treeDepths,
    treeRootBranches,
    treeParents,
    options,
    positions,
    angles,
  );

  return { angles, positions };
}

function buildTreeChildren(
  root: string,
  labels: string[],
  concepts: Record<string, string[]>,
): Map<string, string[]> {
  const labelSet = new Set(labels);
  const visited = new Set<string>([root]);
  const queue = [root];
  const treeChildren = new Map<string, string[]>();

  for (const label of labels) {
    treeChildren.set(label, []);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const child of concepts[current] ?? []) {
      if (!labelSet.has(child) || visited.has(child)) {
        continue;
      }

      visited.add(child);
      treeChildren.get(current)?.push(child);
      queue.push(child);
    }
  }

  return treeChildren;
}

function buildSubtreeSizeIndex(
  root: string,
  treeChildren: Map<string, string[]>,
): Map<string, number> {
  const subtreeSizes = new Map<string, number>();

  function visit(label: string): number {
    const size =
      1 +
      (treeChildren.get(label) ?? []).reduce(
        (currentSize, child) => currentSize + visit(child),
        0,
      );

    subtreeSizes.set(label, size);
    return size;
  }

  visit(root);
  return subtreeSizes;
}

function buildTreeParentIndex(treeChildren: Map<string, string[]>): Map<string, string> {
  const treeParents = new Map<string, string>();

  for (const [parent, children] of treeChildren) {
    for (const child of children) {
      treeParents.set(child, parent);
    }
  }

  return treeParents;
}

function buildTreeDepthIndex(
  root: string,
  treeChildren: Map<string, string[]>,
): Map<string, number> {
  const treeDepths = new Map<string, number>([[root, 0]]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const nextDepth = (treeDepths.get(current) ?? 0) + 1;

    for (const child of treeChildren.get(current) ?? []) {
      treeDepths.set(child, nextDepth);
      queue.push(child);
    }
  }

  return treeDepths;
}

function buildTreeRootBranchIndex(
  root: string,
  treeChildren: Map<string, string[]>,
): Map<string, string> {
  const rootBranches = new Map<string, string>([[root, root]]);

  for (const rootChild of treeChildren.get(root) ?? []) {
    const queue = [rootChild];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      rootBranches.set(current, rootChild);
      queue.push(...(treeChildren.get(current) ?? []));
    }
  }

  return rootBranches;
}

function placeRadialChildren(
  parent: string,
  parentAngle: number,
  depth: number,
  treeChildren: Map<string, string[]>,
  subtreeSizes: Map<string, number>,
  options: RadialLayoutOptions,
  positions: Map<string, { x: number; y: number }>,
  angles: Map<string, number>,
): void {
  const children = treeChildren.get(parent) ?? [];
  const parentPosition = positions.get(parent);

  if (!parentPosition || children.length === 0) {
    return;
  }

  const radius = childRadiusForDepth(depth, options);
  const span = depth === 0 ? 2 * Math.PI : descendantSpan(children.length, radius, options);

  if (depth === 0) {
    const sectorSpans = rootSectorSpans(children, subtreeSizes, radius, options);
    let sectorStart = parentAngle - (sectorSpans[0] ?? 0) / 2;

    for (const [index, child] of children.entries()) {
      const sectorSpan = sectorSpans[index] ?? 0;
      const angle = sectorStart + sectorSpan / 2;

      positions.set(child, polarPoint(parentPosition, radius, angle));
      angles.set(child, angle);
      placeRadialChildren(
        child,
        angle,
        depth + 1,
        treeChildren,
        subtreeSizes,
        options,
        positions,
        angles,
      );

      sectorStart += sectorSpan;
    }

    return;
  }

  for (const [index, child] of children.entries()) {
    const angle = childAngle(parentAngle, span, index, children.length);

    positions.set(child, polarPoint(parentPosition, radius, angle));
    angles.set(child, angle);
    placeRadialChildren(
      child,
      angle,
      depth + 1,
      treeChildren,
      subtreeSizes,
      options,
      positions,
      angles,
    );
  }
}

function rootSectorSpans(
  children: string[],
  subtreeSizes: Map<string, number>,
  radius: number,
  options: RadialLayoutOptions,
): number[] {
  if (children.length === 0) {
    return [];
  }

  const totalSpan = 2 * Math.PI;
  const equalSpan = totalSpan / children.length;
  const minSpan = Math.min(options.rootChildMinArc / radius, equalSpan);
  const availableSpan = Math.max(totalSpan - minSpan * children.length, 0);
  const weights = children.map((child) => subtreeSizes.get(child) ?? 1);
  const totalWeight = weights.reduce((currentTotal, weight) => currentTotal + weight, 0);

  if (availableSpan === 0 || totalWeight === 0) {
    return children.map(() => equalSpan);
  }

  return weights.map((weight) => minSpan + (availableSpan * weight) / totalWeight);
}

function childRadiusForDepth(depth: number, options: RadialLayoutOptions): number {
  if (depth === 0) {
    return options.rootChildRadius;
  }

  return depth === 1 ? options.branchChildRadius : options.outerChildRadius;
}

function descendantSpan(
  childCount: number,
  radius: number,
  options: RadialLayoutOptions,
): number {
  if (childCount <= 1) {
    return 0;
  }

  const requiredSpan = ((childCount - 1) * options.minSiblingArc) / radius;
  return clamp(requiredSpan, MIN_DESCENDANT_SPAN, MAX_DESCENDANT_SPAN);
}

function childAngle(
  parentAngle: number,
  span: number,
  index: number,
  siblingCount: number,
): number {
  if (siblingCount === 1) {
    return parentAngle;
  }

  return parentAngle - span / 2 + (span * index) / (siblingCount - 1);
}

function polarPoint(
  origin: { x: number; y: number },
  radius: number,
  angle: number,
): { x: number; y: number } {
  return {
    x: origin.x + Math.cos(angle) * radius,
    y: origin.y + Math.sin(angle) * radius,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveLayoutCollisions(
  labels: string[],
  root: string,
  treeDepths: Map<string, number>,
  treeRootBranches: Map<string, string>,
  treeParents: Map<string, string>,
  options: RadialLayoutOptions,
  positions: Map<string, { x: number; y: number }>,
  angles: Map<string, number>,
): void {
  const labelsByGroup = new Map<string, string[]>();
  const originalPositions = new Map<string, { x: number; y: number }>();

  for (const label of labels) {
    const depth = treeDepths.get(label);
    const position = positions.get(label);

    if (!position) {
      continue;
    }

    originalPositions.set(label, { ...position });

    if (!depth || label === root) {
      continue;
    }

    const rootBranch = depth === 1 ? root : (treeRootBranches.get(label) ?? label);
    const groupKey = `${depth}:${rootBranch}`;
    const groupLabels = labelsByGroup.get(groupKey) ?? [];
    groupLabels.push(label);
    labelsByGroup.set(groupKey, groupLabels);
  }

  for (let iteration = 0; iteration < options.collisionIterations; iteration += 1) {
    let didShift = false;

    for (const groupLabels of labelsByGroup.values()) {
      for (let leftIndex = 0; leftIndex < groupLabels.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < groupLabels.length;
          rightIndex += 1
        ) {
          const leftLabel = groupLabels[leftIndex];
          const rightLabel = groupLabels[rightIndex];
          const leftPosition = positions.get(leftLabel);
          const rightPosition = positions.get(rightLabel);

          if (!leftPosition || !rightPosition) {
            continue;
          }

          const overlapX =
            NODE_WIDTH + options.collisionPadding - Math.abs(leftPosition.x - rightPosition.x);
          const overlapY =
            NODE_HEIGHT + options.collisionPadding - Math.abs(leftPosition.y - rightPosition.y);

          if (overlapX <= 0 || overlapY <= 0) {
            continue;
          }

          pushApartTangentially(leftPosition, rightPosition, overlapX, overlapY, options);
          clampCollisionOffset(leftPosition, originalPositions.get(leftLabel), options);
          clampCollisionOffset(rightPosition, originalPositions.get(rightLabel), options);
          didShift = true;
        }
      }
    }

    if (!didShift) {
      break;
    }
  }

  refreshAnglesFromPositions(root, labels, treeParents, positions, angles);
}

function pushApartTangentially(
  leftPosition: { x: number; y: number },
  rightPosition: { x: number; y: number },
  overlapX: number,
  overlapY: number,
  options: RadialLayoutOptions,
): void {
  const midpointAngle = Math.atan2(
    (leftPosition.y + rightPosition.y) / 2,
    (leftPosition.x + rightPosition.x) / 2,
  );
  const tangent = {
    x: -Math.sin(midpointAngle),
    y: Math.cos(midpointAngle),
  };
  const delta = {
    x: rightPosition.x - leftPosition.x,
    y: rightPosition.y - leftPosition.y,
  };
  const direction = delta.x * tangent.x + delta.y * tangent.y >= 0 ? 1 : -1;
  const shift = clamp(Math.max(overlapX, overlapY) / 2 + 4, 2, options.maxCollisionShift);

  leftPosition.x -= tangent.x * shift * direction;
  leftPosition.y -= tangent.y * shift * direction;
  rightPosition.x += tangent.x * shift * direction;
  rightPosition.y += tangent.y * shift * direction;
}

function clampCollisionOffset(
  position: { x: number; y: number },
  originalPosition?: { x: number; y: number },
  options?: RadialLayoutOptions,
): void {
  if (!originalPosition || !options) {
    return;
  }

  const offsetX = position.x - originalPosition.x;
  const offsetY = position.y - originalPosition.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (distance <= options.maxCollisionOffset) {
    return;
  }

  const scale = options.maxCollisionOffset / distance;
  position.x = originalPosition.x + offsetX * scale;
  position.y = originalPosition.y + offsetY * scale;
}

function refreshAnglesFromPositions(
  root: string,
  labels: string[],
  treeParents: Map<string, string>,
  positions: Map<string, { x: number; y: number }>,
  angles: Map<string, number>,
): void {
  for (const label of labels) {
    if (label === root) {
      angles.set(label, ROOT_START_ANGLE);
      continue;
    }

    const position = positions.get(label);
    const parent = treeParents.get(label);
    const parentPosition = parent ? positions.get(parent) : undefined;

    if (!position) {
      continue;
    }

    if (!parentPosition) {
      angles.set(label, Math.atan2(position.y, position.x));
      continue;
    }

    angles.set(label, Math.atan2(position.y - parentPosition.y, position.x - parentPosition.x));
  }
}

function handlePositionFromAngle(angle: number): FlowNodePosition {
  const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  if (normalized < Math.PI / 4 || normalized >= (7 * Math.PI) / 4) {
    return HANDLE_RIGHT;
  }

  if (normalized < (3 * Math.PI) / 4) {
    return HANDLE_BOTTOM;
  }

  if (normalized < (5 * Math.PI) / 4) {
    return HANDLE_LEFT;
  }

  return HANDLE_TOP;
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
      minHeight: NODE_HEIGHT,
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
      minHeight: NODE_HEIGHT,
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
    minHeight: NODE_HEIGHT,
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
