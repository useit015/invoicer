export const THEME_DEFINITIONS = [
  {
    name: "default",
    label: "Classic Violet",
    description: "Balanced all-purpose invoice with a clean accent header.",
    baseColor: "#635CFF",
    mode: "light",
    tokens: {
      bodyBackground: "#f4f5f7",
      paperBackground: "#ffffff",
      text: "#15171a",
      muted: "#667085",
      border: "#d8dde6",
      surface: "#f7f8fb",
      radius: "6px",
      fontFamily: "Arial, sans-serif",
    },
  },
  {
    name: "vercel",
    label: "Vercel Mono",
    description: "High-contrast technical invoice for engineering-forward brands.",
    baseColor: "#ffffff",
    mode: "dark",
    tokens: {
      bodyBackground: "#050505",
      paperBackground: "#0a0a0a",
      text: "#f5f5f5",
      muted: "#8f8f8f",
      border: "#262626",
      surface: "#111111",
      radius: "0",
      fontFamily: "Inter, Arial, sans-serif",
    },
  },
  {
    name: "executive",
    label: "Executive Slate",
    description: "Formal boardroom-ready invoice with restrained slate accents.",
    baseColor: "#334155",
    mode: "light",
    tokens: {
      bodyBackground: "#eef2f7",
      paperBackground: "#ffffff",
      text: "#111827",
      muted: "#64748b",
      border: "#cbd5e1",
      surface: "#f8fafc",
      radius: "4px",
      fontFamily: "Georgia, 'Times New Roman', serif",
    },
  },
  {
    name: "ledger",
    label: "Ledger Green",
    description: "Finance-focused invoice with crisp accounting table treatment.",
    baseColor: "#047857",
    mode: "light",
    tokens: {
      bodyBackground: "#eef7f2",
      paperBackground: "#ffffff",
      text: "#102019",
      muted: "#587466",
      border: "#b8d8c6",
      surface: "#f2fbf6",
      radius: "3px",
      fontFamily: "'Trebuchet MS', Arial, sans-serif",
    },
  },
  {
    name: "studio",
    label: "Studio Coral",
    description: "Warm creative invoice with confident color and soft panels.",
    baseColor: "#e0523f",
    mode: "light",
    tokens: {
      bodyBackground: "#fff1ec",
      paperBackground: "#fffaf7",
      text: "#2d1612",
      muted: "#8f625b",
      border: "#f1c2b8",
      surface: "#fff3ef",
      radius: "8px",
      fontFamily: "'Avenir Next', Arial, sans-serif",
    },
  },
  {
    name: "minimal",
    label: "Minimal Ink",
    description: "Quiet monochrome invoice for simple professional billing.",
    baseColor: "#111827",
    mode: "light",
    tokens: {
      bodyBackground: "#f7f7f5",
      paperBackground: "#ffffff",
      text: "#111827",
      muted: "#6b7280",
      border: "#e5e7eb",
      surface: "#fafafa",
      radius: "2px",
      fontFamily: "Arial, sans-serif",
    },
  },
  {
    name: "aurora",
    label: "Aurora Blue",
    description: "Modern SaaS-style invoice with cool blue accents.",
    baseColor: "#2563eb",
    mode: "light",
    tokens: {
      bodyBackground: "#eef5ff",
      paperBackground: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      border: "#bfdbfe",
      surface: "#eff6ff",
      radius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
  },
];

export const THEME_NAMES = THEME_DEFINITIONS.map((theme) => theme.name);

export function findThemeDefinition(name) {
  return THEME_DEFINITIONS.find((theme) => theme.name === name);
}

export function getThemeDefinition(name = "default") {
  return findThemeDefinition(name) ?? THEME_DEFINITIONS[0];
}

export function listThemeDefinitions() {
  return THEME_DEFINITIONS.map(({ name, label, description, baseColor, mode }) => ({
    name,
    label,
    description,
    baseColor,
    mode,
  }));
}

export function resolveInvoiceTheme(invoice, overrideName) {
  const source = invoice?.invoiceDetails?.theme ?? {};
  const definition = getThemeDefinition(overrideName ?? source.template ?? "default");

  return {
    ...definition,
    baseColor: source.baseColor || definition.baseColor,
    mode: source.mode || definition.mode,
    tokens: {
      ...definition.tokens,
    },
  };
}
