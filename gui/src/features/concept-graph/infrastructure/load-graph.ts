import { buildConceptGraph } from "../application/build-concept-graph";
import { parseEdgeList } from "../domain/parse-edge-list";
import type { ConceptGraph } from "../domain/types";

const DEFAULT_RUNTIME_GRAPH_PATH = "/data/concept_list_cleaned.txt";
const DEFAULT_FIXTURE_GRAPH_PATH = "/data/fixtures/demo_concept_list_cleaned.txt";

async function fetchConceptGraphText(filePath: string): Promise<string | null> {
  const response = await fetch(filePath, { cache: "no-store" });

  if (response.ok) {
    return response.text();
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error(`Unable to load concept data from ${filePath} (${response.status})`);
}

export async function loadConceptGraphFromPublicFile(
  filePath: string = DEFAULT_RUNTIME_GRAPH_PATH,
  fallbackFilePath: string = DEFAULT_FIXTURE_GRAPH_PATH,
): Promise<ConceptGraph> {
  const primaryRaw = await fetchConceptGraphText(filePath);
  if (primaryRaw !== null) {
    const parsed = parseEdgeList(primaryRaw);
    return buildConceptGraph(parsed);
  }

  const fallbackRaw = await fetchConceptGraphText(fallbackFilePath);
  if (fallbackRaw !== null) {
    const parsed = parseEdgeList(fallbackRaw);
    return buildConceptGraph(parsed);
  }

  throw new Error(
    `Unable to load concept data from the derived GUI file ${filePath} `
    + `or the committed fixture ${fallbackFilePath}.`
  );
}
