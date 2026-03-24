<template>
  <div ref="container" class="relative">
    <input
      :id="id"
      v-model="inputValue"
      type="text"
      :placeholder="placeholder"
      class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-trx-500 focus:ring-2 focus:ring-trx-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-trx-900"
      @focus="open = true"
      @input="handleInput"
    />
    <ul
      v-if="open && filteredOptions.length > 0"
      class="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <li
        v-for="option in filteredOptions"
        :key="option"
        class="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-trx-50 hover:text-trx-800 dark:text-slate-200 dark:hover:bg-trx-900/30 dark:hover:text-trx-200"
        @click="selectOption(option)"
      >
        {{ option }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const model = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    id?: string;
    options: string[];
    placeholder?: string;
  }>(),
  {
    id: "",
    placeholder: "Search...",
  }
);

const container = ref<HTMLElement | null>(null);
const open = ref(false);
const inputValue = ref(model.value || "");

watch(
  () => model.value,
  (next) => {
    if (!open.value) {
      inputValue.value = next;
    }
  }
);

const filteredOptions = computed(() => {
  const query = inputValue.value.trim().toLowerCase();
  if (!query) {
    return props.options;
  }

  return props.options.filter((option) => option.toLowerCase().includes(query));
});

function handleInput(): void {
  model.value = inputValue.value;
}

function selectOption(option: string): void {
  model.value = option;
  inputValue.value = option;
  open.value = false;
}

function onDocumentClick(event: MouseEvent): void {
  if (!container.value) {
    return;
  }

  const target = event.target;
  if (target instanceof Node && !container.value.contains(target)) {
    open.value = false;
    inputValue.value = model.value;
  }
}

onMounted(() => {
  document.addEventListener("mousedown", onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocumentClick);
});
</script>
