interface GraphExplorerToolbarProps {
  canGoBack: boolean;
  canGoToRoot: boolean;
  hasDiscoveredAllNodes: boolean;
  firstParent: string | null;
  rootNodeId: string | null;
  zoomSliderValue: number;
  isGraphFullscreen: boolean;
  isFullscreenSupported: boolean;
  onFocusNode: (nodeId: string) => void;
  onRevealAllNodes: () => void;
  onSetZoomFromSlider: (value: number) => void;
  onToggleGraphFullscreen: () => void | Promise<void>;
}

export function GraphExplorerToolbar({
  canGoBack,
  canGoToRoot,
  hasDiscoveredAllNodes,
  firstParent,
  rootNodeId,
  zoomSliderValue,
  isGraphFullscreen,
  isFullscreenSupported,
  onFocusNode,
  onRevealAllNodes,
  onSetZoomFromSlider,
  onToggleGraphFullscreen,
}: GraphExplorerToolbarProps) {
  return (
    <div className="panel-actions">
      <div className="navigation-controls">
        <button
          type="button"
          className="ghost-button"
          disabled={!canGoBack}
          onClick={() => {
            if (firstParent) {
              onFocusNode(firstParent);
            }
          }}
        >
          Go to parent
        </button>
        <button
          type="button"
          className="ghost-button"
          disabled={!canGoToRoot}
          onClick={() => {
            if (rootNodeId) {
              onFocusNode(rootNodeId);
            }
          }}
        >
          Go to root
        </button>
        <button
          type="button"
          className="ghost-button"
          disabled={hasDiscoveredAllNodes}
          onClick={onRevealAllNodes}
        >
          Discover all graph
        </button>
      </div>

      <div className="camera-controls">
        <div className="zoom-indicator" aria-label="Zoom level control">
          <label htmlFor="zoom-level-slider" className="zoom-indicator-text">Zoom Level</label>
          <input
            id="zoom-level-slider"
            className="zoom-level-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={zoomSliderValue}
            onChange={(event) => onSetZoomFromSlider(Number(event.currentTarget.value))}
          />
        </div>
        <button
          type="button"
          className="fullscreen-toggle-button"
          aria-label={isGraphFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isGraphFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          disabled={!isFullscreenSupported}
          onClick={onToggleGraphFullscreen}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {isGraphFullscreen ? (
              <path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" />
            ) : (
              <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
