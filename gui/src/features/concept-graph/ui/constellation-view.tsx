"use client";

import { useMemo } from "react";

interface NeighborViewModel {
  id: string;
  label: string;
}

interface Point {
  x: number;
  y: number;
}

interface ConstellationViewProps {
  centerLabel: string;
  neighbors: NeighborViewModel[];
  onSelectNeighbor: (id: string) => void;
}

function polarToCartesian(radius: number, angleRad: number): Point {
  return {
    x: 50 + Math.cos(angleRad) * radius,
    y: 50 + Math.sin(angleRad) * radius,
  };
}

export function ConstellationView({
  centerLabel,
  neighbors,
  onSelectNeighbor,
}: ConstellationViewProps) {
  const positionedNeighbors = useMemo(() => {
    const count = Math.max(neighbors.length, 1);
    const radius = 34;

    return neighbors.map((neighbor, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      const point = polarToCartesian(radius, angle);
      return { ...neighbor, point };
    });
  }, [neighbors]);

  return (
    <div className="constellation-shell" aria-label="Concept constellation view">
      <svg className="constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {positionedNeighbors.map((neighbor) => (
          <line
            key={`line-${neighbor.id}`}
            x1="50"
            y1="50"
            x2={neighbor.point.x}
            y2={neighbor.point.y}
            className="constellation-line"
          />
        ))}
      </svg>

      <div className="constellation-center" style={{ left: "50%", top: "50%" }}>
        <span>{centerLabel}</span>
      </div>

      {positionedNeighbors.map((neighbor) => (
        <button
          key={neighbor.id}
          type="button"
          className="constellation-node"
          onClick={() => onSelectNeighbor(neighbor.id)}
          style={{ left: `${neighbor.point.x}%`, top: `${neighbor.point.y}%` }}
        >
          {neighbor.label}
        </button>
      ))}
    </div>
  );
}
