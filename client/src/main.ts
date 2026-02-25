import { createApp } from "vue";
import { createPinia } from "pinia";
import { addCollection } from "@iconify/vue";
import lucideIcons from "@iconify-json/lucide/icons.json";
import mdiIcons from "@iconify-json/mdi/icons.json";
import materialSymbolsIcons from "@iconify-json/material-symbols/icons.json";
import App from "./App.vue";
import "./styles/globals.css";

const pinia = createPinia();
type IconifyCollection = Parameters<typeof addCollection>[0];

const registerCollection = (icons: unknown) =>
  addCollection(icons as IconifyCollection);

registerCollection(lucideIcons);
registerCollection(mdiIcons);
registerCollection(materialSymbolsIcons);

createApp(App).use(pinia).mount("#app");
