import assert from "node:assert/strict";
import test from "node:test";

import { loadConceptGraphFromPublicFile } from "./load-graph";

test("loadConceptGraphFromPublicFile falls back to committed fixture data when sync target is missing", async () => {
  const originalFetch = globalThis.fetch;
  const requestedPaths: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestedPaths.push(path);

    if (path === "/data/concept_list_cleaned.txt") {
      return new Response("missing", { status: 404 });
    }

    if (path === "/data/fixtures/demo_concept_list_cleaned.txt") {
      return new Response("~Computer%20Science: Algorithms\n", { status: 200 });
    }

    return new Response("missing", { status: 404 });
  }) as typeof fetch;

  try {
    const graph = await loadConceptGraphFromPublicFile();

    assert.deepEqual(requestedPaths, [
      "/data/concept_list_cleaned.txt",
      "/data/fixtures/demo_concept_list_cleaned.txt",
    ]);
    assert.equal(graph.rootNodeId, "computer science");
    assert.deepEqual(graph.neighborsByNode["computer science"], ["algorithms"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
