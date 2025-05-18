<script setup lang="ts">

import type { CandleInfoElement } from '@/types';
import { debounce } from 'lodash';

const props = defineProps({
  selectedIndex: { required: false, default: () => null, type: Number as () => number | null },
  selectedDate: { required: false, default: null, type: String as () => string | null },
});

// This will eventually hold the detailed data for the selected candle
// For now, it's null, simulating no candle being selected.
// In a real scenario, this would likely come from a prop or a store.
const activeCandleData = ref<CandleInfoElement[] | null>(null); // Using any[] for now, can be refined later
const isLoading = ref(false);
const filterText = ref('');
const apiError = ref<string | null>(null);

const chartStore = useChartConfigStore();
const botStore = useBotStore();

const hasSelectedCandle = computed(() => props.selectedIndex !== null);

const finalTimeframe = computed<string>(() => {
  return botStore.activeBot.isWebserverMode
    ? chartStore.selectedTimeframe || botStore.activeBot.strategy.timeframe || ''
    : botStore.activeBot.timeframe;
});


async function fetchCandleDetailsAPI(candleDate: string, currentFilter: string) {
  if (candleDate === null) {
    activeCandleData.value = null;
    apiError.value = null;
    return;
  }

  isLoading.value = true;
  activeCandleData.value = null; // Clear previous data
  apiError.value = null;        // Clear previous errors


  if (!botStore.activeBot.plotPair || !finalTimeframe) {
    apiError.value = "Pair or timeframe not available.";
    isLoading.value = false;
    return;
  }

  try {
    const candleInfo = await botStore.activeBot.getCandleInfo(
      {
        date: candleDate,
        filter: currentFilter || null,
        pair: botStore.activeBot.plotPair,
        timeframe: finalTimeframe.value,
      }
    )
    
    activeCandleData.value = candleInfo.data;

  } catch (error: any) {
    console.error("Failed to fetch candle details:", error);
    apiError.value = error.message || "An unknown error occurred while fetching data.";
    activeCandleData.value = null;
  } finally {
    isLoading.value = false;
  }
}

const debouncedFetchCandleDetails = debounce(fetchCandleDetailsAPI, 500);

// Watch for changes in the selectedIndex prop
watch(() => props.selectedIndex, (newIndex, oldIndex) => {
  if (props.selectedIndex !== null && props.selectedDate !== null) {
    // A new candle is selected (or the first candle is selected)
    // console.log("ActiveCandlePanel got the index: ", props.selectedIndex)
    fetchCandleDetailsAPI(props.selectedDate, filterText.value);
  } else {
    // No candle is selected (e.g., deselected, or initially null)
    activeCandleData.value = null;
  }
});

watch(filterText, (newFilterText) => {
  if (props.selectedIndex !== null && props.selectedDate !== null) {
    // When filter text changes, fetch (debounced) for the current selected index
    debouncedFetchCandleDetails(props.selectedDate, newFilterText);
  }
});

</script>

<template>
  <div class="p-2 active-candle-panel flex flex-col h-full">
    <div class="mb-2">
      <input
        v-model="filterText"
        type="text"
        placeholder="Filter indicators (e.g., rsi, ema)..."
        class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>

    <div class="flex-grow overflow-y-auto">
      <template v-if="isLoading">
        <p class="text-center italic mt-4">Loading candle data...</p>
        <!-- Optional: Add a spinner component here -->
      </template>
      <template v-else-if="apiError">
        <p class="text-center italic text-red-500 dark:text-red-400 mt-4">
          Error: {{ apiError }}
        </p>
      </template>
      <template v-else-if="hasSelectedCandle && activeCandleData && activeCandleData.length > 0">
        <div class="mt-1"> <!-- Reduced top margin -->
          <!-- Table is now focus, title removed or can be simplified -->
          <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Indicator / Property
                </th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Value
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              <tr v-for="(item, index) in activeCandleData" :key="index" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ item.label }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {{ item.value }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template v-else-if="hasSelectedCandle && !isLoading"> <!-- No data and not loading -->
        <p class="text-center italic mt-4">
          No data found for candle (Index: {{ props.selectedIndex }})
          <span v-if="filterText">with filter "{{ filterText }}"</span>.
        </p>
      </template>
      <template v-else> <!-- No candle selected -->
        <p class="text-center italic mt-4">
          Please select a candle on the chart to see its details here.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.active-candle-panel {
  /* height: 100%; /* Ensure it takes up available space in the tab panel (already set) */
  overflow-y: auto; /* Allow scrolling if content is too long (already set by flex-grow and overflow-y-auto on child) */
}
/* Basic styling for the table, ensure header is sticky */
table {
  border-collapse: collapse;
  width: 100%;
}
thead th {
  /* Make table header sticky */
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>