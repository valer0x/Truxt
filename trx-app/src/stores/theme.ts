import { ref } from "vue";
import { defineStore } from "pinia";

const THEME_STORAGE_KEY = "trx_theme";

type ThemeMode = "light" | "dark";

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(resolveInitialTheme());

  function applyTheme(nextMode: ThemeMode): void {
    mode.value = nextMode;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", nextMode === "dark");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    }
  }

  function initialize(): void {
    applyTheme(resolveInitialTheme());
  }

  function toggleTheme(): void {
    applyTheme(mode.value === "light" ? "dark" : "light");
  }

  return {
    mode,
    initialize,
    toggleTheme,
  };
});
