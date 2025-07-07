<script setup lang="ts">
import type { Lock, Trade } from '@/types';

import { useBotStore } from '@/stores/ftbotwrapper';

interface CombinedPairList {
  pair: string;
  lockReason: string;
  profitString: string;
  trade?: Trade;
  locks?: Lock;
  profit: number;
  profitAbs: number;
  tradeCount: number;
}

interface GroupedPairData {
  subItems: CombinedPairList[];
  totalTrades: number;
  isLocked: boolean;
  lockReason: string;
  isActiveGroup: boolean; // True if a sub-item is the selected pair
}


const filterText = ref('');

// State to track the currently expanded group
const expandedGroupKey = ref<string | null>(null);

const props = defineProps({
  // TOOD: Should be string list
  pairlist: { required: true, type: Array as () => string[] },
  currentLocks: { required: false, type: Array as () => Lock[], default: () => [] },
  trades: { required: true, type: Array as () => Trade[] },
  sortMethod: { default: 'normal', type: String },
  backtestMode: { required: false, default: false, type: Boolean },
  startingBalance: { required: false, type: Number, default: 0 },
});
const botStore = useBotStore();

const combinedPairList = computed(() => {
  const comb: CombinedPairList[] = [];

  props.pairlist.forEach((pair) => {
    const trades: Trade[] = props.trades.filter((el) => el.pair === pair);
    const allLocks = props.currentLocks.filter((el) => el.pair === pair);
    let lockReason = '';
    let locks;

    // Sort to have longer timeframe in front
    allLocks.sort((a, b) => (a.lock_end_timestamp > b.lock_end_timestamp ? -1 : 1));
    if (allLocks.length > 0) {
      [locks] = allLocks;
      lockReason = `${timestampms(locks.lock_end_timestamp)} - ${locks.side} - ${locks.reason}`;
    }
    let profitString = '';
    let profit = 0;
    let profitAbs = 0;
    trades.forEach((trade) => {
      profit += trade.profit_ratio;
      profitAbs += trade.profit_abs ?? 0;
    });
    if (props.sortMethod == 'profit' && props.startingBalance) {
      profit = profitAbs / props.startingBalance;
    }
    const tradeCount = trades.length;
    const trade = tradeCount ? trades[0] : undefined;
    if (trades.length > 0) {
      profitString = `Current profit: ${formatPercent(profit)}`;
    }
    if (trade) {
      profitString += `\nOpen since: ${timestampms(trade.open_timestamp)}`;
    }
    if (
      filterText.value === '' ||
      pair.toLocaleLowerCase().includes(filterText.value.toLocaleLowerCase())
    ) {
      comb.push({ pair, trade, locks, lockReason, profitString, profit, profitAbs, tradeCount });
    }
  });

  if (props.sortMethod === 'profit') {
    comb.sort((a, b) => {
      if (a.profit > b.profit) {
        return -1;
      }
      return 1;
    });
  } else {
    // sort Pairs: "with open trade" -> available -> locked
    comb.sort((a, b) => {
      if (a.trade && !b.trade) {
        return -1;
      }
      if (a.trade && b.trade) {
        // 2 open trade pairs
        return a.trade.trade_id > b.trade.trade_id ? 1 : -1;
      }
      if (!a.locks && b.locks) {
        return -1;
      }
      if (a.locks && b.locks) {
        // Both have locks
        return a.locks.lock_end_timestamp > b.locks.lock_end_timestamp ? 1 : -1;
      }
      return 1;
    });
  }
  return comb;
});


// A computed property to group flat pairs into a nested structure
const groupedPairs = computed(() => {
  // The 'reduce' function is perfect for transforming an array into an object
  return combinedPairList.value.reduce((accumulator, item) => {
    const [basePair] = item.pair.split(':'); // "BTC/USDT:4h" -> "BTC/USDT"

    // If this is the first time we see this basePair, initialize its group
    if (!accumulator[basePair]) {
      accumulator[basePair] = {
        subItems: [],
        totalTrades: 0,
        isLocked: false,
        lockReason: '',
        isActiveGroup: false,
      };
    }

    const group = accumulator[basePair];
    group.subItems.push(item);
    group.totalTrades += item.tradeCount;

    // Aggregate lock information for the group
    // if (item.locks) {
    //   group.isLocked = true;
    //   const timeframe = item.pair.split(':')[1] || 'N/A';
    //   const reason = `${timeframe}: ${item.lockReason}`;
    //   group.lockReason = group.lockReason ? `${group.lockReason}; ${reason}` : reason;
    // }
    
    // Check if any sub-item in this group is the currently active one
    if (item.pair === botStore.activeBot.selectedPair) {
      group.isActiveGroup = true;
      // Bonus: If the active pair is in a group, ensure that group is expanded by default
      if (expandedGroupKey.value === null) {
        expandedGroupKey.value = basePair;
      }
    }

    return accumulator;
  }, {} as Record<string, GroupedPairData>);
});

// Function to toggle accordion items
function toggleGroup(groupKey: string) {
  // If the clicked group is already open, close it. Otherwise, open it.
  expandedGroupKey.value = expandedGroupKey.value === groupKey ? null : groupKey;
}

// Function to select a specific timeframe (sub-item)
function selectPair(pair: string) {
  botStore.activeBot.selectedPair = pair;
}

</script>

<template>
  <div>
    <div
      label-for="trade-filter"
      class="mb-2"
      :class="{
        'me-4': backtestMode,
        'me-2': !backtestMode,
      }"
    >
      <InputText
        id="trade-filter"
        v-model="filterText"
        type="text"
        placeholder="Filter"
        class="w-full"
      />
    </div>
  <!-- Main container for the list -->
  <div class="space-y-1">
    <!-- Loop over the GROUPS (e.g., BTC/USDT) -->
    <div
      v-for="(group, groupKey) in groupedPairs"
      :key="groupKey"
      class="border rounded-md border-surface-300 dark:border-surface-700 overflow-hidden"
    >
      <!-- Group Header: This is the clickable part -->
      <button
        type="button"
        class="flex w-full justify-between items-center px-2 py-2 text-left text-sm font-medium"
        :class="{
          'bg-surface-200 dark:bg-surface-800/50': expandedGroupKey === groupKey,
          'text-primary-500 dark:text-primary-400': group.isActiveGroup && expandedGroupKey !== groupKey,
          'hover:bg-surface-100 dark:hover:bg-surface-800/30': true,
        }"
        @click="toggleGroup(groupKey)"
      >
        <!-- Left side: Group name and lock icon -->
        <div class="flex items-center space-x-2">
          <span class="font-semibold">{{ groupKey }}</span>
          <span v-if="group.isLocked" :title="`Locks active in this group: ${group.lockReason}`">
            <i-mdi-lock class="text-amber-500" />
          </span>
        </div>

        <!-- Right side: Trade count and chevron icon -->
        <div class="flex items-center space-x-3">
          <span class="text-xs text-surface-500 dark:text-surface-400">
            {{ group.totalTrades }} trades
          </span>
          <!-- Chevron icon rotates smoothly on expand/collapse -->
          <i-mdi-chevron-down
            class="transform transition-transform duration-300"
            :class="{ 'rotate-180': expandedGroupKey === groupKey }"
          />
        </div>
      </button>

      <!-- Expandable Sub-list: Wrapped in a transition for smooth animation -->
      <transition name="expand">
        <div v-if="expandedGroupKey === groupKey">
          <ul class="py-1 px-1 bg-surface-100 dark:bg-surface-900/50">
            <!-- Loop over SUB-ITEMS (e.g., 4h, 15m) -->
            <li
              v-for="subItem in group.subItems"
              :key="subItem.pair"
              class="flex cursor-pointer justify-between items-center px-2 py-1.5 rounded-md"
              :class="{
                'bg-primary dark:border-primary text-primary-contrast': subItem.pair === botStore.activeBot.selectedPair,
                'hover:bg-primary/10 dark:hover:bg-primary/20': subItem.pair !== botStore.activeBot.selectedPair,
              }"
              :title="`${formatPriceCurrency(subItem.profitAbs, botStore.activeBot.stakeCurrency, botStore.activeBot.stakeCurrencyDecimals)} - ${subItem.pair} - ${subItem.tradeCount} trades`"
              @click="selectPair(subItem.pair)"
            >
              <!-- Left side of sub-item: Timeframe and lock icon -->
              <div class="flex items-center space-x-2 pl-2">
                <span class="text-sm">{{ subItem.pair }}</span>
                <span v-if="subItem.locks" :title="subItem.lockReason">
                  <i-mdi-lock class="h-3.5 w-3.5" />
                </span>
              </div>

              <!-- Right side of sub-item: Profit components -->
              <TradeProfit v-if="subItem.trade && !backtestMode" :trade="subItem.trade" />
              <ProfitPill
                v-if="backtestMode && subItem.tradeCount > 0"
                :profit-ratio="subItem.profit"
                :stake-currency="botStore.activeBot.stakeCurrency"
              />
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
  </div>
</template>

<style scoped>

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 500px; /* Set to a height larger than any possible content */
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}

.list-group {
  text-align: left;
}

</style>
