"use client";

import { useEffect, useRef, useState } from "react";

export function useGraphFullscreen() {
  const panelRef = useRef<HTMLElement | null>(null);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);

  useEffect(() => {
    setIsFullscreenSupported(document.fullscreenEnabled);

    const syncFullscreenState = () => {
      setIsGraphFullscreen(document.fullscreenElement === panelRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  async function toggleGraphFullscreen() {
    if (!isFullscreenSupported || !panelRef.current) {
      return;
    }

    try {
      if (document.fullscreenElement === panelRef.current) {
        await document.exitFullscreen();
        return;
      }

      await panelRef.current.requestFullscreen();
    } catch {
      // Ignore fullscreen errors (for example browser restrictions or canceled requests).
    }
  }

  return {
    panelRef,
    isGraphFullscreen,
    isFullscreenSupported,
    toggleGraphFullscreen,
  };
}
