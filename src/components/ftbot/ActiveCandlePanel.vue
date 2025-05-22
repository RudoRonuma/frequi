<script setup lang="ts">

import type { CandleInfoElement } from '@/types';
import { AxiosError } from 'axios';
import { debounce } from 'lodash-es';

const props = defineProps({
  selectedIndex: { required: false, default: () => null, type: Number as () => number | null },
  selectedDate: { required: false, default: () => null, type: String as () => string | null },
});

// This will eventually hold the detailed data for the selected candle
// For now, it's null, simulating no candle being selected.
// In a real scenario, this would likely come from a prop or a store.
const activeCandleData = ref<CandleInfoElement[] | null>(null); // Using any[] for now, can be refined later
const isLoading = ref(false);
const filterText = ref('');
const isSendingPushComboReq = ref(false);
const hasComboTag = ref(false);
const comboSide = ref('');

/**
 * API errors.
 */
const candleInfoApiError = ref<string | null>(null);
const comboApiError = ref<string | null>(null);

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
    candleInfoApiError.value = null;
    return;
  }

  isLoading.value = true;
  activeCandleData.value = null; // Clear previous data
  candleInfoApiError.value = null;        // Clear previous errors


  if (!botStore.activeBot.plotPair || !finalTimeframe) {
    candleInfoApiError.value = "Pair or timeframe not available.";
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
    const comboTagIndex = candleInfo.data.findIndex((el) => {
      if (el.label !== "enter_tag" && el.label !== "exit_tag") {
        return false;
      }

      if (typeof el.value != "string") {
        return false;
      }

      return (el.value as string).indexOf("_combo_") !== -1;
    });
    hasComboTag.value = comboTagIndex !== -1;
    if (hasComboTag.value) {
      comboSide.value = (candleInfo.data[comboTagIndex].value as string).split("_")[0];
    } else {
      comboSide.value = '';
    }

  } catch (error: any) {
    console.error("Failed to fetch candle details:", error);
    candleInfoApiError.value = error.message || "An unknown error occurred while fetching data.";
    activeCandleData.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function handleAddEntryComboButtonClick() {
  await pushCombo("enter");
}

async function handleExitComboButtonClick() {
  await pushCombo("exit");
}

async function pushCombo(side: string) {
  if (!props.selectedDate) {
    return;
  }

  isSendingPushComboReq.value = true;
  try {
    const pushResult = await botStore.activeBot.pushCombo(
      {
        date: props.selectedDate,
        side: side,
        pair: botStore.activeBot.plotPair,
        timeframe: finalTimeframe.value,
      }
    );
    if (!pushResult) {
      comboApiError.value = "Failed to push combo: server returned empty response.";
      console.log("Push result is empty...");
      return;
    }
    comboApiError.value = null;
    triggerBrowserDownload(pushResult.fileContent, pushResult.fileName);
  }
  catch (err) {
    if (err instanceof AxiosError) {
      comboApiError.value = JSON.parse(err.response?.data)?.detail ?? "Failed to push combo";
    } else {
      comboApiError.value = `Failed to push combo: ${err}\nis your instance up?`
    }
    console.log(`PushCombo: Failed to push combo: ${err}`);
    return;
  }
  finally {
    isSendingPushComboReq.value = false;
  }

  hasComboTag.value = true;
}

async function handleRemoveComboButtonClick() {
  if (!props.selectedDate) {
    return;
  }

  isSendingPushComboReq.value = true;
  try {
    const removeResult = await botStore.activeBot.removeCombo(
      {
        date: props.selectedDate,
        side: comboSide.value,
        pair: botStore.activeBot.plotPair,
        timeframe: finalTimeframe.value,
      }
    );
    if (!removeResult) {
      comboApiError.value = "Failed to remove combo: server returned empty response";
      console.log("handleRemoveComboButtonClick: Failed to remove combo...");
      return;
    }

    comboApiError.value = null;
    triggerBrowserDownload(removeResult.fileContent, removeResult.fileName);
  }
  catch (err) {
    if (err instanceof AxiosError) {
      comboApiError.value = JSON.parse(err.response?.data)?.detail ?? "Failed to remove combo";
    } else {
      comboApiError.value = `Failed to remove combo: ${err}\nis your instance up?`
    }
    console.log(`handleRemoveComboButtonClick: Failed to remove combo: ${err}`);
    return;
  }
  finally {
    isSendingPushComboReq.value = false;
  }

  hasComboTag.value = false;
}

function triggerBrowserDownload(fileContent: string, fileName: string, mimeType: string = 'text/plain') {
  // 1. Create a Blob from the file content
  const blob = new Blob([fileContent], { type: mimeType });

  // 2. Create an object URL for this Blob
  const url = URL.createObjectURL(blob);

  // 3. Create a temporary <a> element
  const anchor = document.createElement('a');
  anchor.style.display = 'none'; // Make it invisible

  // 4. Set its href to the object URL
  anchor.href = url;

  // 5. Set its download attribute to the desired filename
  anchor.download = fileName;

  // 6. Append to the DOM (required for Firefox for the click to work)
  document.body.appendChild(anchor);

  // 7. Programmatically click the anchor element to trigger download
  anchor.click();

  // 8. Clean up: remove the anchor and revoke the object URL
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
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


onMounted(() => {
  if (hasSelectedCandle.value && !isLoading.value && props.selectedDate !== null) {
    fetchCandleDetailsAPI(props.selectedDate, filterText.value);
  }
});

</script>

<template>
  <div class="p-2 active-candle-panel flex flex-col">
    <div class="flex flex-col overflow-hidden" style="
  height: 50vh;
  ">
      <div class="mb-2 shrink-0">
        <input v-model="filterText" type="text" placeholder="Filter indicators (e.g., rsi, ema)..."
          class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500" />
      </div>

      <div class="flex-grow overflow-y-auto">
        <template v-if="isLoading">
          <p class="text-center italic mt-4">Loading candle data...</p>
          <!-- Optional: Add a spinner component here -->
        </template>
        <template v-else-if="candleInfoApiError">
          <p class="text-center italic text-red-500 dark:text-red-400 mt-4">
            Error: {{ candleInfoApiError }}
          </p>
        </template>
        <template v-else-if="hasSelectedCandle && activeCandleData && activeCandleData.length > 0">
          <div class="mt-1"> <!-- Reduced top margin -->
            <!-- Table is now focus, title removed or can be simplified -->
            <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
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
                <tr v-for="(item, index) in activeCandleData" :key="index"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <InfoBox class="ms-2" :hint="`Min: ${item.min_value}, Max: ${item.max_value}`" />
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
    <template v-if="comboApiError">
      <hr class="w-full my-6 border-gray-300 dark:border-gray-700" />
      <div class="bg-red-50 border-l-4 border-red-500 rounded-md shadow-md p-4 my-4 flex items-center">
        <div class="flex-shrink-0 mr-3">
          <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd" />
          </svg>
        </div>
        <div class="flex-grow">
          <p class="font-medium text-red-700">Combo Error</p>
          <p class="text-sm text-red-600 italic">{{ comboApiError }}</p>
        </div>
      </div>
    </template>
    <!-- Bottom 50% Panel: New Panel Area -->
    <div v-if="hasSelectedCandle && !candleInfoApiError"
      class="border-t border-gray-300 dark:border-gray-700 p-4 flex flex-col overflow-y-auto">

      <!--====================================-->
      <template v-if="!hasComboTag">
        <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Add Entry Combo</h3>
        <p class="text-gray-700 dark:text-gray-300">
          You can add an entry combo to the asset's enter combo list.
        </p>
        <button type="button" @click="handleAddEntryComboButtonClick"
          class="px-6 py-3 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition ease-in-out duration-150 transform hover:scale-105">
          Add Entry
        </button>
        <div class="flex-grow mt-4">
          <p class="italic text-sm">The new file will be saved on the server and downloaded here as well.</p>
        </div>
        <!--====================================-->
        <hr class="w-full my-6 border-gray-300 dark:border-gray-700" />
        <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Add Exit Combo</h3>
        <p class="text-gray-700 dark:text-gray-300">
          You can add an exit combo to the asset's exit combo list.
        </p>
        <button type="button" @click="handleExitComboButtonClick"
          class="px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition ease-in-out duration-150 transform hover:scale-105">
          Add Exit
        </button>
        <div class="flex-grow mt-4">
          <p class="italic text-sm">The new file will be saved on the server and downloaded here as well.</p>
        </div>
        <!--====================================-->
      </template>
      <template v-else>
        <!--====================================-->
        <hr class="w-full my-6 border-gray-300 dark:border-gray-700" />
        <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Remove {{ comboSide }} Combo</h3>
        <p class="text-gray-700 dark:text-gray-300">
          This will remove the combination from within the combi list file.
        </p>
        <button type="button" @click="handleRemoveComboButtonClick"
          class="px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition ease-in-out duration-150 transform hover:scale-105">
          Remove {{ comboSide }}
        </button>
        <div class="flex-grow mt-4">
          <p class="italic text-sm">The new file will be saved on the server and downloaded here as well.</p>
        </div>
        <!--====================================-->
      </template>
    </div>
  </div>
</template>

<style scoped>
.active-candle-panel {
  /* height: 100%; /* Ensure it takes up available space in the tab panel (already set) */
  overflow-y: auto;
  /* Allow scrolling if content is too long (already set by flex-grow and overflow-y-auto on child) */
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