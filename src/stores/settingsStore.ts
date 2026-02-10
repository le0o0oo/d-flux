// stores/counter.js
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { documentDir, join } from '@tauri-apps/api/path';
import { exists, mkdir } from '@tauri-apps/plugin-fs';

const saveFolderPath = useStorage("saveFolderPath", "");

async function init() {
  if (!saveFolderPath.value || saveFolderPath.value === "" || !await exists(saveFolderPath.value)) {
    const documentPath = await documentDir();
    const savePath = await join(documentPath, "Measurements");
    if (await exists(savePath)) return;

    await mkdir(savePath)
    saveFolderPath.value = savePath;
  }
}

init();

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    saveFolderPath: saveFolderPath
  }),
  actions: {
    setSaveFolderPath(path: string) {
      this.saveFolderPath = path;
    }
  },
})