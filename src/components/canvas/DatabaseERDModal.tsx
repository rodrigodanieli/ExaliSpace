"use client";

import React, { useState } from "react";
import {
  Database,
  Table2,
  Layers,
  Code2,
  Link2,
  Plus,
  Trash2,
  Sparkles,
  Check,
  X,
  Key,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  TableDefinition,
  ColumnDefinition,
  generateERDTable,
  generateERDRelationship,
  ERD_TEMPLATES,
  parseSqlOrPrismaToERD,
} from "@/lib/excalidraw-generator";

interface DatabaseERDModalProps {
  isOpen: boolean;
  onClose: () => void;
  excalidrawApi: any;
}

const COMMON_SQL_TYPES = [
  "UUID",
  "INT",
  "BIGINT",
  "VARCHAR(255)",
  "TEXT",
  "BOOLEAN",
  "TIMESTAMP",
  "JSONB",
  "DECIMAL(10,2)",
  "DATE",
];

const THEME_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Pink", value: "#ec4899" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Slate", value: "#64748b" },
];

export function DatabaseERDModal({
  isOpen,
  onClose,
  excalidrawApi,
}: DatabaseERDModalProps) {
  const [activeTab, setActiveTab] = useState<"builder" | "templates" | "import" | "relation">("builder");

  // Tab 1: Builder State
  const [tableName, setTableName] = useState("users");
  const [tableColor, setTableColor] = useState("#6366f1");
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: "id", type: "UUID", isPk: true },
    { name: "name", type: "VARCHAR(255)" },
    { name: "email", type: "VARCHAR(255)", isUnique: true },
    { name: "created_at", type: "TIMESTAMP" },
  ]);

  // Tab 2: Templates State
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("excalispace");
  const [animateTemplateArrows, setAnimateTemplateArrows] = useState(true);

  // Tab 3: Import Schema State
  const [importText, setImportText] = useState(
    `CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMP
);`
  );
  const [importError, setImportError] = useState<string | null>(null);

  // Tab 4: Relation State
  const [cardinality, setCardinality] = useState<"1:N" | "1:1" | "N:N">("1:N");
  const [relationLabel, setRelationLabel] = useState("references");
  const [relationAnimated, setRelationAnimated] = useState(true);

  if (!isOpen) return null;

  // Viewport center scene calculation helper
  const getSceneCenter = (offsetOffsetX = 0, offsetOffsetY = 0) => {
    if (!excalidrawApi) return { x: 100, y: 100 };
    const appState = excalidrawApi.getAppState();
    const zoom = appState.zoom?.value || 1;
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;
    const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;

    return {
      x: Math.round(-scrollX + viewportW / (2 * zoom) + offsetOffsetX),
      y: Math.round(-scrollY + viewportH / (2 * zoom) + offsetOffsetY),
    };
  };

  // Add a new column to the builder
  const handleAddColumn = () => {
    setColumns((prev) => [
      ...prev,
      {
        name: `col_${prev.length + 1}`,
        type: "VARCHAR(255)",
      },
    ]);
  };

  // Add standard audit columns
  const handleAddAuditColumns = () => {
    setColumns((prev) => [
      ...prev.filter((c) => c.name !== "created_at" && c.name !== "updated_at"),
      { name: "created_at", type: "TIMESTAMP" },
      { name: "updated_at", type: "TIMESTAMP" },
    ]);
  };

  // Insert custom table into canvas
  const handleInsertCustomTable = () => {
    if (!excalidrawApi) return;
    if (!tableName.trim() || columns.length === 0) return;

    const center = getSceneCenter(-140, -100);
    const tableDef: TableDefinition = {
      name: tableName.trim(),
      color: tableColor,
      columns,
    };

    const newElements = generateERDTable(tableDef, center.x, center.y);
    const currentElements = excalidrawApi.getSceneElements();

    excalidrawApi.updateScene({
      elements: [...currentElements, ...newElements],
    });

    onClose();
  };

  // Insert complete pre-packaged ERD template
  const handleInsertTemplate = () => {
    if (!excalidrawApi) return;
    const template = ERD_TEMPLATES[selectedTemplateKey];
    if (!template) return;

    const center = getSceneCenter(-450, -260);
    const currentElements = excalidrawApi.getSceneElements();
    const generatedElements: any[] = [];
    const tablePositions: Record<string, { x: number; y: number; width: number; height: number }> = {};

    // Position tables in an organized 2D grid
    const colsPerRow = 3;
    const spacingX = 360;
    const spacingY = 320;

    template.tables.forEach((table, idx) => {
      const row = Math.floor(idx / colsPerRow);
      const col = idx % colsPerRow;
      const x = center.x + col * spacingX;
      const y = center.y + row * spacingY;

      const tblElements = generateERDTable(table, x, y);
      generatedElements.push(...tblElements);

      // Save bounding box for relationship arrow connections
      const height = 44 + table.columns.length * 26 + 16;
      tablePositions[table.name] = { x, y, width: 280, height };
    });

    // Generate relationship arrows
    template.relationships.forEach((rel) => {
      const fromPos = tablePositions[rel.from];
      const toPos = tablePositions[rel.to];

      if (fromPos && toPos) {
        const arrows = generateERDRelationship(fromPos, toPos, {
          cardinality: rel.cardinality,
          label: rel.label,
          isAnimatedFlow: animateTemplateArrows,
          color: "#818cf8",
        });
        generatedElements.push(...arrows);
      }
    });

    excalidrawApi.updateScene({
      elements: [...currentElements, ...generatedElements],
    });

    onClose();
  };

  // Parse and insert SQL or Prisma schema
  const handleImportSchema = () => {
    if (!excalidrawApi) return;
    setImportError(null);

    const tables = parseSqlOrPrismaToERD(importText);
    if (tables.length === 0) {
      setImportError("No valid tables found. Make sure to use SQL CREATE TABLE or Prisma model syntax.");
      return;
    }

    const center = getSceneCenter(-380, -220);
    const currentElements = excalidrawApi.getSceneElements();
    const generatedElements: any[] = [];

    const colsPerRow = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(tables.length))));
    const spacingX = 360;
    const spacingY = 300;

    tables.forEach((table, idx) => {
      const row = Math.floor(idx / colsPerRow);
      const col = idx % colsPerRow;
      const x = center.x + col * spacingX;
      const y = center.y + row * spacingY;

      const tblElements = generateERDTable(table, x, y);
      generatedElements.push(...tblElements);
    });

    excalidrawApi.updateScene({
      elements: [...currentElements, ...generatedElements],
    });

    onClose();
  };

  // Insert a standalone relationship arrow
  const handleInsertRelationshipArrow = () => {
    if (!excalidrawApi) return;
    const center = getSceneCenter(-100, 0);

    const arrowElements = generateERDRelationship(
      { x: center.x, y: center.y, width: 0, height: 0 },
      { x: center.x + 220, y: center.y, width: 0, height: 0 },
      {
        cardinality,
        label: relationLabel.trim() || cardinality,
        isAnimatedFlow: relationAnimated,
        color: "#818cf8",
      }
    );

    const currentElements = excalidrawApi.getSceneElements();
    excalidrawApi.updateScene({
      elements: [...currentElements, ...arrowElements],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Database ERD (Entity-Relationship Diagram)
              </h2>
              <p className="text-xs text-slate-400">
                Build native database entities and relational models
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4">
          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "builder"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Create Table</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "templates"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Templates</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "import"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Import DDL / Prisma</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("relation")}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "relation"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Connect Relation</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: VISUAL TABLE BUILDER */}
          {activeTab === "builder" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Table Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Table / Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. users, products, workspaces..."
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Theme Color Picker */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Header Accent Color
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {THEME_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setTableColor(c.value)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          tableColor === c.value
                            ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 border-white scale-110"
                            : "border-slate-700 hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {tableColor === c.value && <Check className="w-3.5 h-3.5 text-black" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Columns Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Table Columns ({columns.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddAuditColumns}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      + Add Audit Fields
                    </button>
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Column</span>
                    </button>
                  </div>
                </div>

                {/* Columns List Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                  <div className="grid grid-cols-12 gap-2 p-2.5 bg-slate-800/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <span className="col-span-5">Field Name</span>
                    <span className="col-span-4">SQL Type</span>
                    <span className="col-span-2 text-center">Keys</span>
                    <span className="col-span-1 text-right">Action</span>
                  </div>

                  <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                    {columns.map((col, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 p-2 items-center text-xs hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Name input */}
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => {
                              const updated = [...columns];
                              updated[idx].name = e.target.value;
                              setColumns(updated);
                            }}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        {/* Type input/dropdown */}
                        <div className="col-span-4">
                          <input
                            list="sql-types"
                            value={col.type}
                            onChange={(e) => {
                              const updated = [...columns];
                              updated[idx].type = e.target.value;
                              setColumns(updated);
                            }}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                          <datalist id="sql-types">
                            {COMMON_SQL_TYPES.map((t) => (
                              <option key={t} value={t} />
                            ))}
                          </datalist>
                        </div>

                        {/* Flags: PK / FK */}
                        <div className="col-span-2 flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Primary Key (PK)"
                            onClick={() => {
                              const updated = [...columns];
                              updated[idx].isPk = !updated[idx].isPk;
                              if (updated[idx].isPk) updated[idx].isFk = false;
                              setColumns(updated);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              col.isPk
                                ? "bg-amber-500 text-black shadow-sm"
                                : "bg-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            PK
                          </button>
                          <button
                            type="button"
                            title="Foreign Key (FK)"
                            onClick={() => {
                              const updated = [...columns];
                              updated[idx].isFk = !updated[idx].isFk;
                              if (updated[idx].isFk) updated[idx].isPk = false;
                              setColumns(updated);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              col.isFk
                                ? "bg-sky-500 text-black shadow-sm"
                                : "bg-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            FK
                          </button>
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => setColumns(columns.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                  Excalidraw Native Preview
                </span>
                <div
                  className="rounded-lg border overflow-hidden max-w-xs"
                  style={{ borderColor: tableColor, backgroundColor: "#090d16" }}
                >
                  <div
                    className="p-2.5 flex items-center justify-between border-b"
                    style={{ borderColor: tableColor + "66", backgroundColor: tableColor + "22" }}
                  >
                    <span className="font-bold text-xs text-white uppercase">{tableName || "table_name"}</span>
                    <span className="text-[10px] font-mono" style={{ color: tableColor }}>[TABLE]</span>
                  </div>
                  <div className="p-2 space-y-1 font-mono text-[11px]">
                    {columns.slice(0, 4).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-300">
                        <span>{c.isPk ? "🔑 " : c.isFk ? "🔗 " : "• "}{c.name}</span>
                        <span className="text-slate-500 text-[10px]">{c.type}</span>
                      </div>
                    ))}
                    {columns.length > 4 && (
                      <div className="text-[10px] text-slate-500 italic pt-1">
                        + {columns.length - 4} additional columns
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRE-PACKAGED TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Select a pre-modeled architectural schema to inject into the canvas with connected tables and relationship arrows:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(ERD_TEMPLATES).map(([key, tpl]) => {
                  const isSelected = selectedTemplateKey === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedTemplateKey(key)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10"
                          : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-bold text-white tracking-tight">{tpl.title}</h3>
                          {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3">{tpl.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{tpl.tables.length} Tables</span>
                        <span>{tpl.relationships.length} Relations</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Template settings */}
              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Connect with Animated Flow Arrows</h4>
                  <p className="text-[11px] text-slate-400">
                    Applies the dynamic animated flow effect to relationship arrows between foreign keys.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={animateTemplateArrows}
                  onChange={(e) => setAnimateTemplateArrows(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT SQL / PRISMA */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white">Paste your SQL DDL or Prisma Schema</h3>
                  <p className="text-[11px] text-slate-400">
                    Supports SQL <code>CREATE TABLE</code> statements or Prisma <code>model</code> blocks.
                  </p>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <textarea
                rows={10}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                placeholder="CREATE TABLE users ( id UUID PRIMARY KEY, name VARCHAR(255) ... );"
              />
            </div>
          )}

          {/* TAB 4: RELATIONSHIP CONNECTOR */}
          {activeTab === "relation" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Insert a relationship arrow with configured cardinality to connect tables in Excalidraw:
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Relational Cardinality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1:N", "1:1", "N:N"] as const).map((card) => (
                    <button
                      key={card}
                      type="button"
                      onClick={() => setCardinality(card)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono transition-colors cursor-pointer ${
                        cardinality === card
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      {card}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Relationship Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. references, owns, ordered_by..."
                  value={relationLabel}
                  onChange={(e) => setRelationLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Animated Flow Arrow (Dashed)</h4>
                  <p className="text-[11px] text-slate-400">
                    Enables dynamic particles along the relationship arrow path.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={relationAnimated}
                  onChange={(e) => setRelationAnimated(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          {activeTab === "builder" && (
            <button
              type="button"
              onClick={handleInsertCustomTable}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Table into Canvas</span>
            </button>
          )}

          {activeTab === "templates" && (
            <button
              type="button"
              onClick={handleInsertTemplate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Insert Full Template</span>
            </button>
          )}

          {activeTab === "import" && (
            <button
              type="button"
              onClick={handleImportSchema}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>Convert and Insert into Canvas</span>
            </button>
          )}

          {activeTab === "relation" && (
            <button
              type="button"
              onClick={handleInsertRelationshipArrow}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Insert Relationship Arrow</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
