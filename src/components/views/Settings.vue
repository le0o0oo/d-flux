<script setup lang="ts">
import { ref } from "vue";
import ModeToggle from "@/components/ModeToggle.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { platform } from '@tauri-apps/plugin-os';
import { useStorage } from '@vueuse/core'
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '@/stores/settingsStore';


const currentPlatform = platform();

const settingsStore = useSettingsStore();

withDefaults(defineProps<{
  showTitle?: boolean;
}>(), {
  showTitle: true,
});

console.log(currentPlatform)

async function chooseSaveFolder() {
  if (currentPlatform !== "android") {
    const folderPath = await open({
      multiple: false,
      directory: true,
    });

    console.log("Folder path: ", folderPath);

    if (folderPath) {
      settingsStore.setSaveFolderPath(folderPath);
    }
  }
  else {

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
          <Input v-model="settingsStore.saveFolderPath" placeholder="Select a folder path..." readonly class="flex-1" />
          <Button type="button" variant="outline" @click="chooseSaveFolder()">
            Browse
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
