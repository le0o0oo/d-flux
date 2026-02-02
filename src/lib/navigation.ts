import { shallowRef } from "vue";
import type { Component } from "vue";
import MainDash from "@/components/views/MainDash.vue";

export const currentView = shallowRef<Component>(MainDash);

export function setView(view: Component) {
  currentView.value = view;
}
