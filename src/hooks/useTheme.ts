import { useCallback, useEffect, useState } from "react";
import { load, save } from "@/lib/storage";

export type Theme = "light" | "dark";

/** Light by default (ignores the OS setting). HeroUI v3 themes via the `dark` class on <html>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => load<Theme>("theme", "light"));
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    save("theme", theme);
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  return { theme, setTheme, toggle };
}
