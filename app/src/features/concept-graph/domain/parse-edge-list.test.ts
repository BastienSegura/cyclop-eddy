import assert from "node:assert/strict";
import test from "node:test";

import { parseEdgeList } from "./parse-edge-list";

test("parseEdgeList ignores malformed lines and normalizes whitespace", () => {
  const raw = [
    "",
    "NoColonLine",
    "Computer-Science:  Algorithms  ",
    "   ~Computer%20Science.~Algorithms:   Graph Theory   ",
    "BadPrefixOnly:",
  ].join("\n");

  const parsed = parseEdgeList(raw);

  assert.deepEqual(parsed, [
    { pathPrefix: "Computer-Science", childLabel: "Algorithms" },
    { pathPrefix: "~Computer%20Science.~Algorithms", childLabel: "Graph Theory" },
  ]);
});

