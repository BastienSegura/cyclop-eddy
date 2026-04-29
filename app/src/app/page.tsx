import Link from "next/link";

import styles from "./page.module.css";
import { KnowledgeMapFlow } from "@/components/knowledge-map-flow";
import {
  RADIAL_LAYOUT_TUNING_FIELDS,
  loadComputerScienceFlow,
  resolveRadialLayoutOptions,
} from "@/lib/computer-science-flow";
import type { RadialLayoutOptions } from "@/lib/computer-science-flow";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

interface HomeProps {
  searchParams: Promise<SearchParams>;
}

export default async function Home({ searchParams }: HomeProps) {
  let flow = null;
  let loadError = null;
  const layoutOptions = layoutOptionsFromSearchParams(await searchParams);

  try {
    flow = await loadComputerScienceFlow(layoutOptions);
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
      <form className={styles.tuningPanel} method="get" autoComplete="off">
        <div className={styles.tuningHeader}>
          <h2>Layout tuning</h2>
          <Link href="/" className={styles.resetLink}>
            Reset
          </Link>
        </div>
        <div className={styles.tuningGrid}>
          {RADIAL_LAYOUT_TUNING_FIELDS.map((field) => (
            <label className={styles.tuningField} key={field.key}>
              <span>{field.label}</span>
              <input
                name={field.key}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                defaultValue={layoutOptions[field.key]}
              />
            </label>
          ))}
        </div>
        <button className={styles.applyButton} type="submit">
          Apply
        </button>
      </form>
    </main>
  );
}

function layoutOptionsFromSearchParams(searchParams: SearchParams): RadialLayoutOptions {
  const options: Partial<RadialLayoutOptions> = {};

  for (const field of RADIAL_LAYOUT_TUNING_FIELDS) {
    const rawValue = searchParams[field.key];
    const value = Array.isArray(rawValue) ? rawValue.at(-1) : rawValue;

    if (!value) {
      continue;
    }

    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      options[field.key] = parsedValue;
    }
  }

  return resolveRadialLayoutOptions(options);
}
