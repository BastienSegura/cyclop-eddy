import type { ConceptNode } from "../domain/types";

interface GraphExplorerSidebarProps {
  currentNode: ConceptNode;
  promptTemplate: string;
  copyFeedback: string;
  connectedNeighbors: ConceptNode[];
  onCopyPrompt: () => void | Promise<void>;
  onFocusNode: (nodeId: string) => void;
}

export function GraphExplorerSidebar({
  currentNode,
  promptTemplate,
  copyFeedback,
  connectedNeighbors,
  onCopyPrompt,
  onFocusNode,
}: GraphExplorerSidebarProps) {
  return (
    <aside className="details-panel">
      <h2>{currentNode.label}</h2>
      <p className="path-prefix">Path: {currentNode.pathPrefix}</p>

      <div className="prompt-box">
        <h3>Learning prompt template</h3>
        <pre>{promptTemplate}</pre>
        <button type="button" className="primary-button" onClick={onCopyPrompt}>
          Copy prompt
        </button>
        {copyFeedback ? <p className="copy-feedback">{copyFeedback}</p> : null}
      </div>

      <div className="neighbors-list">
        <h3>Connected concepts</h3>
        {connectedNeighbors.length === 0 ? (
          <p>No direct links from this node.</p>
        ) : (
          <ul>
            {connectedNeighbors.slice(0, 20).map((neighbor) => (
              <li key={`list-${neighbor.id}`}>
                <button type="button" onClick={() => onFocusNode(neighbor.id)}>
                  {neighbor.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
