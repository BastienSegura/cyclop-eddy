import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Edge, Node } from "@xyflow/react";

const NODE_WIDTH = 188;
const NODE_MIN_HEIGHT = 56;
const NODE_TEXT_CHARS_PER_LINE = 24;
const NODE_VERTICAL_PADDING = 28;
const NODE_LINE_HEIGHT = 16;
const FORCE_ATLAS2_GRAVITATIONAL_CONSTANT = -70;
const FORCE_CENTRAL_GRAVITY = 0.01;
const FORCE_SPRING_LENGTH = 150;
const FORCE_SPRING_CONSTANT = 0.08;
const FORCE_AVOID_OVERLAP = 0.8;
const FORCE_STABILIZATION_TICKS = 250;
const FORCE_FINAL_COLLISION_TICKS = 80;
const FORCE_VELOCITY_DECAY = 0.58;
const FORCE_CHARGE_STRENGTH = Math.abs(FORCE_ATLAS2_GRAVITATIONAL_CONSTANT) * 120;
const CIRCULAR_COLLISION_PADDING = 22 * FORCE_AVOID_OVERLAP;
const RECTANGULAR_COLLISION_PADDING = 18;
const ROOT_CHILD_RADIUS = 340;
const BRANCH_CHILD_RADIUS = 250;
const OUTER_CHILD_RADIUS = 210;
const MIN_CHILD_SPREAD = Math.PI / 5;
const COMPUTER_SCIENCE_MAP_PATH = path.resolve(
  process.cwd(),
  "..",
  "knowledge-map-gen",
  "maps",
  "computer-science.json",
);

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

interface ForceLayout {
  positions: Map<string, { x: number; y: number }>;
  sourcePositions: Map<string, FlowNodePosition>;
  targetPositions: Map<string, FlowNodePosition>;
}

type FlowNodePosition = NonNullable<Node<FlowNodeData>["sourcePosition"]>;

const HANDLE_RIGHT = "right" as FlowNodePosition;
const HANDLE_LEFT = "left" as FlowNodePosition;
const HANDLE_TOP = "top" as FlowNodePosition;
const HANDLE_BOTTOM = "bottom" as FlowNodePosition;

interface NodeDimensions {
  width: number;
  height: number;
  radius: number;
}

interface SimulationNode extends NodeDimensions {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  fixed: boolean;
}

interface SimulationLink {
  source: SimulationNode;
  target: SimulationNode;
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
  const layout = computeForceLayout(input.root, labels, input.concepts, degreeByLabel);

  const nodes = labels.map((label) => {
    const depth = depths.get(label) ?? null;
    const kind = resolveNodeKind(label, input.root, degreeByLabel.outdegree);
    const position = layout.positions.get(label) ?? { x: 0, y: 0 };
    const dimensions = estimateNodeDimensions(label);

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
      sourcePosition: layout.sourcePositions.get(label) ?? HANDLE_RIGHT,
      targetPosition: layout.targetPositions.get(label) ?? HANDLE_LEFT,
      style: buildNodeStyle(kind, dimensions),
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
        type: "default",
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

function computeForceLayout(
  root: string,
  labels: string[],
  concepts: Record<string, string[]>,
  degreeByLabel: ReturnType<typeof buildDegreeIndex>,
): ForceLayout {
  const labelSet = new Set(labels);
  const seedPositions = computeRadialSeedPositions(root, labels, concepts, labelSet);
  const simulationNodes = labels.map((label) =>
    createSimulationNode(label, root, seedPositions, degreeByLabel),
  );
  const nodeById = new Map(simulationNodes.map((node) => [node.id, node]));
  const simulationLinks = buildSimulationLinks(concepts, nodeById);

  pinRootNode(nodeById.get(root));

  for (let tick = 0; tick < FORCE_STABILIZATION_TICKS; tick += 1) {
    const alpha = Math.max(0.03, 1 - tick / FORCE_STABILIZATION_TICKS);

    applyLinkForce(simulationLinks, alpha);
    applyChargeForce(simulationNodes, alpha);
    applyCenterForce(simulationNodes, alpha);
    integrateSimulationNodes(simulationNodes);
    resolveCircularCollisions(simulationNodes, alpha);
    resolveRectangularCollisions(simulationNodes, FORCE_AVOID_OVERLAP * 0.5);
    pinRootNode(nodeById.get(root));
  }

  for (let tick = 0; tick < FORCE_FINAL_COLLISION_TICKS; tick += 1) {
    resolveCircularCollisions(simulationNodes, FORCE_AVOID_OVERLAP * 0.35);
    resolveRectangularCollisions(simulationNodes, FORCE_AVOID_OVERLAP * 0.65);
    pinRootNode(nodeById.get(root));
  }

  const positions = new Map<string, { x: number; y: number }>();
  const sourcePositions = new Map<string, FlowNodePosition>();
  const targetPositions = new Map<string, FlowNodePosition>();

  for (const node of simulationNodes) {
    const position = { x: node.x, y: node.y };
    const sourcePosition = resolveSourceHandle(position);

    positions.set(node.id, position);
    sourcePositions.set(node.id, sourcePosition);
    targetPositions.set(node.id, oppositeHandle(sourcePosition));
  }

  return {
    positions,
    sourcePositions,
    targetPositions,
  };
}

function computeRadialSeedPositions(
  root: string,
  labels: string[],
  concepts: Record<string, string[]>,
  labelSet: Set<string>,
): Map<string, { x: number; y: number }> {
  const treeChildren = buildTreeChildren(root, concepts, labelSet);
  const positions = new Map<string, { x: number; y: number }>([[root, { x: 0, y: 0 }]]);
  const rootChildren = treeChildren.get(root) ?? [];
  const rootSectorWidth = rootChildren.length > 0 ? (Math.PI * 2) / rootChildren.length : 0;

  rootChildren.forEach((child, index) => {
    const angle = -Math.PI / 2 + index * rootSectorWidth;

    placeRadialBranch(
      child,
      positions.get(root) ?? { x: 0, y: 0 },
      angle,
      rootSectorWidth,
      1,
      treeChildren,
      positions,
    );
  });

  labels.forEach((label, index) => {
    if (positions.has(label)) {
      return;
    }

    const angle = deterministicAngle(label);
    const radius = ROOT_CHILD_RADIUS + OUTER_CHILD_RADIUS * (1 + (index % 4));

    positions.set(label, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  return positions;
}

function buildTreeChildren(
  root: string,
  concepts: Record<string, string[]>,
  labelSet: Set<string>,
): Map<string, string[]> {
  const treeChildren = new Map<string, string[]>();
  const visited = new Set<string>([root]);
  const queue = [root];

  for (const label of labelSet) {
    treeChildren.set(label, []);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const target of concepts[current] ?? []) {
      if (!labelSet.has(target) || visited.has(target)) {
        continue;
      }

      treeChildren.get(current)?.push(target);
      visited.add(target);
      queue.push(target);
    }
  }

  return treeChildren;
}

function placeRadialBranch(
  label: string,
  parentPosition: { x: number; y: number },
  angle: number,
  sectorWidth: number,
  depth: number,
  treeChildren: Map<string, string[]>,
  positions: Map<string, { x: number; y: number }>,
) {
  const radius = radialDistanceForDepth(depth);
  const position = {
    x: parentPosition.x + Math.cos(angle) * radius,
    y: parentPosition.y + Math.sin(angle) * radius,
  };
  const children = treeChildren.get(label) ?? [];

  positions.set(label, position);

  if (children.length === 0) {
    return;
  }

  const spread = Math.min(
    Math.max(children.length * 0.3, MIN_CHILD_SPREAD),
    Math.max(sectorWidth * 0.88, MIN_CHILD_SPREAD),
  );
  const step = children.length > 1 ? spread / (children.length - 1) : 0;
  const startAngle = angle - spread / 2;

  children.forEach((child, index) => {
    placeRadialBranch(
      child,
      position,
      children.length > 1 ? startAngle + step * index : angle,
      spread,
      depth + 1,
      treeChildren,
      positions,
    );
  });
}

function radialDistanceForDepth(depth: number): number {
  if (depth === 1) {
    return ROOT_CHILD_RADIUS;
  }

  if (depth === 2) {
    return BRANCH_CHILD_RADIUS;
  }

  return OUTER_CHILD_RADIUS;
}

function createSimulationNode(
  label: string,
  root: string,
  seedPositions: Map<string, { x: number; y: number }>,
  degreeByLabel: ReturnType<typeof buildDegreeIndex>,
): SimulationNode {
  const seedPosition = seedPositions.get(label) ?? { x: 0, y: 0 };
  const dimensions = estimateNodeDimensions(label);
  const degree =
    (degreeByLabel.indegree.get(label) ?? 0) + (degreeByLabel.outdegree.get(label) ?? 0);

  return {
    id: label,
    ...dimensions,
    x: seedPosition.x,
    y: seedPosition.y,
    vx: 0,
    vy: 0,
    mass: 1 + Math.sqrt(degree),
    fixed: label === root,
  };
}

function buildSimulationLinks(
  concepts: Record<string, string[]>,
  nodeById: Map<string, SimulationNode>,
): SimulationLink[] {
  const links: SimulationLink[] = [];

  for (const [sourceId, targetIds] of Object.entries(concepts)) {
    const source = nodeById.get(sourceId);

    if (!source) {
      continue;
    }

    for (const targetId of targetIds) {
      const target = nodeById.get(targetId);

      if (!target) {
        continue;
      }

      links.push({ source, target });
    }
  }

  return links;
}

function applyLinkForce(links: SimulationLink[], alpha: number) {
  for (const link of links) {
    const delta = resolveDelta(link.source, link.target);
    const targetDistance =
      FORCE_SPRING_LENGTH + (link.source.radius + link.target.radius) * 0.26;
    const force = (delta.distance - targetDistance) * FORCE_SPRING_CONSTANT * alpha;
    const forceX = delta.unitX * force;
    const forceY = delta.unitY * force;

    applyPairVelocity(link.source, link.target, forceX, forceY);
  }
}

function applyChargeForce(nodes: SimulationNode[], alpha: number) {
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const delta = resolveDelta(left, right);
      const minDistance = left.radius + right.radius;
      const distanceSquared = Math.max(
        delta.distance * delta.distance,
        minDistance * minDistance * 0.35,
      );
      const force =
        (FORCE_CHARGE_STRENGTH * left.mass * right.mass * alpha) / distanceSquared;

      applyPairVelocity(left, right, -delta.unitX * force, -delta.unitY * force);
    }
  }
}

function applyCenterForce(nodes: SimulationNode[], alpha: number) {
  for (const node of nodes) {
    if (node.fixed) {
      continue;
    }

    node.vx -= node.x * FORCE_CENTRAL_GRAVITY * alpha;
    node.vy -= node.y * FORCE_CENTRAL_GRAVITY * alpha;
  }
}

function integrateSimulationNodes(nodes: SimulationNode[]) {
  for (const node of nodes) {
    if (node.fixed) {
      node.vx = 0;
      node.vy = 0;
      continue;
    }

    node.vx *= FORCE_VELOCITY_DECAY;
    node.vy *= FORCE_VELOCITY_DECAY;
    node.x += node.vx;
    node.y += node.vy;
  }
}

function resolveCircularCollisions(nodes: SimulationNode[], strength: number) {
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const delta = resolveDelta(left, right);
      const minDistance = left.radius + right.radius + CIRCULAR_COLLISION_PADDING;

      if (delta.distance >= minDistance) {
        continue;
      }

      const push = (minDistance - delta.distance) * strength;

      separatePair(left, right, delta.unitX * push, delta.unitY * push);
    }
  }
}

function resolveRectangularCollisions(nodes: SimulationNode[], strength: number) {
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const deltaX = right.x - left.x;
      const deltaY = right.y - left.y;
      const minX = (left.width + right.width) / 2 + RECTANGULAR_COLLISION_PADDING;
      const minY = (left.height + right.height) / 2 + RECTANGULAR_COLLISION_PADDING;
      const overlapX = minX - Math.abs(deltaX);
      const overlapY = minY - Math.abs(deltaY);

      if (overlapX <= 0 || overlapY <= 0) {
        continue;
      }

      if (overlapX < overlapY) {
        const direction = deltaX === 0 ? deterministicSign(left.id, right.id) : Math.sign(deltaX);

        separatePair(left, right, direction * overlapX * strength, 0);
      } else {
        const direction = deltaY === 0 ? deterministicSign(left.id, right.id) : Math.sign(deltaY);

        separatePair(left, right, 0, direction * overlapY * strength);
      }
    }
  }
}

function resolveDelta(left: SimulationNode, right: SimulationNode) {
  let deltaX = right.x - left.x;
  let deltaY = right.y - left.y;
  let distance = Math.hypot(deltaX, deltaY);

  if (distance < 0.001) {
    const angle = deterministicAngle(`${left.id}:${right.id}`);

    deltaX = Math.cos(angle);
    deltaY = Math.sin(angle);
    distance = 1;
  }

  return {
    distance,
    unitX: deltaX / distance,
    unitY: deltaY / distance,
  };
}

function applyPairVelocity(
  left: SimulationNode,
  right: SimulationNode,
  forceX: number,
  forceY: number,
) {
  const { leftShare, rightShare } = resolvePairShares(left, right);

  if (!left.fixed) {
    left.vx += forceX * leftShare;
    left.vy += forceY * leftShare;
  }

  if (!right.fixed) {
    right.vx -= forceX * rightShare;
    right.vy -= forceY * rightShare;
  }
}

function separatePair(
  left: SimulationNode,
  right: SimulationNode,
  pushX: number,
  pushY: number,
) {
  const { leftShare, rightShare } = resolvePairShares(left, right);

  if (!left.fixed) {
    left.x -= pushX * leftShare;
    left.y -= pushY * leftShare;
  }

  if (!right.fixed) {
    right.x += pushX * rightShare;
    right.y += pushY * rightShare;
  }
}

function resolvePairShares(left: SimulationNode, right: SimulationNode) {
  if (left.fixed && right.fixed) {
    return { leftShare: 0, rightShare: 0 };
  }

  if (left.fixed) {
    return { leftShare: 0, rightShare: 1 };
  }

  if (right.fixed) {
    return { leftShare: 1, rightShare: 0 };
  }

  return { leftShare: 0.5, rightShare: 0.5 };
}

function pinRootNode(rootNode: SimulationNode | undefined) {
  if (!rootNode) {
    return;
  }

  rootNode.x = 0;
  rootNode.y = 0;
  rootNode.vx = 0;
  rootNode.vy = 0;
}

function estimateNodeDimensions(label: string): NodeDimensions {
  const lineCount = Math.max(1, Math.ceil(label.length / NODE_TEXT_CHARS_PER_LINE));
  const height = Math.max(NODE_MIN_HEIGHT, NODE_VERTICAL_PADDING + lineCount * NODE_LINE_HEIGHT);

  return {
    width: NODE_WIDTH,
    height,
    radius: Math.hypot(NODE_WIDTH / 2, height / 2) + CIRCULAR_COLLISION_PADDING,
  };
}

function resolveSourceHandle(position: { x: number; y: number }): FlowNodePosition {
  if (Math.abs(position.x) >= Math.abs(position.y)) {
    return position.x >= 0 ? HANDLE_RIGHT : HANDLE_LEFT;
  }

  return position.y >= 0 ? HANDLE_BOTTOM : HANDLE_TOP;
}

function oppositeHandle(position: FlowNodePosition): FlowNodePosition {
  if (position === HANDLE_LEFT) {
    return HANDLE_RIGHT;
  }

  if (position === HANDLE_RIGHT) {
    return HANDLE_LEFT;
  }

  if (position === HANDLE_TOP) {
    return HANDLE_BOTTOM;
  }

  return HANDLE_TOP;
}

function deterministicAngle(value: string): number {
  return (deterministicHash(value) / 0xffffffff) * Math.PI * 2;
}

function deterministicSign(left: string, right: string): 1 | -1 {
  return deterministicHash(`${left}:${right}`) % 2 === 0 ? 1 : -1;
}

function deterministicHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
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

function buildNodeStyle(
  kind: FlowNodeData["kind"],
  dimensions: NodeDimensions,
): Node<FlowNodeData>["style"] {
  const baseStyle: Node<FlowNodeData>["style"] = {
    width: dimensions.width,
    height: dimensions.height,
    minHeight: dimensions.height,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    lineHeight: 1.25,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
  };

  if (kind === "root") {
    return {
      ...baseStyle,
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
      ...baseStyle,
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
    ...baseStyle,
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
