from __future__ import annotations

import argparse
import html
import json
import re
from collections import defaultdict, deque
from pathlib import Path

from km_generator import KMGenerator


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "knowledge-map"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a saved knowledge map as an HTML graph.")
    parser.add_argument("--map", required=True, help="Root concept of the saved knowledge map to render.")
    parser.add_argument("--output", help="Output HTML path. Defaults to knowledge-map-gen/renders/<map>.html.")
    return parser.parse_args()


def collect_nodes(concepts: dict[str, list[str]]) -> set[str]:
    nodes = set(concepts)
    for children in concepts.values():
        nodes.update(children)
    return nodes


def compute_levels(root: str, concepts: dict[str, list[str]], nodes: set[str]) -> dict[str, int]:
    levels = {root: 0}
    queue = deque([root])

    while queue:
        node = queue.popleft()
        for child in concepts.get(node, []):
            if child in levels:
                continue
            levels[child] = levels[node] + 1
            queue.append(child)

    fallback_level = max(levels.values(), default=0) + 1
    for node in sorted(nodes):
        levels.setdefault(node, fallback_level)

    return levels


def compute_positions(levels: dict[str, int]) -> tuple[dict[str, tuple[int, int]], int, int]:
    by_level: dict[int, list[str]] = defaultdict(list)
    for node, level in levels.items():
        by_level[level].append(node)

    x_gap = 320
    y_gap = 90
    margin = 80
    positions: dict[str, tuple[int, int]] = {}
    max_level_size = max((len(nodes) for nodes in by_level.values()), default=1)

    for level, nodes in by_level.items():
        nodes.sort()
        level_height = (len(nodes) - 1) * y_gap
        start_y = margin + ((max_level_size - 1) * y_gap - level_height) // 2
        for index, node in enumerate(nodes):
            positions[node] = (margin + level * x_gap, start_y + index * y_gap)

    width = margin * 2 + max(by_level.keys(), default=0) * x_gap + 220
    height = margin * 2 + max(1, max_level_size - 1) * y_gap
    return positions, width, height


def render_html(root: str, concepts: dict[str, list[str]]) -> str:
    nodes = collect_nodes(concepts)
    levels = compute_levels(root, concepts, nodes)
    positions, width, height = compute_positions(levels)
    edge_count = sum(len(children) for children in concepts.values())

    edge_markup = []
    for parent, children in concepts.items():
        if parent not in positions:
            continue
        x1, y1 = positions[parent]
        for child in children:
            if child not in positions:
                continue
            x2, y2 = positions[child]
            edge_markup.append(
                f'<line x1="{x1 + 70}" y1="{y1}" x2="{x2 - 70}" y2="{y2}" />'
            )

    node_markup = []
    for node, (x, y) in positions.items():
        is_root = node == root
        radius = 30 if is_root else 22
        label = html.escape(node)
        node_markup.append(
            f'<g class="node {"root" if is_root else ""}">'
            f'<circle cx="{x}" cy="{y}" r="{radius}" />'
            f'<text x="{x}" y="{y + radius + 18}">{label}</text>'
            "</g>"
        )

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{html.escape(root)} knowledge map</title>
  <style>
    body {{
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f6f8fb;
      color: #17202a;
    }}
    header {{
      padding: 16px 24px;
      border-bottom: 1px solid #d9e1ec;
      background: #ffffff;
    }}
    h1 {{
      margin: 0 0 6px;
      font-size: 22px;
    }}
    p {{
      margin: 0;
      color: #52616f;
    }}
    .viewport {{
      width: 100vw;
      height: calc(100vh - 78px);
      overflow: auto;
    }}
    svg {{
      min-width: 100%;
      min-height: 100%;
    }}
    line {{
      stroke: #9aaec3;
      stroke-width: 1.5;
    }}
    circle {{
      fill: #ffffff;
      stroke: #1f6feb;
      stroke-width: 2;
    }}
    .root circle {{
      fill: #1f6feb;
      stroke: #124a9c;
    }}
    text {{
      font-size: 13px;
      text-anchor: middle;
      fill: #17202a;
    }}
  </style>
</head>
<body>
  <header>
    <h1>{html.escape(root)}</h1>
    <p>{len(nodes)} concepts, {edge_count} links</p>
  </header>
  <div class="viewport">
    <svg width="{width}" height="{height}" viewBox="0 0 {width} {height}">
      <g class="edges">
        {"".join(edge_markup)}
      </g>
      <g class="nodes">
        {"".join(node_markup)}
      </g>
    </svg>
  </div>
</body>
</html>
"""


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
    output_path.write_text(render_html(root, concepts), encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
