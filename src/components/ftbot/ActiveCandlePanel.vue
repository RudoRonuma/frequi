<script setup lang="ts">

import type { CandleInfoElement } from '@/types';
import { debounce } from 'lodash-es';

const props = defineProps({
  selectedIndex: { required: false, default: () => null, type: Number as () => number | null },
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

// const finalSelectPair = computed<string>(() => {
//   return chartStore.
// });


async function fetchCandleDetailsAPI(candleIndex: number, currentFilter: string) {
  if (candleIndex === null) {
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
        candleIndex: candleIndex,
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
  if (props.selectedIndex !== null) {
    // A new candle is selected (or the first candle is selected)
    // console.log("ActiveCandlePanel got the index: ", props.selectedIndex)
    fetchCandleDetailsAPI(props.selectedIndex, filterText.value);
  } else {
    // No candle is selected (e.g., deselected, or initially null)
    activeCandleData.value = null;
  }
});

watch(filterText, (newFilterText) => {
  if (props.selectedIndex !== null) {
    // When filter text changes, fetch (debounced) for the current selected index
    debouncedFetchCandleDetails(props.selectedIndex, newFilterText);
  }
});

</script>

<template>
  <div class="p-2 active-candle-panel">
    <template v-if="isLoading">
      <p class="text-center italic">Loading candle data...</p>
      <!-- Optional: Add a spinner component here -->
    </template>
    <template v-else-if="hasSelectedCandle && activeCandleData && activeCandleData.length > 0">
      <div>
        <h3 class="text-lg font-semibold mb-2">Candle @ Index: {{ props.selectedIndex }}</h3>
        <!-- This will be replaced with a proper table -->
        <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col"
                class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Indicator / Property
              </th>
              <th scope="col"
                class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
    <template v-else-if="hasSelectedCandle && !activeCandleData && !isLoading">
      <p class="text-center italic">
        No data returned for selected candle (Index: {{ props.selectedIndex }}).
      </p>
    </template>
    <template v-else>
      <p class="text-center italic">
        Please select a candle on the chart to see its details here.
      </p>
    </template>
  </div>
</template>

<style scoped>
.active-candle-panel {
  height: 100%;
  overflow-y: auto;
}

/* Basic styling for the table to make it look modern-ish, can be enhanced */
table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  padding: 8px;
  text-align: left;
}
</style>