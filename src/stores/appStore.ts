import { defineStore } from "pinia";
import { ref } from "vue";

export type AppScreen = "connection" | "main" | "setup";

export const useAppStore = defineStore("app", () => {
  const currentScreen = ref<AppScreen>("connection");

  function setScreen(screen: AppScreen) {
    currentScreen.value = screen;
  }

  return {
    currentScreen,
    setScreen,
  };
});
