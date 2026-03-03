import assert from "node:assert/strict";
import test from "node:test";

import { buildConceptGraph } from "./build-concept-graph";
import type { ParsedConceptLine } from "../domain/types";

test("buildConceptGraph preserves hyphenated identity for encoded segments", () => {
  const parsed: ParsedConceptLine[] = [
    {
      pathPrefix: "~Computer%20Science",
      childLabel: "Human-Computer Interaction",
    },
    {
      pathPrefix: "~Computer%20Science.~Human-Computer%20Interaction",
      childLabel: "Error Prevention Techniques",
    },
  ];

  const graph = buildConceptGraph(parsed);

  assert.equal(graph.rootNodeId, "computer science");
  assert.ok(graph.nodes["human-computer interaction"]);
  assert.equal(graph.nodes["human computer interaction"], undefined);
  assert.deepEqual(graph.neighborsByNode["human-computer interaction"], [
    "error prevention techniques",
  ]);
});

test("buildConceptGraph supports legacy hyphen-as-space path prefixes", () => {
  const parsed: ParsedConceptLine[] = [
    {
      pathPrefix: "Computer-Science.Legacy-Parent",
      childLabel: "Legacy Child",
    },
  ];

  const graph = buildConceptGraph(parsed);

  assert.ok(graph.nodes["legacy parent"]);
  assert.ok(graph.nodes["legacy child"]);
  assert.deepEqual(graph.neighborsByNode["legacy parent"], ["legacy child"]);
});

