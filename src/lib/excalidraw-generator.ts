/**
 * Utility functions to generate 100% native Excalidraw elements
 * for Database ERD diagrams and Animated Flow Arrows.
 */

export interface ColumnDefinition {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
}

export interface TableDefinition {
  id?: string;
  name: string;
  color?: string; // Theme hex color
  columns: ColumnDefinition[];
}

export interface FlowSettings {
  animated: boolean;
  direction?: "forward" | "reverse" | "bidirectional";
  speed?: number; // 0.5, 1, 2
  color?: string;
  label?: string;
  style?: "dots" | "pulse" | "dashes";
}

// Random ID generator compatible with Excalidraw
export function generateExcalidrawId(): string {
  return "el_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Random seed generator for Rough.js deterministic rendering
function randomSeed(): number {
  return Math.floor(Math.random() * 2000000000);
}

// Base properties required by all Excalidraw elements
function getBaseElementProps(overrides: Record<string, any> = {}) {
  return {
    id: generateExcalidrawId(),
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0, // 0 gives crisp, clean architectural diagrams
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 }, // Adaptive radius for modern rounded cards
    seed: randomSeed(),
    version: 1,
    versionNonce: randomSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...overrides,
  };
}

// Create a native Excalidraw Rectangle
export function createRectangle(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  roundness?: { type: number; value?: number } | null;
  groupIds?: string[];
  opacity?: number;
  customData?: Record<string, any>;
}) {
  return {
    ...getBaseElementProps({
      type: "rectangle",
      x: opts.x,
      y: opts.y,
      width: opts.width,
      height: opts.height,
      backgroundColor: opts.backgroundColor || "transparent",
      strokeColor: opts.strokeColor || "#334155",
      strokeWidth: opts.strokeWidth ?? 1,
      strokeStyle: opts.strokeStyle || "solid",
      roundness: opts.roundness !== undefined ? opts.roundness : { type: 3 },
      groupIds: opts.groupIds || [],
      opacity: opts.opacity ?? 100,
      customData: opts.customData,
    }),
  };
}

// Create a native Excalidraw Text element
export function createText(opts: {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: number; // 1 = Virgil, 2 = Helvetica/Sans, 3 = Cascadia/Code
  strokeColor?: string;
  textAlign?: "left" | "center" | "right";
  groupIds?: string[];
  containerId?: string | null;
}) {
  const fontSize = opts.fontSize || 14;
  const fontFamily = opts.fontFamily || 2;
  const text = opts.text || "";

  // Approximate metrics so Excalidraw renders without wrapping or clipping
  const charWidth = fontFamily === 3 ? fontSize * 0.6 : fontSize * 0.58;
  const width = Math.max(30, Math.ceil(text.length * charWidth) + 10);
  const height = Math.ceil(fontSize * 1.35);

  return {
    ...getBaseElementProps({
      type: "text",
      x: opts.x,
      y: opts.y,
      width,
      height,
      strokeColor: opts.strokeColor || "#f8fafc",
      backgroundColor: "transparent",
      text,
      originalText: text,
      fontSize,
      fontFamily,
      textAlign: opts.textAlign || "left",
      verticalAlign: "top",
      baseline: Math.ceil(fontSize * 0.85),
      containerId: opts.containerId || null,
      lineHeight: 1.25,
      groupIds: opts.groupIds || [],
    }),
  };
}

// Create a native Excalidraw Line
export function createLine(opts: {
  x: number;
  y: number;
  points: [number, number][];
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  groupIds?: string[];
}) {
  const points = opts.points || [[0, 0], [100, 0]];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    ...getBaseElementProps({
      type: "line",
      x: opts.x,
      y: opts.y,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      points,
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: null,
      strokeColor: opts.strokeColor || "#334155",
      strokeWidth: opts.strokeWidth ?? 1,
      strokeStyle: opts.strokeStyle || "solid",
      groupIds: opts.groupIds || [],
    }),
  };
}

// Create a native Excalidraw Arrow (supports Animated Flow metadata)
export function createArrow(opts: {
  x: number;
  y: number;
  points: [number, number][];
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  startArrowhead?: "arrow" | "bar" | "dot" | "triangle" | null;
  endArrowhead?: "arrow" | "bar" | "dot" | "triangle" | null;
  elbowed?: boolean;
  groupIds?: string[];
  flow?: FlowSettings;
  label?: string;
}) {
  const points = opts.points || [[0, 0], [160, 0]];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const customData: Record<string, any> = {};
  if (opts.flow) {
    customData.flow = {
      animated: opts.flow.animated ?? true,
      direction: opts.flow.direction || "forward",
      speed: opts.flow.speed || 1,
      color: opts.flow.color || opts.strokeColor || "#6366f1",
      label: opts.flow.label || opts.label || "",
      style: opts.flow.style || "dots",
    };
  }

  const elements: any[] = [];

  const arrow = {
    ...getBaseElementProps({
      type: "arrow",
      x: opts.x,
      y: opts.y,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      points,
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: opts.startArrowhead !== undefined ? opts.startArrowhead : null,
      endArrowhead: opts.endArrowhead !== undefined ? opts.endArrowhead : "arrow",
      elbowed: !!opts.elbowed,
      strokeColor: opts.strokeColor || (opts.flow?.color || "#6366f1"),
      strokeWidth: opts.strokeWidth ?? 2,
      strokeStyle: opts.strokeStyle || (opts.flow?.animated ? "dotted" : "solid"),
      groupIds: opts.groupIds || [],
      customData,
    }),
  };

  elements.push(arrow);

  // If label is specified, add a clean floating label text at the midpoint
  if (opts.label || opts.flow?.label) {
    const labelText = opts.label || opts.flow?.label || "";
    const midX = opts.x + (points[0][0] + points[points.length - 1][0]) / 2;
    const midY = opts.y + (points[0][1] + points[points.length - 1][1]) / 2 - 20;

    const textEl = createText({
      x: midX - 30,
      y: midY,
      text: labelText,
      fontSize: 12,
      fontFamily: 3, // Monospace for technical flow labels
      strokeColor: opts.flow?.color || opts.strokeColor || "#818cf8",
      groupIds: opts.groupIds || [],
    });
    elements.push(textEl);
  }

  return elements;
}

// Generate a complete Database Table ERD Entity
export function generateERDTable(
  table: TableDefinition,
  originX: number,
  originY: number
): any[] {
  const elements: any[] = [];
  const tableGroupId = generateExcalidrawId();
  const themeColor = table.color || "#6366f1"; // Primary accent

  // Calculate table dimensions
  const colCount = Math.max(1, table.columns.length);
  const maxNameLen = Math.max(table.name.length, ...table.columns.map((c) => c.name.length + c.type.length));
  const tableWidth = Math.max(280, Math.min(420, maxNameLen * 8.5 + 80));
  const headerHeight = 44;
  const rowHeight = 26;
  const bodyHeight = colCount * rowHeight + 16;
  const totalHeight = headerHeight + bodyHeight;

  // 1. Table Outer Container Card (Shadow & Border)
  const container = createRectangle({
    x: originX,
    y: originY,
    width: tableWidth,
    height: totalHeight,
    backgroundColor: "#090d16",
    strokeColor: themeColor,
    strokeWidth: 2,
    roundness: { type: 3 },
    groupIds: [tableGroupId],
  });
  elements.push(container);

  // 2. Table Header Background
  const headerBg = createRectangle({
    x: originX,
    y: originY,
    width: tableWidth,
    height: headerHeight,
    backgroundColor: themeColor + "22", // Semi-transparent header tint
    strokeColor: themeColor,
    strokeWidth: 1,
    roundness: { type: 3 },
    groupIds: [tableGroupId],
  });
  elements.push(headerBg);

  // 3. Table Header Text (Title in bold sans-serif)
  const titleText = createText({
    x: originX + 14,
    y: originY + 12,
    text: table.name.toLowerCase(),
    fontSize: 16,
    fontFamily: 2, // Helvetica/Sans
    strokeColor: "#ffffff",
    groupIds: [tableGroupId],
  });
  elements.push(titleText);

  // 4. Header Badge "[TABLE]"
  const badgeText = createText({
    x: originX + tableWidth - 75,
    y: originY + 15,
    text: "[TABLE]",
    fontSize: 11,
    fontFamily: 3, // Code monospace
    strokeColor: themeColor,
    groupIds: [tableGroupId],
  });
  elements.push(badgeText);

  // 5. Header / Body Divider Line
  const divider = createLine({
    x: originX,
    y: originY + headerHeight,
    points: [
      [0, 0],
      [tableWidth, 0],
    ],
    strokeColor: themeColor + "66",
    strokeWidth: 1,
    groupIds: [tableGroupId],
  });
  elements.push(divider);

  // 6. Column Rows
  table.columns.forEach((col, idx) => {
    const rowY = originY + headerHeight + 10 + idx * rowHeight;

    // Key indicator: PK 🔑, FK 🔗, or bullet •
    let keyPrefix = "• ";
    let keyColor = "#94a3b8";

    if (col.isPk) {
      keyPrefix = "🔑 ";
      keyColor = "#fbbf24"; // Amber gold
    } else if (col.isFk) {
      keyPrefix = "🔗 ";
      keyColor = "#38bdf8"; // Light sky blue
    }

    // Column Name
    const nameEl = createText({
      x: originX + 14,
      y: rowY,
      text: `${keyPrefix}${col.name}`,
      fontSize: 13,
      fontFamily: 3,
      strokeColor: col.isPk ? "#fef08a" : col.isFk ? "#bae6fd" : "#e2e8f0",
      groupIds: [tableGroupId],
    });
    elements.push(nameEl);

    // Column Type and flags (e.g., UUID [PK], VARCHAR(255) [NN])
    let typeDescription = col.type.toUpperCase();
    if (col.isPk) typeDescription += " [PK]";
    else if (col.isFk) typeDescription += " [FK]";
    if (col.isUnique && !col.isPk) typeDescription += " [UQ]";

    const typeEl = createText({
      x: originX + tableWidth - (typeDescription.length * 7.5 + 16),
      y: rowY,
      text: typeDescription,
      fontSize: 11,
      fontFamily: 3,
      strokeColor: keyColor,
      groupIds: [tableGroupId],
    });
    elements.push(typeEl);
  });

  return elements;
}

// Generate a Relationship Arrow connecting two tables
export function generateERDRelationship(
  fromPos: { x: number; y: number; width: number; height: number },
  toPos: { x: number; y: number; width: number; height: number },
  opts: {
    cardinality?: "1:N" | "1:1" | "N:N";
    label?: string;
    isAnimatedFlow?: boolean;
    color?: string;
  } = {}
): any[] {
  const fromCenterX = fromPos.x + fromPos.width;
  const fromCenterY = fromPos.y + Math.min(60, fromPos.height / 2);
  const toCenterX = toPos.x;
  const toCenterY = toPos.y + Math.min(60, toPos.height / 2);

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  return createArrow({
    x: fromCenterX,
    y: fromCenterY,
    points: [
      [0, 0],
      [dx / 2, 0],
      [dx / 2, dy],
      [dx, dy],
    ],
    strokeColor: opts.color || "#818cf8",
    strokeWidth: 2,
    strokeStyle: opts.isAnimatedFlow ? "dotted" : "solid",
    startArrowhead: opts.cardinality === "1:N" ? "bar" : "dot",
    endArrowhead: "arrow",
    label: opts.label || opts.cardinality || "1:N",
    flow: opts.isAnimatedFlow
      ? {
          animated: true,
          direction: "forward",
          speed: 1,
          color: opts.color || "#818cf8",
          label: opts.label || opts.cardinality || "1:N",
        }
      : undefined,
  });
}

// Pre-packaged ERD Templates
export const ERD_TEMPLATES: Record<
  string,
  {
    title: string;
    description: string;
    tables: TableDefinition[];
    relationships: Array<{
      from: string;
      to: string;
      label: string;
      cardinality: "1:N" | "1:1" | "N:N";
    }>;
  }
> = {
  excalispace: {
    title: "ExcaliSpace (SaaS RBAC)",
    description: "Workspaces, Folders, Boards, Members and Access hierarchy.",
    tables: [
      {
        name: "users",
        color: "#6366f1",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "name", type: "VARCHAR(255)" },
          { name: "email", type: "VARCHAR(255)", isUnique: true },
          { name: "password_hash", type: "VARCHAR(255)" },
          { name: "is_platform_admin", type: "BOOLEAN" },
          { name: "created_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "workspaces",
        color: "#3b82f6",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "name", type: "VARCHAR(255)" },
          { name: "slug", type: "VARCHAR(100)", isUnique: true },
          { name: "created_at", type: "TIMESTAMP" },
          { name: "updated_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "workspace_members",
        color: "#0ea5e9",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "user_id", type: "UUID", isFk: true },
          { name: "workspace_id", type: "UUID", isFk: true },
          { name: "role", type: "Role (OWNER/ADMIN/MEMBER)" },
          { name: "created_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "folders",
        color: "#10b981",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "name", type: "VARCHAR(255)" },
          { name: "workspace_id", type: "UUID", isFk: true },
          { name: "parent_id", type: "UUID", isFk: true, isNullable: true },
          { name: "created_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "boards",
        color: "#8b5cf6",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "title", type: "VARCHAR(255)" },
          { name: "workspace_id", type: "UUID", isFk: true },
          { name: "folder_id", type: "UUID", isFk: true, isNullable: true },
          { name: "creator_id", type: "UUID", isFk: true },
          { name: "is_public", type: "BOOLEAN" },
          { name: "public_access", type: "Role" },
          { name: "elements", type: "JSONB" },
          { name: "app_state", type: "JSONB" },
          { name: "updated_at", type: "TIMESTAMP" },
        ],
      },
    ],
    relationships: [
      { from: "workspaces", to: "workspace_members", label: "has members", cardinality: "1:N" },
      { from: "users", to: "workspace_members", label: "participates", cardinality: "1:N" },
      { from: "workspaces", to: "folders", label: "contains", cardinality: "1:N" },
      { from: "workspaces", to: "boards", label: "hosts", cardinality: "1:N" },
      { from: "users", to: "boards", label: "authored", cardinality: "1:N" },
    ],
  },
  ecommerce: {
    title: "E-Commerce & Orders",
    description: "Customers, Products, Orders, Items and Payments.",
    tables: [
      {
        name: "customers",
        color: "#10b981",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "name", type: "VARCHAR(255)" },
          { name: "email", type: "VARCHAR(255)", isUnique: true },
          { name: "phone", type: "VARCHAR(50)" },
          { name: "created_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "orders",
        color: "#f59e0b",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "customer_id", type: "UUID", isFk: true },
          { name: "status", type: "VARCHAR(50)" },
          { name: "total_amount", type: "DECIMAL(10,2)" },
          { name: "created_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "order_items",
        color: "#ec4899",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "order_id", type: "UUID", isFk: true },
          { name: "product_id", type: "UUID", isFk: true },
          { name: "quantity", type: "INT" },
          { name: "unit_price", type: "DECIMAL(10,2)" },
        ],
      },
      {
        name: "products",
        color: "#06b6d4",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "sku", type: "VARCHAR(50)", isUnique: true },
          { name: "name", type: "VARCHAR(255)" },
          { name: "price", type: "DECIMAL(10,2)" },
          { name: "stock_quantity", type: "INT" },
        ],
      },
      {
        name: "payments",
        color: "#8b5cf6",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "order_id", type: "UUID", isFk: true },
          { name: "amount", type: "DECIMAL(10,2)" },
          { name: "gateway_status", type: "VARCHAR(50)" },
          { name: "paid_at", type: "TIMESTAMP" },
        ],
      },
    ],
    relationships: [
      { from: "customers", to: "orders", label: "places", cardinality: "1:N" },
      { from: "orders", to: "order_items", label: "includes", cardinality: "1:N" },
      { from: "products", to: "order_items", label: "ordered as", cardinality: "1:N" },
      { from: "orders", to: "payments", label: "paid via", cardinality: "1:1" },
    ],
  },
  auth_rbac: {
    title: "Authentication & RBAC",
    description: "Users, Roles, Permissions and Sessions.",
    tables: [
      {
        name: "users",
        color: "#6366f1",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "username", type: "VARCHAR(100)", isUnique: true },
          { name: "email", type: "VARCHAR(255)", isUnique: true },
          { name: "is_active", type: "BOOLEAN" },
          { name: "created_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "roles",
        color: "#ec4899",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "name", type: "VARCHAR(100)", isUnique: true },
          { name: "description", type: "TEXT" },
        ],
      },
      {
        name: "permissions",
        color: "#10b981",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "code", type: "VARCHAR(100)", isUnique: true },
          { name: "description", type: "TEXT" },
        ],
      },
      {
        name: "user_roles",
        color: "#f59e0b",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "user_id", type: "UUID", isFk: true },
          { name: "role_id", type: "UUID", isFk: true },
          { name: "granted_at", type: "TIMESTAMP" },
        ],
      },
      {
        name: "role_permissions",
        color: "#06b6d4",
        columns: [
          { name: "id", type: "UUID", isPk: true },
          { name: "role_id", type: "UUID", isFk: true },
          { name: "permission_id", type: "UUID", isFk: true },
        ],
      },
    ],
    relationships: [
      { from: "users", to: "user_roles", label: "has role", cardinality: "1:N" },
      { from: "roles", to: "user_roles", label: "assigned to", cardinality: "1:N" },
      { from: "roles", to: "role_permissions", label: "contains", cardinality: "1:N" },
      { from: "permissions", to: "role_permissions", label: "granted in", cardinality: "1:N" },
    ],
  },
};

// Parser to extract tables and columns from SQL DDL or Prisma schema text
export function parseSqlOrPrismaToERD(rawText: string): TableDefinition[] {
  const tables: TableDefinition[] = [];
  const palette = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

  // 1. Try SQL DDL: CREATE TABLE [IF NOT EXISTS] name ( ... )
  const sqlTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = sqlTableRegex.exec(rawText)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: ColumnDefinition[] = [];

    const lines = body.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim().replace(/,$/, "");
      if (!line || line.startsWith("--") || line.startsWith("/*")) continue;

      // Check if line defines PRIMARY KEY (col) or CONSTRAINT
      if (/^(?:CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|KEY|INDEX)/i.test(line)) {
        continue;
      }

      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const colName = parts[0].replace(/[`"\[\]]/g, "");
        const colType = parts[1].replace(/,/g, "");
        const upper = line.toUpperCase();

        const isPk = upper.includes("PRIMARY KEY") || colName.toLowerCase() === "id";
        const isFk = upper.includes("REFERENCES") || colName.toLowerCase().endsWith("_id");
        const isUnique = upper.includes("UNIQUE");
        const isNullable = !upper.includes("NOT NULL");

        columns.push({
          name: colName,
          type: colType,
          isPk,
          isFk,
          isUnique,
          isNullable,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        color: palette[tables.length % palette.length],
        columns,
      });
    }
  }

  // 2. If no SQL tables found, try Prisma format: model TableName { ... }
  if (tables.length === 0) {
    const prismaModelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\}/gi;
    let prismaMatch;

    while ((prismaMatch = prismaModelRegex.exec(rawText)) !== null) {
      const tableName = prismaMatch[1];
      const body = prismaMatch[2];
      const columns: ColumnDefinition[] = [];

      const lines = body.split("\n");
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("//") || line.startsWith("@@")) continue;

        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const colName = parts[0];
          const colType = parts[1];
          const upper = line.toUpperCase();

          // Skip relation field objects like: user User @relation(...)
          if (/^[A-Z]/.test(colType) && !["String", "Int", "Boolean", "DateTime", "Json", "Float", "Decimal", "Bytes", "BigInt"].includes(colType)) {
            continue;
          }

          const isPk = upper.includes("@ID");
          const isFk = upper.includes("@RELATION") || colName.toLowerCase().endsWith("id");
          const isUnique = upper.includes("@UNIQUE");

          columns.push({
            name: colName,
            type: colType,
            isPk,
            isFk,
            isUnique,
          });
        }
      }

      if (columns.length > 0) {
        tables.push({
          name: tableName,
          color: palette[tables.length % palette.length],
          columns,
        });
      }
    }
  }

  return tables;
}
