import { SessionStatus } from "@/features/auth/ui/session-status";

interface GraphExplorerHeaderProps {
  totalNodes: number;
  totalEdges: number;
  leafNodeCount: number;
}

export function GraphExplorerHeader({
  totalNodes,
  totalEdges,
  leafNodeCount,
}: GraphExplorerHeaderProps) {
  return (
    <header className="top-bar">
      <div>
        <h1>Cyclop Eddy</h1>
        <p>Prototype: smooth constellation travel. Click any visible node to move through the universe.</p>
      </div>
      <div className="meta-stats">
        <span>{totalNodes} nodes</span>
        <span>{totalEdges} edges</span>
        <span>{leafNodeCount} dead ends</span>
      </div>
      <SessionStatus />
    </header>
  );
}
