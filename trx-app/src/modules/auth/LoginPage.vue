<template>
  <section class="mx-auto w-full max-w-2xl space-y-6">
    <AppCard>
      <div class="space-y-2">
        <p class="inline-flex items-center rounded-full bg-trx-100 px-3 py-1 text-xs font-semibold text-trx-700 dark:bg-trx-900/40 dark:text-trx-200">
          Wallet access
        </p>
        <h1 class="font-display text-3xl text-slate-900 dark:text-slate-50">Connect IOTA Wallet</h1>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          The app reads your address directly from the wallet extension. Manual address input has been removed.
        </p>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/70">
          <p class="font-semibold text-slate-700 dark:text-slate-100">Provider</p>
          <p class="mt-1 text-slate-500 dark:text-slate-400">{{ wallet.providerName.value || 'Not detected' }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/70">
          <p class="font-semibold text-slate-700 dark:text-slate-100">Connection</p>
          <p class="mt-1 text-slate-500 dark:text-slate-400">{{ wallet.isConnected.value ? 'Connected' : 'Not connected' }}</p>
        </div>
      </div>

      <div v-if="wallet.isConnected.value" class="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs dark:border-emerald-800 dark:bg-emerald-900/20">
        <p class="font-semibold text-emerald-700 dark:text-emerald-200">Wallet connected</p>
        <p class="break-all font-mono text-emerald-700 dark:text-emerald-200">Address: {{ wallet.address.value }}</p>
        <p v-if="wallet.network.value" class="text-emerald-700 dark:text-emerald-200">Network: {{ wallet.network.value }}</p>
        <p v-if="wallet.account.value" class="text-emerald-700 dark:text-emerald-200">Account: {{ wallet.account.value }}</p>
      </div>

      <div
        v-if="!wallet.isExtensionInstalled.value"
        class="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-900/20"
      >
        <p class="font-semibold text-amber-700 dark:text-amber-200">IOTA wallet extension not found</p>
        <p class="text-amber-700/90 dark:text-amber-200/90">Install IOTA Wallet to continue.</p>
        <a
          href="https://chromewebstore.google.com/detail/iota-wallet/iidjkmdceolghepehaaddojmnjnkkija"
          target="_blank"
          rel="noreferrer"
          class="inline-flex rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          Install IOTA Wallet
        </a>
      </div>

      <p v-if="formError" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
        {{ formError }}
      </p>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <BaseButton class="sm:flex-1" :loading="busy" @click="handleConnect">Connect IOTA Wallet</BaseButton>
        <BaseButton class="sm:flex-1" variant="secondary" :disabled="!wallet.isConnected.value" @click="wallet.disconnect">
          Disconnect Wallet
        </BaseButton>
      </div>
    </AppCard>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppCard from "@/shared/components/ui/AppCard.vue";
import BaseButton from "@/shared/components/ui/BaseButton.vue";
import { useSessionStore } from "@/stores/session";
import { useIotaWallet } from "@/shared/composables/useIotaWallet";
import { TrxApiError, connectWalletAuth } from "@/services/trx/trxApi";

const router = useRouter();
const sessionStore = useSessionStore();
const wallet = useIotaWallet();

const busy = ref(false);
const formError = ref<string>("");

sessionStore.hydrateFromStorage();
if (sessionStore.isAuthenticated) {
  void router.replace("/dashboard");
}

onMounted(async () => {
  await wallet.refresh();

  if (import.meta.env.DEV) {
    console.info("[wallet] refresh", wallet.debug.value);
  }
});

async function handleConnect(): Promise<void> {
  formError.value = "";

  await wallet.connect();

  if (import.meta.env.DEV && wallet.error.value) {
    console.warn("[wallet] connect failed", {
      error: wallet.error.value,
      debug: wallet.debug.value,
    });
  }

  if (!wallet.address.value) {
    formError.value = wallet.error.value ?? "Wallet address is not available";
    return;
  }

  busy.value = true;
  try {
    const result = await connectWalletAuth(wallet.address.value);

    if (result.registered) {
      sessionStore.setPendingOnboardingWallet(null);
      sessionStore.setSession({
        walletAddress: result.profile.wallet_address,
        did: result.profile.did,
        role: result.profile.role,
        companyName: result.profile.company_name,
        country: result.profile.country,
        city: result.profile.city,
        loadIdStandard: result.profile.load_id_standard,
      });
      await router.push("/dashboard");
      return;
    }

    sessionStore.setPendingOnboardingWallet(wallet.address.value);
    await router.push("/onboarding");
  } catch (error) {
    if (error instanceof TrxApiError) {
      formError.value = error.message;
    } else if (error instanceof Error) {
      formError.value = error.message;
    } else {
      formError.value = "Connection failed. Try again.";
    }
  } finally {
    busy.value = false;
  }
}
</script>
