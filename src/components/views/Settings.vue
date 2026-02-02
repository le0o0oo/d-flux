<script setup lang="ts">
import ModeToggle from "@/components/ModeToggle.vue";
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Settings</h1>
    <div class="space-y-4">
      <div class="flex items-center justify-between rounded-lg border p-4">
        <div class="space-y-0.5">
          <label class="text-base font-medium">Appearance</label>
          <p class="text-sm text-muted-foreground">
            Customize the appearance of the app. Automatically switch between
            day and night themes.
          </p>
        </div>
        <ModeToggle />
      </div>
    </div>
  </div>
</template>
