"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface FlowAnimationOverlayProps {
  excalidrawApi: any;
  isActive?: boolean;
}

export function FlowAnimationOverlay({
  excalidrawApi,
  isActive = true,
}: FlowAnimationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Mount canvas into Excalidraw's internal canvas wrapper so UI layers (context menus, toolbars) sit naturally on top
  useEffect(() => {
    let isSubscribed = true;

    const findCanvasWrapper = () => {
      if (!isSubscribed) return;
      const wrapper = document.querySelector(".excalidraw__canvas-wrapper") as HTMLElement | null;
      if (wrapper && wrapper !== portalTarget) {
        setPortalTarget(wrapper);
      }
    };

    const interval = setInterval(findCanvasWrapper, 100);
    findCanvasWrapper();

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [portalTarget]);

  // Animation render loop attached to the live portaled canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    // High-DPI sizing matching Excalidraw's canvas viewport dimensions
    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;

      // In Excalidraw, .excalidraw__canvas-wrapper might report clientWidth 0.
      // Therefore, inspect the canvas clientWidth, static canvas, or appState:
      let w = canvas.clientWidth;
      let h = canvas.clientHeight;

      if (!w || !h) {
        const sc = canvas.parentElement?.querySelector(".excalidraw__canvas.static") as HTMLCanvasElement | null;
        if (sc && sc.width && sc.height) {
          w = sc.width / dpr;
          h = sc.height / dpr;
        }
      }

      if (!w || !h) {
        if (excalidrawApi) {
          const state = excalidrawApi.getAppState();
          if (state && state.width && state.height) {
            w = state.width;
            h = state.height;
          }
        }
      }

      if (w > 0 && h > 0) {
        const targetWidth = Math.round(w * dpr);
        const targetHeight = Math.round(h * dpr);
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener("resize", handleResize);

    const render = () => {
      if (!isRunning) return;

      handleResize();

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      if (width <= 0 || height <= 0) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (isActive && excalidrawApi) {
        try {
          const appState = excalidrawApi.getAppState();
          const elements = excalidrawApi.getSceneElements();

          if (appState && Array.isArray(elements)) {
            const zoom = appState.zoom?.value || 1;
            const scrollX = appState.scrollX || 0;
            const scrollY = appState.scrollY || 0;
            const time = performance.now() / 1000;

            // Resolve canvas background color for seamless masking
            const isDark = appState.theme === "dark";
            let canvasBg = appState.viewBackgroundColor || (isDark ? "#121212" : "#ffffff");
            if (canvasBg === "transparent") {
              canvasBg = isDark ? "#121212" : "#ffffff";
            }

            try {
              const excalidrawEl = document.querySelector(".excalidraw");
              if (excalidrawEl) {
                const comp = window.getComputedStyle(excalidrawEl);
                if (
                  comp.backgroundColor &&
                  comp.backgroundColor !== "rgba(0, 0, 0, 0)" &&
                  comp.backgroundColor !== "transparent"
                ) {
                  canvasBg = comp.backgroundColor;
                }
              }
            } catch {
              // Ignore DOM read error
            }

            // Find and render all animated arrows
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i];
              if (
                el.type !== "arrow" ||
                el.isDeleted ||
                !Array.isArray(el.points) ||
                el.points.length < 2
              ) {
                continue;
              }

              // Check if arrow has animation enabled
              const isAnimated = el.customData?.flow?.animated === true;
              if (!isAnimated) continue;

              // Transform arrow vertices into canvas coordinates
              const pts: { x: number; y: number }[] = [];
              for (let p = 0; p < el.points.length; p++) {
                pts.push({
                  x: (el.x + el.points[p][0] + scrollX) * zoom,
                  y: (el.y + el.points[p][1] + scrollY) * zoom,
                });
              }

              const n = pts.length;
              if (n < 2) continue;

              // Calculate angles at ends so arrowheads remain intact
              const firstPt = pts[0];
              const secondPt = pts[1];
              const startAngle = Math.atan2(secondPt.y - firstPt.y, secondPt.x - firstPt.x);
              const firstSegDist = Math.hypot(secondPt.x - firstPt.x, secondPt.y - firstPt.y);

              const lastPt = pts[n - 1];
              const prevPt = pts[n - 2];
              const endAngle = Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x);
              const lastSegDist = Math.hypot(lastPt.x - prevPt.x, lastPt.y - prevPt.y);

              const headInset = (el.strokeWidth * 5 + 8) * zoom;
              const startInset = Math.min(headInset, firstSegDist * 0.45);
              const endInset = Math.min(headInset, lastSegDist * 0.45);

              // Determine shaft endpoints so arrowheads are preserved intact
              const shaftStart = el.startArrowhead
                ? {
                    x: firstPt.x + Math.cos(startAngle) * startInset,
                    y: firstPt.y + Math.sin(startAngle) * startInset,
                  }
                : firstPt;

              const shaftEnd = el.endArrowhead
                ? {
                    x: lastPt.x - Math.cos(endAngle) * endInset,
                    y: lastPt.y - Math.sin(endAngle) * endInset,
                  }
                : lastPt;

              // Helper to trace the shaft geometry
              const traceShaft = (context: CanvasRenderingContext2D) => {
                context.beginPath();
                context.moveTo(shaftStart.x, shaftStart.y);

                if (n === 2) {
                  context.lineTo(shaftEnd.x, shaftEnd.y);
                } else if (n === 3 && el.roundness) {
                  // Quadratic curve for 3-point curved arrows
                  context.quadraticCurveTo(pts[1].x, pts[1].y, shaftEnd.x, shaftEnd.y);
                } else {
                  // Polyline for elbow or multi-segment arrows
                  for (let s = 1; s < n - 1; s++) {
                    context.lineTo(pts[s].x, pts[s].y);
                  }
                  context.lineTo(shaftEnd.x, shaftEnd.y);
                }
              };

              // Step 1: Mask the static Rough.js stroke with matching background color
              ctx.save();
              ctx.strokeStyle = canvasBg;
              ctx.lineWidth = Math.max(1, (el.strokeWidth + 0.6) * zoom);
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.setLineDash([]);
              traceShaft(ctx);
              ctx.stroke();
              ctx.restore();

              // Step 2: Draw marching dashes of the arrow itself
              ctx.save();
              const strokeColor = el.strokeColor || (isDark ? "#ffffff" : "#1e1e1e");
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = Math.max(1, el.strokeWidth * zoom);
              ctx.lineCap = "round";
              ctx.lineJoin = "round";

              const isDotted = el.strokeStyle === "dotted";
              const dash = isDotted ? 3 * zoom : 8 * zoom;
              const gap = isDotted ? 5 * zoom : 6 * zoom;
              const period = dash + gap;

              const speedMultiplier = el.customData?.flow?.speed || 1;
              const speedPxPerSec = 36 * speedMultiplier * zoom;
              const isReverse = el.customData?.flow?.direction === "reverse";

              // Continuous marching dash offset
              const offset = (time * speedPxPerSec) % period;

              ctx.setLineDash([dash, gap]);
              ctx.lineDashOffset = isReverse ? offset : -offset;

              traceShaft(ctx);
              ctx.stroke();
              ctx.restore();
            }

            // Clear region of right-click context menus if open
            const contextMenu = document.querySelector(".context-menu, .excalidraw-contextMenuContainer > *");
            if (contextMenu) {
              const cmRect = contextMenu.getBoundingClientRect();
              const cRect = canvas.getBoundingClientRect();
              ctx.clearRect(
                cmRect.left - cRect.left,
                cmRect.top - cRect.top,
                cmRect.width,
                cmRect.height
              );
            }
          }
        } catch {
          // Ignore render loop exceptions
        }
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [excalidrawApi, isActive, portalTarget]);

  const canvasElement = (
    <canvas
      ref={canvasRef}
      className="excalispace-flow-animation-canvas"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1, // Below layer-ui and context menu
      }}
    />
  );

  // If internal canvas wrapper is found, portal inside it so it sits behind UI layers
  if (portalTarget) {
    return ReactDOM.createPortal(canvasElement, portalTarget);
  }

  // Fallback while wrapper is being resolved
  return canvasElement;
}
