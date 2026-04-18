from __future__ import annotations

import argparse
import re
from pathlib import Path

from pyvis.network import Network

from km_generator import KMGenerator


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "knowledge-map"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a saved knowledge map as an interactive HTML graph.")
    parser.add_argument("--map", required=True, help="Root concept of the saved knowledge map to render.")
    parser.add_argument("--output", help="Output HTML path. Defaults to knowledge-map-gen/renders/<map>.html.")
    return parser.parse_args()


def collect_nodes(concepts: dict[str, list[str]]) -> set[str]:
    nodes = set(concepts)
    for children in concepts.values():
        nodes.update(children)
    return nodes


def render_html(root: str, concepts: dict[str, list[str]], output_path: Path) -> None:
    nodes = collect_nodes(concepts)
    edge_count = sum(len(children) for children in concepts.values())

    network = Network(
        height="100vh",
        width="100%",
        directed=True,
        bgcolor="#f6f8fb",
        font_color="#17202a",
        cdn_resources="in_line",
    )
    network.heading = f"{root} knowledge map - {len(nodes)} concepts, {edge_count} links"

    for node in sorted(nodes):
        is_root = node == root
        network.add_node(
            node,
            label=node,
            title=node,
            color="#1f6feb" if is_root else "#ffffff",
            borderWidth=3 if is_root else 1,
            font={"color": "#ffffff" if is_root else "#17202a"},
        )

    for parent, children in concepts.items():
        for child in children:
            network.add_edge(parent, child, arrows="to")

    network.set_options(
        """
        {
          "nodes": {
            "shape": "dot",
            "size": 18,
            "borderWidthSelected": 3,
            "font": {
              "size": 18,
              "face": "Arial"
            }
          },
          "edges": {
            "color": {
              "color": "#9aaec3",
              "highlight": "#1f6feb"
            },
            "smooth": {
              "type": "dynamic"
            }
          },
          "physics": {
            "enabled": true,
            "solver": "forceAtlas2Based",
            "forceAtlas2Based": {
              "gravitationalConstant": -70,
              "centralGravity": 0.01,
              "springLength": 150,
              "springConstant": 0.08,
              "avoidOverlap": 0.8
            },
            "stabilization": {
              "iterations": 250
            }
          },
          "interaction": {
            "hover": true,
            "navigationButtons": true,
            "keyboard": true
          }
        }
        """
    )
    network.write_html(str(output_path), open_browser=False, notebook=False)


def main() -> None:
    args = parse_args()
    generator = KMGenerator()
    data = generator.load_map(args.map)
    root = str(data["root"])
    concepts = data.get("concepts", {})
    if not isinstance(concepts, dict):
        raise ValueError("Knowledge map file is missing a valid concepts object.")

    output_path = (
        Path(args.output)
        if args.output
        else Path(__file__).resolve().parent / "renders" / f"{slugify(root)}.html"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    render_html(root, concepts, output_path)
    print(output_path)


if __name__ == "__main__":
    main()
