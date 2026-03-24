import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "@/modules/auth/LoginPage.vue";
import OnboardingPage from "@/modules/onboarding/OnboardingPage.vue";
import DashboardPage from "@/modules/dashboard/DashboardPage.vue";

function hasSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.sessionStorage.getItem("trx_session"));
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", name: "login", component: LoginPage },
    { path: "/onboarding", name: "onboarding", component: OnboardingPage },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DashboardPage,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !hasSession()) {
    return { name: "login" };
  }

  if ((to.name === "login" || to.name === "onboarding") && hasSession()) {
    return { name: "dashboard" };
  }

  return true;
});
