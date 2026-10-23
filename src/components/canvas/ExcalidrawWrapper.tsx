"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { CanvasHeader, SaveStatus } from "./CanvasHeader";
import { FlowAnimationOverlay } from "./FlowAnimationOverlay";
import { NativeArrowAnimationPanel } from "./NativeArrowAnimationPanel";
import { DatabaseERDModal } from "./DatabaseERDModal";

// Dynamically import Excalidraw to bypass SSR
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading canvas workspace...</p>
      </div>
    ),
  }
);

interface ExcalidrawWrapperProps {
  board: {
    id: string;
    title: string;
    elements: any;
    appState: any;
    files: any;
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
    folder?: {
      id: string;
      name: string;
    } | null;
  };
  currentUserRole?: string;
  canEdit?: boolean;
  isPublicAccess?: boolean;
}

// Compute lightweight content signature to detect actual canvas edits
function getSceneSignature(elements: readonly any[] | undefined, appState: any, files?: any): string {
  if (!elements || !Array.isArray(elements)) return "";
  let elementsPart = "";
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;
    elementsPart += `${el.id}:${el.version ?? 0}:${el.isDeleted ? 1 : 0};`;
  }
  const bg = appState?.viewBackgroundColor || "#121212";
  const theme = appState?.theme || "dark";
  const fileCount = files && typeof files === "object" ? Object.keys(files).length : 0;
  return `${elementsPart}|${bg}|${theme}|${fileCount}`;
}

// Strict whitelist for saving appState to PostgreSQL JSONB
// NEVER persist collaborators (which is an Excalidraw runtime Map) or transient UI pointers
function cleanAppStateForStorage(appState: any) {
  if (!appState || typeof appState !== "object") return {};
  return {
    viewBackgroundColor: appState.viewBackgroundColor || "#121212",
    gridSize: appState.gridSize ?? null,
    theme: appState.theme || "dark",
    zoom: appState.zoom || { value: 1 },
    scrollX: appState.scrollX ?? 0,
    scrollY: appState.scrollY ?? 0,
  };
}

export default function ExcalidrawWrapper({
  board,
  currentUserRole = "EDITOR",
  canEdit = true,
  isPublicAccess = false,
}: ExcalidrawWrapperProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const [showERDModal, setShowERDModal] = useState(false);

  // Parse and sanitize initial data once
  const initialData = useMemo(() => {
    let elements: any[] = [];
    if (Array.isArray(board.elements)) {
      elements = board.elements;
    } else if (typeof board.elements === "string") {
      try {
        elements = JSON.parse(board.elements || "[]");
      } catch {
        elements = [];
      }
    }

    let parsedAppState: any = {};
    if (board.appState && typeof board.appState === "object") {
      parsedAppState = { ...board.appState };
    } else if (typeof board.appState === "string") {
      try {
        parsedAppState = JSON.parse(board.appState || "{}");
      } catch {
        parsedAppState = {};
      }
    }

    // CRITICAL: Ensure collaborators property is NEVER passed as a plain object
    // Excalidraw requires collaborators to be a runtime Map or undefined
    delete parsedAppState.collaborators;
    delete parsedAppState.selectedElementIds;
    delete parsedAppState.selectedGroupIds;
    delete parsedAppState.editingLinearElement;
    delete parsedAppState.cursorButton;
    delete parsedAppState.draggingElement;
    delete parsedAppState.resizingElement;
    delete parsedAppState.selectionElement;
    delete parsedAppState.multiElement;

    const appState = {
      viewBackgroundColor: parsedAppState.viewBackgroundColor || "#121212",
      gridSize: parsedAppState.gridSize ?? null,
      theme: (parsedAppState.theme as "light" | "dark") || "dark",
      zoom: parsedAppState.zoom || { value: 1 },
      scrollX: parsedAppState.scrollX ?? 0,
      scrollY: parsedAppState.scrollY ?? 0,
    };

    let files: any = {};
    if (board.files && typeof board.files === "object") {
      files = board.files;
    } else if (typeof board.files === "string") {
      try {
        files = JSON.parse(board.files || "{}");
      } catch {
        files = {};
      }
    }

    return { elements, appState, files };
  }, [board.elements, board.appState, board.files]);

  // Keep track of last saved signature and pending data
  const lastSavedSignatureRef = useRef<string>(
    getSceneSignature(initialData.elements, initialData.appState, initialData.files)
  );

  const pendingDataRef = useRef<{
    elements: readonly any[];
    appState: any;
    files: any;
    signature: string;
  } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Network persistence function
  const persistBoardData = useCallback(
    async (payload: { elements: readonly any[]; appState: any; files: any; signature: string }) => {
      setSaveStatus("saving");
      try {
        const cleanElements = payload.elements ? Array.from(payload.elements) : [];
        const cleanState = cleanAppStateForStorage(payload.appState);

        const res = await fetch(`/api/boards/${board.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            elements: cleanElements,
            appState: cleanState,
            files: payload.files || {},
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to save canvas state: ${res.statusText}`);
        }

        lastSavedSignatureRef.current = payload.signature;

        // If no newer changes arrived while the request was in flight, mark saved
        if (pendingDataRef.current?.signature === payload.signature) {
          pendingDataRef.current = null;
          setSaveStatus("saved");
        }
      } catch (error) {
        console.error("Save error:", error);
        setSaveStatus("error");
      }
    },
    [board.id]
  );

  // Triggered on every Excalidraw scene mutation
  const handleCanvasChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (!canEdit) return;

      const currentSignature = getSceneSignature(elements, appState, files);

      // Skip transient UI updates (cursor movement, selection hover)
      if (currentSignature === lastSavedSignatureRef.current) {
        return;
      }

      setSaveStatus("unsaved");
      const pending = { elements, appState, files, signature: currentSignature };
      pendingDataRef.current = pending;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Auto-save debounce (800ms)
      debounceTimerRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          persistBoardData(pendingDataRef.current);
        }
      }, 800);
    },
    [canEdit, persistBoardData]
  );

  // Immediate manual save on Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit && pendingDataRef.current) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          persistBoardData(pendingDataRef.current);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, persistBoardData]);

  // Flush pending changes on visibility change / page hide (avoids unload permissions policy violation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && pendingDataRef.current) {
        persistBoardData(pendingDataRef.current);
      }
    };

    const handlePageHide = () => {
      if (pendingDataRef.current) {
        const payload = JSON.stringify({
          elements: Array.from(pendingDataRef.current.elements || []),
          appState: cleanAppStateForStorage(pendingDataRef.current.appState),
          files: pendingDataRef.current.files || {},
        });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`/api/boards/${board.id}`, blob);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [board.id, persistBoardData]);

  // Handle Export to PNG, SVG, or JSON
  const handleExport = async (format: "png" | "svg" | "json") => {
    if (!excalidrawApi) return;

    try {
      const elements = excalidrawApi.getSceneElements();
      const appState = excalidrawApi.getAppState();
      const files = excalidrawApi.getFiles();

      if (format === "json") {
        const jsonString = JSON.stringify(
          {
            type: "excalidraw",
            version: 2,
            source: "excalispace",
            elements,
            appState: cleanAppStateForStorage(appState),
            files,
          },
          null,
          2
        );
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${board.title || "board"}.excalidraw`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const { exportToBlob, exportToSvg } = await import("@excalidraw/excalidraw");

      if (format === "png") {
        const blob = await exportToBlob({
          elements,
          appState: {
            ...appState,
            exportWithDarkMode: appState.theme === "dark",
          },
          files,
          mimeType: "image/png",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${board.title || "board"}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "svg") {
        const svg = await exportToSvg({
          elements,
          appState: {
            ...appState,
            exportWithDarkMode: appState.theme === "dark",
          },
          files,
        });

        const svgString = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${board.title || "board"}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export canvas");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <CanvasHeader
        board={board}
        saveStatus={saveStatus}
        canEdit={canEdit}
        userRole={currentUserRole}
        onExport={handleExport}
        onOpenERDModal={() => setShowERDModal(true)}
      />
      <div className="flex-1 w-full h-[calc(100vh-3.5rem)] relative">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawApi(api)}
          initialData={initialData}
          onChange={handleCanvasChange}
          viewModeEnabled={!canEdit}
          theme="dark"
          langCode="en"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: canEdit,
              export: false,
              loadScene: canEdit,
              saveToActiveFile: false,
              toggleTheme: true,
              saveAsImage: false,
            },
          }}
        />
        {/* Real-time 60fps Animated Flow Overlay for marching dashed strokes */}
        <FlowAnimationOverlay
          excalidrawApi={excalidrawApi}
          isActive={true}
        />
      </div>

      {/* Native Excalidraw Arrow Sidebar Animation Panel Injection */}
      <NativeArrowAnimationPanel excalidrawApi={excalidrawApi} />

      {/* Database ERD (Entity-Relationship Diagram) Builder Modal */}
      <DatabaseERDModal
        isOpen={showERDModal}
        onClose={() => setShowERDModal(false)}
        excalidrawApi={excalidrawApi}
      />
    </div>
  );
}
