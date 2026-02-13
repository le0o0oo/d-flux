import { platform } from "@tauri-apps/plugin-os";

const currentPlatform = platform();

export default {
  manufacturerId: 46878,
  isOnMobile: currentPlatform === "android" || currentPlatform === "ios",
  isMockMode: import.meta.env.VITE_USE_MOCK === "true",
};
