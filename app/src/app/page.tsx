import styles from "./page.module.css";
import { KnowledgeMapFlow } from "@/components/knowledge-map-flow";
import { loadComputerScienceFlow } from "@/lib/computer-science-flow";

export const dynamic = "force-dynamic";

export default async function Home() {
  let flow = null;
  let loadError = null;

  try {
    flow = await loadComputerScienceFlow();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown error";
  }

  if (!flow) {
    return (
      <main className={styles.errorPage}>
        <section className={styles.errorMessage}>
          <h1>Unable to load graph</h1>
          <p>{loadError}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.graphPage}>
      <KnowledgeMapFlow nodes={flow.nodes} edges={flow.edges} />
    </main>
  );
}
