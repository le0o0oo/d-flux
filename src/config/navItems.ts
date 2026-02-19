import type { Component } from "vue";

import AnalyzeView from "@/components/views/AnalyzeView/AnalyzeView.vue";
import Console from "@/components/views/Console.vue";
import Map from "@/components/views/Map.vue";

interface NavItem {
  title: string;
  icon: string;
  component?: Component;
  items?: NavItem[];
}

export default [
  {
    title: "Analyze",
    icon: "lucide:braces",
    component: AnalyzeView,
  },
  {
    title: "Console",
    icon: "lucide:terminal",
    component: Console,
  },
  {
    title: "Map",
    icon: "lucide:map",
    component: Map,
  },
] as NavItem[];
