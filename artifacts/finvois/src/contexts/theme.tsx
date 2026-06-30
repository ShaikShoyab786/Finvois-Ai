import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeId = "finny" | "blue" | "white-gold";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  swatch: { bg: string; accent: string };
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  finny: {
    id: "finny",
    name: "Finny Signature",
    tagline: "Black & Gold",
    description: "Finny's bold signature look — deep black with gold accents.",
    swatch: { bg: "#0f0f12", accent: "#d4a017" },
  },
  blue: {
    id: "blue",
    name: "Professional Blue",
    tagline: "Banker's Classic",
    description: "Clean navy and royal blue — the trusted default.",
    swatch: { bg: "#16213e", accent: "#2563eb" },
  },
  "white-gold": {
    id: "white-gold",
    name: "Executive White",
    tagline: "Luxury White & Gold",
    description: "Bright ivory with refined gold — best for presentations.",
    swatch: { bg: "#f7f3ea", accent: "#b8860b" },
  },
};

export const THEME_ORDER: ThemeId[] = ["finny", "blue", "white-gold"];

export const DEFAULT_THEME: ThemeId = "blue";

/** Resolve a possibly-null/unknown DB value into a concrete theme id. */
export function resolveTheme(value: string | null | undefined): ThemeId {
  if (value && value in THEMES) return value as ThemeId;
  return DEFAULT_THEME;
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: {
  children: ReactNode;
  initialTheme?: ThemeId;
}) {
  const [theme, setTheme] = useState<ThemeId>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
