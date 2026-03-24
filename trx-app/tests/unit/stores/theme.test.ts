import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useThemeStore } from "@/stores/theme";

const THEME_STORAGE_KEY = "trx_theme";

describe("theme store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    setActivePinia(createPinia());
  });

  it('default mode is "light" (matchMedia returns false per setup.ts)', () => {
    const store = useThemeStore();
    expect(store.mode).toBe("light");
  });

  it("initialize applies theme from localStorage if present", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    setActivePinia(createPinia());
    const store = useThemeStore();
    store.initialize();
    expect(store.mode).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggleTheme switches from light to dark", () => {
    const store = useThemeStore();
    expect(store.mode).toBe("light");
    store.toggleTheme();
    expect(store.mode).toBe("dark");
  });

  it("toggleTheme again switches back to light", () => {
    const store = useThemeStore();
    store.toggleTheme();
    store.toggleTheme();
    expect(store.mode).toBe("light");
  });

  it("toggleTheme updates localStorage", () => {
    const store = useThemeStore();
    store.toggleTheme();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    store.toggleTheme();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it('toggleTheme adds/removes "dark" class on documentElement', () => {
    const store = useThemeStore();
    store.toggleTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    store.toggleTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
