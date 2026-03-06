import assert from "node:assert/strict";
import test from "node:test";

import type { ConceptGraph } from "../domain/types";

import {
  buildUndirectedNeighbors,
  collectComponentEdges,
  getConnectedComponents,
} from "./graph-layout-components";

test("getConnectedComponents keeps the root component first and orders remaining components deterministically", () => {
  const graph: ConceptGraph = {
    nodes: {
      root: { id: "root", label: "Computer Science", pathPrefix: "" },
      algorithms: { id: "algorithms", label: "Algorithms", pathPrefix: "~Computer%20Science" },
      databases: { id: "databases", label: "Databases", pathPrefix: "~Computer%20Science" },
      compilers: { id: "compilers", label: "Compilers", pathPrefix: "~Programming%20Languages" },
      languages: { id: "languages", label: "Programming Languages", pathPrefix: "" },
      logic: { id: "logic", label: "Logic", pathPrefix: "~Programming%20Languages" },
      ai: { id: "ai", label: "Artificial Intelligence", pathPrefix: "" },
    },
    neighborsByNode: {
      root: ["algorithms"],
      algorithms: [],
      databases: [],
      compilers: ["logic"],
      languages: ["compilers"],
      logic: [],
      ai: [],
    },
    reverseNeighborsByNode: {
      root: [],
      algorithms: ["root"],
      databases: [],
      compilers: ["languages"],
      languages: [],
      logic: ["compilers"],
      ai: [],
    },
    rootNodeId: "root",
  };

  const undirected = buildUndirectedNeighbors(graph);
  const components = getConnectedComponents(graph, undirected);

  assert.deepEqual(components[0], ["root", "algorithms"]);
  assert.deepEqual(components[1], ["compilers", "logic", "languages"]);
  assert.deepEqual(components[2], ["ai"]);
});

test("collectComponentEdges keeps only unique in-component undirected edges", () => {
  const undirected = {
    root: ["algorithms", "databases"],
    algorithms: ["root"],
    databases: ["root", "ai"],
    ai: ["databases"],
  };

  assert.deepEqual(
    collectComponentEdges(["root", "algorithms", "databases"], undirected),
    [
      ["algorithms", "root"],
      ["databases", "root"],
    ],
  );
});
