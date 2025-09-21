<template>
    <div class="relative">
        <input type="text" :value="modelValue"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" :placeholder="placeholder"
            class="
          w-full p-2.5 pr-10 text-sm text-white placeholder-gray-400
          !bg-gray-800 !rounded-lg 
          !border-none !appearance-none
          focus:!outline-none focus:!ring-2 focus:!ring-green-500
          transition-all duration-300 ease-in-out
          !shadow-inner !shadow-black/30
        " />
        <!-- The button doesn't need changes -->
        <button v-if="modelValue" @click="$emit('update:modelValue', '')" type="button" class="
          absolute inset-y-0 right-0 flex items-center justify-center 
          w-10 h-full text-gray-500
          hover:text-white transition-colors duration-200
        " aria-label="Clear input">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue?: string | null,
    placeholder?: string | null
}>();

defineEmits(['update:modelValue']);
</script>