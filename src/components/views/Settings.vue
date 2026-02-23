<script setup lang="ts">
import ModeToggle from "@/components/ModeToggle.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settingsStore";
import { getFs } from "@/services/filesystem";
import { toast } from "vue-sonner";
import DeviceSettings from "./DeviceSettings.vue";
import { useConnectionStore } from "@/stores/connectionStore";

const settingsStore = useSettingsStore();
const connectionStore = useConnectionStore();

withDefaults(
  defineProps<{
    showTitle?: boolean;
  }>(),
  {
    showTitle: true,
  },
);

async function chooseSaveFolder() {
  try {
    const result = await getFs().pickFolder();
    if (!result) return;
    settingsStore.setSaveFolder(result.path, result.uri);
  } catch (error) {
    toast.error("Failed to select folder. Please try again.");
  }
}
</script>

<template>
  <div class="p-4">
    <h1 v-if="showTitle" class="text-2xl font-bold mb-4">Settings</h1>
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

      <div class="rounded-lg border p-4 space-y-3">
        <div class="space-y-0.5">
          <label class="text-base font-medium">Data Save Folder</label>
          <p class="text-sm text-muted-foreground">
            Choose where acquired data files will be saved.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Input
            v-model="settingsStore.saveFolderPath"
            placeholder="Select a folder path..."
            readonly
            class="flex-1"
          />
          <Button type="button" variant="outline" @click="chooseSaveFolder()">
            Browse
          </Button>
        </div>
      </div>

      <DeviceSettings v-if="connectionStore.status === 'connected'" />
    </div>
  </div>
</template>
