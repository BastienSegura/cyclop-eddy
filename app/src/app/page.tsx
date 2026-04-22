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
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>
            <span>React Flow</span>
            <span>+</span>
            <span>ELK Layered</span>
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Computer Science Map</h1>
            <p className={styles.subtitle}>
              The new homepage is wired to read the local JSON map directly from the repository.
            </p>
          </div>
        </section>

        <section className={styles.errorCard}>
          <h2>Unable to load the source map</h2>
          <p>{loadError}</p>
          <code>knowledge-map-gen/maps/computer-science.json</code>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          <span>React Flow</span>
          <span>+</span>
          <span>ELK Layered</span>
        </div>

        <div className={styles.titleRow}>
          <h1 className={styles.title}>Computer Science Map</h1>
          <p className={styles.subtitle}>
            Fresh Next.js prototype using <code>@xyflow/react</code> for rendering and{" "}
            <code>elkjs</code> for layout. Source data comes directly from{" "}
            <code>{flow.sourcePath}</code>.
          </p>
        </div>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Nodes</span>
          <strong className={styles.statValue}>{flow.stats.nodeCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Edges</span>
          <strong className={styles.statValue}>{flow.stats.edgeCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Leaves</span>
          <strong className={styles.statValue}>{flow.stats.leafCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Max Depth</span>
          <strong className={styles.statValue}>{flow.stats.maxDepth}</strong>
        </article>
      </section>

      <section className={styles.canvasShell}>
        <div className={styles.canvasCard}>
          <KnowledgeMapFlow
            root={flow.root}
            nodes={flow.nodes}
            edges={flow.edges}
            branchCount={flow.stats.branchCount}
          />
        </div>
      </section>
    </main>
  );
}
