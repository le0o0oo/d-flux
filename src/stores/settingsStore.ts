import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { getFs, type AndroidFsUri } from "@/services/filesystem";

const saveFolderPath = useStorage("saveFolderPath", "");
const saveFolderUri = useStorage<AndroidFsUri | null>("saveFolderUri", null);
const doneFirstSetup = useStorage("doneFirstSetup", false);

async function init() {
  const folder = await getFs().initDefaultFolder({
    path: saveFolderPath.value,
    uri: saveFolderUri.value,
  });
  saveFolderPath.value = folder.path;
  saveFolderUri.value = folder.uri;
}

init();

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    saveFolderPath: saveFolderPath,
    saveFolderUri: saveFolderUri,
    doneFirstSetup: doneFirstSetup,
  }),
  actions: {
    setSaveFolderPath(path: string, uri: AndroidFsUri | null = null) {
      this.saveFolderPath = path;
      this.saveFolderUri = uri;
    },
  },
});
