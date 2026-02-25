<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settingsStore";
import { ref } from "vue";
import { getFs } from "@/services/filesystem";
import { toast } from "vue-sonner";

const settingsStore = useSettingsStore();
const selected = ref(false);

const emit = defineEmits<{
  (e: "next"): void;
}>();

async function selectFolder() {
  try {
    const result = await getFs().pickFolder();
    if (!result) {
      toast.warning("No folder selected");
      return;
    }
    settingsStore.setSaveFolder(result.path, result.uri);
    selected.value = true;
  } catch (error) {
    toast.error("Failed to select folder. Please try again.");
  }
}
</script>

<template>
  <div
    class="size-full h-screen flex flex-col justify-center items-center gap-3"
  >
    <div
      class="flex flex-col gap-3 p-3 rounded-full justify-center items-center"
    >
      <div class="flex flex-col gap-3 items-center justify-center">
        <div
          class="flex gap-3 p-3 rounded-full bg-secondary items-center justify-center"
        >
          <Icon icon="lucide:folder" class="size-10 opacity-80" />
        </div>
        <div class="flex flex-col gap-1 text-center">
          <h1 class="text-2xl font-bold">Select a folder</h1>
          <p class="text-sm text-muted-foreground">
            This is the folder where the acquired data files will be saved.
          </p>
        </div>
      </div>

      <div class="mt-10 w-full space-y-3">
        <Input
          class="w-full"
          placeholder="Select a folder"
          disabled
          :value="settingsStore.saveFolderPath"
        />
        <Button class="w-full" variant="outline" @click="selectFolder"
          >Select</Button
        >
        <Button class="mt-4 w-full" :disabled="!selected" @click="emit('next')"
          >Next</Button
        >
      </div>
    </div>
  </div>
</template>
