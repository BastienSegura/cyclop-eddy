# Graph Layout Options

The current graph uses a simple radial tree placement in
`app/src/lib/computer-science-flow.ts`: root children are placed on one full
circle, descendants fan out around their parent, and all edges are rendered as
straight lines. That creates three visible flaws:

- a large empty gap between `Computer Science` and its first-level concepts
- local overlaps between neighboring branches, such as `SQL` and `Physical Data Model`
- cluttered edges because non-tree links cross the circular layout

## Option 1: Tune The Existing Radial Layout

Keep the current radial approach, but improve spacing with better radius and
angle rules.

Technical guidance:

- Lower `ROOT_CHILD_RADIUS` to reduce the empty center.
- Increase `BRANCH_CHILD_RADIUS`, `OUTER_CHILD_RADIUS`, or `MIN_SIBLING_ARC` to
  create more room for children.
- Replace the current equal root split with subtree-weighted sectors. Count each
  branch's descendants, then assign wider angular ranges to branches with more
  nodes.
- Add a post-layout collision pass over nodes at similar depths. When two node
  bounding boxes overlap, push them apart tangentially along the ring and repeat
  until stable.

Best when:

- the circular visual identity is worth keeping
- the goal is a small implementation step rather than a layout rewrite

Risk:

- tuning constants can move clutter around rather than solving it globally

## Option 2: Use A Layered DAG Layout

Replace the radial placement with a top-down or left-to-right graph layout using
ELK, Dagre, or another layered layout engine.

Technical guidance:

- Convert `concepts` into ELK nodes and edges inside
  `loadComputerScienceFlow`.
- Set a layered algorithm, for example `elk.algorithm = layered`.
- Tune spacing with options such as node-node spacing, layer spacing, edge-node
  spacing, and direction.
- Map ELK's computed `x` and `y` values back into React Flow node positions.
- Keep React Flow as the renderer; only replace the position calculation.

Best when:

- readability matters more than preserving the circle
- parent-child hierarchy should be visually obvious
- edge crossings need to drop substantially

Risk:

- the map may become wide or tall, so fit-view and viewport defaults need care

## Option 3: Use A Force Layout With Collision

Use a force simulation so nodes repel each other, edges pull related nodes
together, and labels reserve real space.

Technical guidance:

- Build a simulation with forces for link distance, charge, center, and
  collision.
- Use node dimensions in the collision radius, not just a point radius.
- Pin the root near the center or top-left depending on the preferred shape.
- Seed initial positions from the current radial layout so the simulation starts
  from a useful structure.
- Run the simulation server-side or precompute positions to avoid client-side
  jitter on first render.

Best when:

- the graph has many cross-links and should feel organic
- avoiding node overlap is more important than strict hierarchy

Risk:

- force layouts can be less deterministic unless the simulation is seeded and
  stopped after a fixed number of ticks

## Option 4: Hybrid Tree Layout Plus Secondary Edges

Separate the visual tree from the full relationship graph. Use a clean tree
layout for primary parent-child structure, then render cross-links with a
lighter treatment.

Technical guidance:

- Build a spanning tree using the current breadth-first `buildTreeChildren`
  behavior.
- Mark tree edges and non-tree edges separately in `buildFlowEdges`.
- Lay out only the tree edges with a radial or layered tree algorithm.
- Render non-tree edges as muted, curved, bundled, hidden-by-default, or visible
  only on hover or selection.
- Add edge metadata so the UI can toggle "tree only" and "all relations" modes
  later.

Best when:

- the full graph is too dense to show all at once
- users need a readable overview first, with details available on demand

Risk:

- hiding or muting links can make the graph feel less complete unless the UI
  clearly signals that more relationships exist

## Option 5: Cluster First, Then Layout Clusters

Group related concepts into clusters before laying out individual nodes. For the
current map, first-level concepts can act as initial clusters.

Technical guidance:

- Use root children as cluster anchors, or compute communities from the edge
  graph later.
- Lay out clusters around the root with generous spacing.
- Inside each cluster, use a local tree, grid, or small force layout.
- Keep cluster bounding boxes apart before placing inner nodes.
- Route edges between clusters separately from edges inside clusters.

Best when:

- the graph should remain an overview of subject areas
- local overlaps are concentrated inside dense branches

Risk:

- cross-cluster edges still need special handling, or they will recreate clutter
  between clusters

## Option 6: Add Focus And Progressive Disclosure

Reduce visual density by showing less graph at once. The full graph can remain
available, but the default view starts from a focused neighborhood.

Technical guidance:

- Add a selected node state and compute visible nodes within a depth radius.
- Start with the root plus first-level concepts, then expand a branch on click.
- Hide or fade edges whose source or target is outside the active neighborhood.
- Use React Flow viewport controls to fit the selected neighborhood after
  expansion.
- Preserve the full data model, but filter `nodes` and `edges` before passing
  them to React Flow.

Best when:

- the graph is meant for exploration rather than one static poster view
- users need to inspect details without visual overload

Risk:

- it changes the product behavior, not just the layout algorithm

## Practical Recommendation

Start with Option 4 plus a small part of Option 1. Keep the current radial
layout, reserve larger angular sectors by subtree size, and visually separate
tree edges from secondary edges. That should address the immediate overlap and
edge clutter without throwing away the existing implementation.

If the graph still feels hard to read after that, move to Option 2 and use a
layered DAG layout as the default.
