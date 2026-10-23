"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";

interface NativeArrowAnimationPanelProps {
  excalidrawApi: any;
}

export function NativeArrowAnimationPanel({
  excalidrawApi,
}: NativeArrowAnimationPanelProps) {
  // Target label DOM element inside Excalidraw's .buttonList
  const [btnTarget, setBtnTarget] = useState<HTMLLabelElement | null>(null);

  // Selected arrow or default flow state
  const [isAnimated, setIsAnimated] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState<"forward" | "reverse">("forward");

  // Floating popover state (menu suspenso)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const labelRef = useRef<HTMLLabelElement | null>(null);

  // Position the floating popover relative to the 4th button in sidebar
  const updatePopoverPosition = useCallback(() => {
    const btn = labelRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const popoverWidth = 230;
    const popoverHeight = 220;

    // 14px gap allows the caret indicator to point directly at the button
    let left = rect.right + 12;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, rect.left - popoverWidth - 12);
    }

    // Align popover so its caret (at top: 14px + 5px center = 19px) points directly to the vertical center of the 32px button
    let top = Math.round(rect.top + rect.height / 2 - 19);
    if (top + popoverHeight > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - popoverHeight - 10);
    }
    if (top < 10) {
      top = 10;
    }

    setPopoverPos({ top, left });
  }, []);

  // Update flow direction
  const handleUpdateDirection = (dir: "forward" | "reverse") => {
    setDirection(dir);
    if (!excalidrawApi) return;

    try {
      const elements = excalidrawApi.getSceneElements();
      const appState = excalidrawApi.getAppState();
      const selectedIds = Object.keys(appState?.selectedElementIds || {}).filter(
        (id) => appState.selectedElementIds[id]
      );

      if (selectedIds.length > 0) {
        const updated = elements.map((el: any) => {
          if (selectedIds.includes(el.id) && el.type === "arrow") {
            return {
              ...el,
              customData: {
                ...(el.customData || {}),
                flow: {
                  ...(el.customData?.flow || {}),
                  animated: true,
                  direction: dir,
                },
              },
              version: (el.version || 1) + 1,
              versionNonce: Math.floor(Math.random() * 100000),
            };
          }
          return el;
        });

        excalidrawApi.updateScene({ elements: updated });
      }
    } catch (err) {
      console.error("Update direction error:", err);
    }
  };

  // Update flow speed
  const handleUpdateSpeed = (spd: number) => {
    setSpeed(spd);
    if (!excalidrawApi) return;

    try {
      const elements = excalidrawApi.getSceneElements();
      const appState = excalidrawApi.getAppState();
      const selectedIds = Object.keys(appState?.selectedElementIds || {}).filter(
        (id) => appState.selectedElementIds[id]
      );

      if (selectedIds.length > 0) {
        const updated = elements.map((el: any) => {
          if (selectedIds.includes(el.id) && el.type === "arrow") {
            return {
              ...el,
              customData: {
                ...(el.customData || {}),
                flow: {
                  ...(el.customData?.flow || {}),
                  animated: true,
                  speed: spd,
                },
              },
              version: (el.version || 1) + 1,
              versionNonce: Math.floor(Math.random() * 100000),
            };
          }
          return el;
        });

        excalidrawApi.updateScene({ elements: updated });
      }
    } catch (err) {
      console.error("Update speed error:", err);
    }
  };

  // Toggle animation WITHOUT touching arrow geometry (roundness, elbowed, etc.)
  const handleToggleAnimation = useCallback((forceValue?: boolean) => {
    setIsAnimated((prev) => {
      const willAnimate = typeof forceValue === "boolean" ? forceValue : !prev;

      if (excalidrawApi) {
        try {
          const elements = excalidrawApi.getSceneElements();
          const appState = excalidrawApi.getAppState();
          const selectedIds = Object.keys(appState?.selectedElementIds || {}).filter(
            (id) => appState.selectedElementIds[id]
          );

          if (selectedIds.length > 0) {
            const updated = elements.map((el: any) => {
              if (selectedIds.includes(el.id) && el.type === "arrow") {
                return {
                  ...el,
                  // CRITICAL: NEVER TOUCH el.roundness OR el.elbowed!
                  customData: {
                    ...(el.customData || {}),
                    flow: {
                      ...(el.customData?.flow || {}),
                      animated: willAnimate,
                      speed: el.customData?.flow?.speed || speed,
                      direction: el.customData?.flow?.direction || direction,
                    },
                  },
                  version: (el.version || 1) + 1,
                  versionNonce: Math.floor(Math.random() * 100000),
                };
              }
              return el;
            });

            excalidrawApi.updateScene({ elements: updated });
          }
        } catch (err) {
          console.error("Toggle animation error:", err);
        }
      }

      return willAnimate;
    });
  }, [excalidrawApi, speed, direction]);

  // Button click in Arrow Type section: toggle floating popover
  const handleButtonClick = useCallback(() => {
    setIsPopoverOpen((prev) => {
      if (prev) {
        return false;
      } else {
        if (!isAnimated) {
          handleToggleAnimation(true);
        }
        updatePopoverPosition();
        return true;
      }
    });
  }, [isAnimated, handleToggleAnimation, updatePopoverPosition]);

  useEffect(() => {
    if (!excalidrawApi) return;

    let isSubscribed = true;

    const updateDOM = () => {
      if (!isSubscribed) return;

      try {
        const appState = excalidrawApi.getAppState();
        const elements = excalidrawApi.getSceneElements();

        if (!appState) {
          cleanupDOM();
          return;
        }

        // 1. Locate the Arrow Type fieldset in Excalidraw's sidebar
        const panelColumn = document.querySelector(".excalidraw .panelColumn");
        if (!panelColumn) {
          cleanupDOM();
          return;
        }

        const fieldsets = Array.from(panelColumn.querySelectorAll("fieldset"));
        const arrowTypeFieldset = fieldsets.find((fs) => {
          const text = (fs.textContent || "").toLowerCase();
          return (
            text.includes("arrow type") ||
            text.includes("tipo de seta") ||
            text.includes("tipo de flecha") ||
            fs.querySelector('[data-testid="elbow-arrow"]') ||
            fs.querySelector('[data-testid="sharp-arrow"]')
          );
        });

        if (!arrowTypeFieldset) {
          cleanupDOM();
          return;
        }

        const buttonList = arrowTypeFieldset.querySelector(".buttonList") as HTMLElement | null;
        if (!buttonList) {
          cleanupDOM();
          return;
        }

        // 2. Identify selected arrow(s) if any
        const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
          (id) => appState.selectedElementIds[id]
        );

        const selectedArrows = Array.isArray(elements)
          ? elements.filter(
              (el: any) => selectedIds.includes(el.id) && el.type === "arrow" && !el.isDeleted
            )
          : [];

        let currentAnimated = false;
        let currentSpeed = 1;
        let currentDirection: "forward" | "reverse" = "forward";

        if (selectedArrows.length > 0) {
          const currentArrow = selectedArrows[0];
          currentAnimated = currentArrow.customData?.flow?.animated === true;
          currentSpeed = currentArrow.customData?.flow?.speed || 1;
          currentDirection = currentArrow.customData?.flow?.direction || "forward";
          setIsAnimated(currentAnimated);
          setSpeed(currentSpeed);
          setDirection(currentDirection);
        }

        // 3. Mount the 4th button directly as a native <label> inside .buttonList
        if (!labelRef.current) {
          const label = document.createElement("label");
          label.id = "excalispace-arrow-type-animation-btn";
          label.style.cursor = "pointer";
          labelRef.current = label;
        }

        const btnLabel = labelRef.current;
        btnLabel.className = currentAnimated ? "active" : "";
        btnLabel.title = "Animated Flow (Animation Options)";
        btnLabel.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleButtonClick();
        };

        if (btnLabel.parentNode !== buttonList) {
          buttonList.appendChild(btnLabel);
        }

        setBtnTarget(btnLabel);
      } catch {
        // Ignore inspection errors in loop
      }
    };

    const cleanupDOM = () => {
      if (labelRef.current && labelRef.current.parentNode) {
        labelRef.current.parentNode.removeChild(labelRef.current);
        labelRef.current = null;
      }
      setBtnTarget(null);
      // Only close popover if the whole Excalidraw canvas is unmounted
      if (!document.querySelector(".excalidraw")) {
        setIsPopoverOpen(false);
      }
    };

    const interval = setInterval(updateDOM, 80);
    updateDOM();

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      cleanupDOM();
    };
  }, [excalidrawApi, handleButtonClick]);

  // Handle outside clicks: Keep menu open unless clicking completely outside or pressing Escape
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath();
      const isInsidePopover = path.some(
        (el) => (el as HTMLElement)?.id === "excalispace-flow-popover"
      );
      const isInsideButton = path.some(
        (el) => (el as HTMLElement)?.id === "excalispace-arrow-type-animation-btn"
      );

      // Dismiss ONLY if the click occurred truly outside both the popover and trigger button
      if (!isInsidePopover && !isInsideButton) {
        setIsPopoverOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPopoverOpen(false);
      }
    };

    const handleReposition = () => updatePopoverPosition();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isPopoverOpen, updatePopoverPosition]);

  const portalContainer =
    (typeof document !== "undefined" ? document.querySelector(".excalidraw") : null) ||
    (typeof document !== "undefined" ? document.body : null);

  return (
    <>
      {/* 1. 4th button rendered directly inside the <label> child of .buttonList */}
      {btnTarget &&
        ReactDOM.createPortal(
          <>
            <input
              type="radio"
              name="arrowtypes"
              style={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
              checked={isAnimated}
              readOnly
            />
            {/* Native SVG icon matching Excalidraw's other arrow type buttons */}
            <svg
              aria-hidden="true"
              focusable="false"
              role="img"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="19" x2="19" y2="5" strokeDasharray="2.5 3" />
              <polyline points="11 5 19 5 19 13" />
            </svg>
          </>,
          btnTarget
        )}

      {/* 2. Floating Popover (Menu Suspenso) styled to mirror Excalidraw ColorPicker */}
      {isPopoverOpen &&
        portalContainer &&
        ReactDOM.createPortal(
          <div
            id="excalispace-flow-popover"
            className="Island properties-popover"
            data-prevent-outside-click="true"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              zIndex: 99999,
              backgroundColor: "var(--island-bg-color, #232329)",
              border: "1px solid var(--dialog-border-color, #34343d)",
              borderRadius: "var(--border-radius-lg, 8px)",
              boxShadow:
                "var(--shadow-island, 0px 7px 14px rgba(0, 0, 0, 0.25), 0px 3px 6px rgba(0, 0, 0, 0.15))",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
              minWidth: "220px",
              color: "var(--text-primary-color, #ffffff)",
              fontFamily: "var(--ui-font, sans-serif)",
              userSelect: "none",
            }}
          >
            {/* Caret triangle indicator pointing directly left to the 4th button */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "-6px",
                width: "10px",
                height: "10px",
                backgroundColor: "var(--island-bg-color, #232329)",
                borderLeft: "1px solid var(--dialog-border-color, #34343d)",
                borderBottom: "1px solid var(--dialog-border-color, #34343d)",
                transform: "rotate(45deg)",
                zIndex: 1,
              }}
            />

            {/* Header: Title + Toggle button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid var(--dialog-border-color, #34343d)",
              }}
            >
              <div
                className="color-picker__heading"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  color: "var(--text-primary-color)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="19" x2="19" y2="5" strokeDasharray="3 3" />
                  <polyline points="11 5 19 5 19 13" />
                </svg>
                <span>Animated Flow</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleAnimation()}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.25rem 0.625rem",
                  borderRadius: "var(--border-radius-md, 6px)",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isAnimated
                    ? "var(--color-surface-primary-container)"
                    : "var(--button-gray-2)",
                  color: isAnimated
                    ? "var(--color-on-primary-container)"
                    : "var(--icon-fill-color)",
                  boxShadow: isAnimated ? "0 0 0 1px var(--color-primary-darkest, #6965db)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {isAnimated ? "Active" : "Inactive"}
              </button>
            </div>

            {/* Direction Selection */}
            <div>
              <div
                className="color-picker__heading"
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-primary-color)",
                  opacity: 0.7,
                  marginBottom: "0.375rem",
                }}
              >
                Direction
              </div>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <button
                  type="button"
                  title="Source to Destination (Forward)"
                  onClick={() => handleUpdateDirection("forward")}
                  style={{
                    flex: 1,
                    height: "2rem",
                    borderRadius: "var(--border-radius-md, 6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    cursor: "pointer",
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: direction === "forward" ? 600 : 500,
                    backgroundColor:
                      direction === "forward"
                        ? "var(--color-surface-primary-container)"
                        : "var(--button-gray-2)",
                    color:
                      direction === "forward"
                        ? "var(--color-on-primary-container)"
                        : "var(--icon-fill-color)",
                    boxShadow: direction === "forward" ? "0 0 0 1px var(--color-primary-darkest, #6965db)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                  <span>Forward</span>
                </button>
                <button
                  type="button"
                  title="Destination to Source (Reverse)"
                  onClick={() => handleUpdateDirection("reverse")}
                  style={{
                    flex: 1,
                    height: "2rem",
                    borderRadius: "var(--border-radius-md, 6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    cursor: "pointer",
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: direction === "reverse" ? 600 : 500,
                    backgroundColor:
                      direction === "reverse"
                        ? "var(--color-surface-primary-container)"
                        : "var(--button-gray-2)",
                    color:
                      direction === "reverse"
                        ? "var(--color-on-primary-container)"
                        : "var(--icon-fill-color)",
                    boxShadow: direction === "reverse" ? "0 0 0 1px var(--color-primary-darkest, #6965db)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Reverse</span>
                </button>
              </div>
            </div>

            {/* Speed Selection */}
            <div>
              <div
                className="color-picker__heading"
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-primary-color)",
                  opacity: 0.7,
                  marginBottom: "0.375rem",
                }}
              >
                Speed
              </div>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {[
                  { label: "0.5x", val: 0.5 },
                  { label: "1.0x", val: 1 },
                  { label: "2.0x", val: 2 },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => handleUpdateSpeed(s.val)}
                    style={{
                      flex: 1,
                      height: "1.875rem",
                      borderRadius: "var(--border-radius-md, 6px)",
                      fontSize: "0.75rem",
                      fontWeight: speed === s.val ? 600 : 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      border: "none",
                      backgroundColor:
                        speed === s.val
                          ? "var(--color-surface-primary-container)"
                          : "var(--button-gray-2)",
                      color:
                        speed === s.val
                          ? "var(--color-on-primary-container)"
                          : "var(--icon-fill-color)",
                      boxShadow: speed === s.val ? "0 0 0 1px var(--color-primary-darkest, #6965db)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          portalContainer
        )}
    </>
  );
}
