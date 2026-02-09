import type { Component } from "vue";

import CO2Monitor from "@/components/views/CO2Monitor.vue";
import AnalyzeView from "@/components/views/AnalyzeView/AnalyzeView.vue";
import Console from "@/components/views/Console.vue";

interface NavItem {
  title: string;
  icon: string;
  component?: Component;
  items?: NavItem[];
}

export default [
  {
    title: "Analyze",
    icon: "lucide:chart-spline",
    component: AnalyzeView,
  },
  {
    title: "Console",
    icon: "lucide:terminal",
    component: Console,
  },
] as NavItem[];
