import assert from "node:assert/strict";
import test from "node:test";

import type { ConceptGraph } from "../domain/types";

import {
  buildAdjustedVisiblePositions,
  buildVisibleLabelSet,
} from "./constellation-label-layout";

const graph: ConceptGraph = {
  nodes: {
    selected: { id: "selected", label: "Selected", pathPrefix: "" },
    alpha: { id: "alpha", label: "Alpha", pathPrefix: "~Selected" },
    beta: { id: "beta", label: "Beta", pathPrefix: "~Selected" },
  },
  neighborsByNode: {
    selected: ["alpha", "beta"],
    alpha: [],
    beta: [],
  },
  reverseNeighborsByNode: {
    selected: [],
    alpha: ["selected"],
    beta: ["selected"],
  },
  rootNodeId: "selected",
};

test("buildAdjustedVisiblePositions keeps the selected node fixed while separating crowded neighbors", () => {
  const adjusted = buildAdjustedVisiblePositions(
    ["selected", "alpha", "beta"],
    {
      selected: { x: 0, y: 0 },
      alpha: { x: 5, y: 0 },
      beta: { x: 10, y: 0 },
    },
    "selected",
    new Map([
      ["alpha", 1],
      ["beta", 1],
    ]),
    { x: 0, y: 0, zoom: 1 },
  );

  assert.deepEqual(adjusted.selected, { x: 0, y: 0 });
  assert.notDeepEqual(adjusted.alpha, { x: 5, y: 0 });
});

test("buildVisibleLabelSet keeps the selected label and filters overlapping siblings deterministically", () => {
  const visibleLabelIds = buildVisibleLabelSet(
    graph,
    ["selected", "alpha", "beta"],
    {
      selected: { x: -220, y: 0 },
      alpha: { x: 0, y: 0 },
      beta: { x: 4, y: 0 },
    },
    "selected",
    new Map([
      ["alpha", 1],
      ["beta", 1],
    ]),
    { x: 0, y: 0, zoom: 1 },
  );

  assert.deepEqual(Array.from(visibleLabelIds).sort(), ["alpha", "selected"]);
});
