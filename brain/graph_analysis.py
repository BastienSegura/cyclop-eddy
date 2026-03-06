from __future__ import annotations

from collections import defaultdict, deque
from typing import Iterable, Mapping


def build_adjacency_list(edges: list[tuple[str, str]]) -> dict[str, list[str]]:
    adjacency: dict[str, list[str]] = defaultdict(list)
    for parent, child in edges:
        adjacency[parent].append(child)
    return adjacency


def build_adjacency_set(edges: list[tuple[str, str]]) -> dict[str, set[str]]:
    adjacency: dict[str, set[str]] = defaultdict(set)
    for parent, child in edges:
        adjacency[parent].add(child)
        adjacency.setdefault(child, set())
    return adjacency


def build_indegree_map(edges: list[tuple[str, str]]) -> dict[str, int]:
    indegree: dict[str, int] = defaultdict(int)
    for parent, child in edges:
        indegree[child] += 1
        indegree.setdefault(parent, indegree.get(parent, 0))
    return indegree


def find_path(
    adjacency: Mapping[str, Iterable[str]],
    source: str,
    target: str,
) -> list[str] | None:
    if source == target:
        return [source]

    queue: deque[list[str]] = deque([[source]])
    visited: set[str] = {source}

    while queue:
        path = queue.popleft()
        node = path[-1]

        for neighbor in adjacency.get(node, []):
            if neighbor == target:
                return path + [neighbor]
            if neighbor in visited:
                continue
            visited.add(neighbor)
            queue.append(path + [neighbor])

    return None


def canonical_cycle_key(cycle_nodes_closed: list[str]) -> tuple[str, ...]:
    body = cycle_nodes_closed[:-1]
    if not body:
        return tuple()
    rotations = [tuple(body[index:] + body[:index]) for index in range(len(body))]
    return min(rotations)


def analyze_cycle_edges(
    unique_edges: list[tuple[str, str]],
    labels_by_key: dict[str, str],
    max_examples: int,
) -> tuple[int, list[str]]:
    adjacency = build_adjacency_list(unique_edges)
    cycle_edge_count = 0
    seen_cycles: set[tuple[str, ...]] = set()
    examples: list[str] = []

    for parent, child in unique_edges:
        path_child_to_parent = find_path(adjacency, child, parent)
        if not path_child_to_parent:
            continue

        cycle_edge_count += 1
        cycle_nodes_closed = [parent] + path_child_to_parent
        cycle_key = canonical_cycle_key(cycle_nodes_closed)
        if cycle_key in seen_cycles:
            continue

        seen_cycles.add(cycle_key)
        if len(examples) < max_examples:
            examples.append(" -> ".join(labels_by_key.get(node, node) for node in cycle_nodes_closed))

    return cycle_edge_count, examples


def compute_depths(
    nodes: set[str],
    adjacency: Mapping[str, Iterable[str]],
    indegree: Mapping[str, int],
    labels_by_key: Mapping[str, str],
) -> dict[str, int]:
    sort_key = lambda node: (labels_by_key.get(node, node).casefold(), labels_by_key.get(node, node))
    depths: dict[str, int] = {}
    queue: deque[str] = deque()

    roots = sorted(
        [node for node in nodes if indegree.get(node, 0) == 0],
        key=sort_key,
    )
    for root in roots:
        depths[root] = 0
        queue.append(root)

    while queue:
        node = queue.popleft()
        child_depth = depths[node] + 1
        for child in sorted(adjacency.get(node, []), key=sort_key):
            current_depth = depths.get(child)
            if current_depth is None or child_depth < current_depth:
                depths[child] = child_depth
                queue.append(child)

    for seed in sorted([node for node in nodes if node not in depths], key=sort_key):
        depths[seed] = 0
        queue = deque([seed])
        while queue:
            node = queue.popleft()
            child_depth = depths[node] + 1
            for child in sorted(adjacency.get(node, []), key=sort_key):
                current_depth = depths.get(child)
                if current_depth is None or child_depth < current_depth:
                    depths[child] = child_depth
                    queue.append(child)

    return depths


def reachable_descendant_count(
    source: str,
    adjacency: Mapping[str, Iterable[str]],
) -> int:
    seen: set[str] = {source}
    queue: deque[str] = deque([source])
    count = 0

    while queue:
        node = queue.popleft()
        for child in adjacency.get(node, []):
            if child in seen:
                continue
            seen.add(child)
            queue.append(child)
            count += 1

    return count
