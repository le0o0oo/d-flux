import type { Component } from "vue";

import MainDash from "@/components/views/MainDash.vue";
import CO2Monitor from "@/components/views/CO2Monitor.vue";

interface NavItem {
  title: string;
  icon: string;
  component?: Component;
  items?: NavItem[];
}

export default [
  {
    title: "Dashboard",
    icon: "lucide:gauge",
    component: MainDash,
  },
  {
    title: "CO2 Monitor",
    icon: "material-symbols:co2-rounded",
    component: CO2Monitor,
  },
] as NavItem[];
