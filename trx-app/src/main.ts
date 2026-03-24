import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { useThemeStore } from "./stores/theme";
import "./styles/main.css";

const LEGACY_DB_KEY = "trx_database_v1";
const MIGRATION_MARKER_KEY = "trx_migration_onchain_strict_v1";

function runStrictOnChainMigration(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.localStorage.getItem(MIGRATION_MARKER_KEY)) {
    return;
  }

  const raw = window.localStorage.getItem(LEGACY_DB_KEY);
  if (!raw) {
    window.localStorage.setItem(MIGRATION_MARKER_KEY, new Date().toISOString());
    return;
  }

  try {
    const parsed = JSON.parse(raw) as { profiles?: unknown };
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    window.localStorage.setItem(
      LEGACY_DB_KEY,
      JSON.stringify({
        profiles,
      })
    );
  } catch {
    window.localStorage.removeItem(LEGACY_DB_KEY);
  }

  window.localStorage.setItem(MIGRATION_MARKER_KEY, new Date().toISOString());
}

runStrictOnChainMigration();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

const themeStore = useThemeStore();
themeStore.initialize();

app.mount("#app");
