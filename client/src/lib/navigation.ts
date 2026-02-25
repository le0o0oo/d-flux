import { shallowRef } from "vue";
import type { Component } from "vue";
import AnalyzeView from "@/components/views/AnalyzeView/AnalyzeView.vue";

export const currentView = shallowRef<Component>(AnalyzeView);

export function setView(view: Component) {
  currentView.value = view;
}
