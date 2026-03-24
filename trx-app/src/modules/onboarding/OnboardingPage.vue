<template>
  <section class="mx-auto w-full max-w-3xl">
    <AppCard>
      <div class="space-y-2">
        <p class="inline-flex items-center rounded-full bg-trx-100 px-3 py-1 text-xs font-semibold text-trx-700 dark:bg-trx-900/40 dark:text-trx-200">
          Registration
        </p>
        <h1 class="font-display text-3xl text-slate-900 dark:text-slate-50">Complete onboarding</h1>
        <p class="text-sm text-slate-600 dark:text-slate-300">Wallet address is automatically sourced from your wallet connection.</p>
      </div>

      <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/70">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Connected wallet</p>
        <p class="mt-1 break-all font-mono text-slate-700 dark:text-slate-100">{{ walletAddress }}</p>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="handleRegister">
        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700">
              <input v-model="role" type="radio" value="SHIPPER" />
              <span>Shipper / Broker</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700">
              <input v-model="role" type="radio" value="CARRIER" />
              <span>Carrier</span>
            </label>
          </div>
        </div>

        <BaseInput v-model="companyName" label="Company name" placeholder="Acme Logistics LLC" />

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1.5">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Country</span>
            <ComboBox v-model="country" :options="countryOptions" placeholder="Select country" />
          </label>

          <label class="space-y-1.5">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">City</span>
            <ComboBox v-model="city" :options="cityOptions" placeholder="Select city" />
          </label>
        </div>

        <BaseInput v-model="legalId" label="Legal ID" placeholder="MC-123456" />

        <div v-if="role === 'SHIPPER'" class="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <BaseSelect
            v-model="loadIdStandard"
            label="Load ID standard"
            :options="[
              { label: 'Select a standard...', value: '' },
              { label: 'Road Freight Reference (CMR / Shipment ID)', value: 'ROAD_FREIGHT' },
              { label: 'Custom', value: 'Custom' },
            ]"
          />

          <div v-if="loadIdStandard === 'Custom'" class="space-y-2">
            <p class="text-xs text-slate-500 dark:text-slate-400">Define custom field names for your load reference template.</p>
            <div v-for="(fieldName, index) in customFieldNames" :key="`field-${index}`" class="flex items-center gap-2">
              <input
                v-model="customFieldNames[index]"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                :placeholder="`Field ${index + 1} name`"
              />
              <button
                v-if="customFieldNames.length > 1"
                type="button"
                class="rounded-md border border-slate-300 px-2 py-2 text-xs dark:border-slate-700"
                @click="removeCustomField(index)"
              >
                Remove
              </button>
            </div>

            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
              @click="customFieldNames.push('')"
            >
              Add field
            </button>
          </div>
        </div>

        <p v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
          {{ error }}
        </p>

        <BaseButton type="submit" :loading="loading" block>Register and continue</BaseButton>
      </form>
    </AppCard>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { Role } from "@/domain/types";
import AppCard from "@/shared/components/ui/AppCard.vue";
import BaseButton from "@/shared/components/ui/BaseButton.vue";
import BaseInput from "@/shared/components/ui/BaseInput.vue";
import BaseSelect from "@/shared/components/ui/BaseSelect.vue";
import ComboBox from "@/shared/components/ui/ComboBox.vue";
import { COUNTRIES, getCitiesForCountry } from "@/shared/data/countryCityData";
import { useSessionStore } from "@/stores/session";
import { useIotaWallet } from "@/shared/composables/useIotaWallet";
import { TrxApiError, registerOnboarding } from "@/services/trx/trxApi";

const router = useRouter();
const wallet = useIotaWallet();
const sessionStore = useSessionStore();

const role = ref<Role>("SHIPPER");
const companyName = ref("");
const country = ref("");
const city = ref("");
const legalId = ref("");
const loadIdStandard = ref("");
const customFieldNames = ref<string[]>([""]);
const loading = ref(false);
const error = ref("");

const walletAddress = computed(() => wallet.address.value || sessionStore.pendingOnboardingWallet || "");
const countryOptions = computed(() => COUNTRIES.map((countryData) => countryData.name));
const cityOptions = computed(() => getCitiesForCountry(country.value));

void wallet.refresh();
sessionStore.hydrateFromStorage();

if (!walletAddress.value) {
  void router.replace("/login");
}

watch(country, () => {
  city.value = "";
});

function removeCustomField(index: number): void {
  customFieldNames.value = customFieldNames.value.filter((_, fieldIndex) => fieldIndex !== index);
}

async function handleRegister(): Promise<void> {
  error.value = "";

  if (!walletAddress.value) {
    error.value = "Wallet address not available. Reconnect wallet.";
    return;
  }

  if (!companyName.value || !country.value || !city.value || !legalId.value) {
    error.value = "All required fields must be completed.";
    return;
  }

  loading.value = true;
  try {
    const loadIdValue =
      role.value === "SHIPPER"
        ? loadIdStandard.value === "Custom"
          ? JSON.stringify({
              _type: "custom",
              fields: customFieldNames.value.filter((fieldName) => fieldName.trim().length > 0),
            })
          : loadIdStandard.value || null
        : null;

    const profile = await registerOnboarding({
      wallet_address: walletAddress.value,
      role: role.value,
      company_name: companyName.value,
      country: country.value,
      city: city.value,
      legal_id: legalId.value,
      load_id_standard: loadIdValue,
    });

    sessionStore.setPendingOnboardingWallet(null);
    sessionStore.setSession({
      walletAddress: profile.wallet_address,
      did: profile.did,
      role: profile.role,
      companyName: profile.company_name,
      country: profile.country,
      city: profile.city,
      loadIdStandard: profile.load_id_standard,
    });

    await router.push("/dashboard");
  } catch (registerError) {
    if (registerError instanceof TrxApiError) {
      error.value = registerError.message;
    } else if (registerError instanceof Error) {
      error.value = registerError.message;
    } else {
      error.value = "Registration failed. Try again.";
    }
  } finally {
    loading.value = false;
  }
}
</script>
