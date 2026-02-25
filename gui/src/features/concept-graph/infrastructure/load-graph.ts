import { buildConceptGraph } from "../application/build-concept-graph";
import { parseEdgeList } from "../domain/parse-edge-list";
import type { ConceptGraph } from "../domain/types";

export async function loadConceptGraphFromPublicFile(
  filePath: string = "/data/concept_list_cleaned.txt",
): Promise<ConceptGraph> {
  const response = await fetch(filePath, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to load concept data from ${filePath} (${response.status})`);
  }

  const raw = await response.text();
  const parsed = parseEdgeList(raw);
  return buildConceptGraph(parsed);
}
