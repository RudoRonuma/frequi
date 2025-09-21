<template>
    <div>
        <!-- The main input element. It uses v-model on the component itself -->
        <input v-model="model" type="text" :placeholder="placeholder"
            class="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500" />

        <!-- Container for suggestion buttons -->
        <!-- It only shows up if the suggestedWords array has items in it -->
        <div v-if="suggestedWords && suggestedWords.length > 0" class="mt-2 flex flex-wrap gap-2">
            <button v-for="word in suggestedWords" :key="word" @click="selectSuggestion(word)"
                class="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                {{ word }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
// defineModel makes handling v-model from the parent component super easy.
// It automatically creates the 'modelValue' prop and the 'update:modelValue' emit.
const model = defineModel<string>();

// Define the props our component accepts.
defineProps<{
    placeholder?: string;
    suggestedWords?: string[];
}>();

// This function is called when a suggestion button is clicked.
// It updates the model, which in turn updates the input's value.
function selectSuggestion(word: string) {
    model.value = word;
}
</script>