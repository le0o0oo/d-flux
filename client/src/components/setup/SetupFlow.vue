<script setup lang="ts">
import { ref } from "vue";
import FolderSetup from "./FolderSetup.vue";
import PermissionsSetup from "./PermissionsSetup.vue";

const emit = defineEmits<{
  (e: "done"): void;
}>();

const props = defineProps<{
  startFrom?: "folder" | "permissions";
}>();

const currentStep = ref<"folder" | "permissions">("folder");

if (props.startFrom) {
  currentStep.value = props.startFrom;
}

function handleNext(from: "folder" | "permissions") {
  if (from === "folder") {
    if(!props.startFrom) currentStep.value = "permissions";
    else emit("done")
  } else {
    emit("done");
  }
}
</script>

<template>
  <div class="size-full">
    <FolderSetup
      v-if="currentStep === 'folder'"
      @next="handleNext('folder')"
    />
    <PermissionsSetup
      v-else-if="currentStep === 'permissions'"
      @next="handleNext('permissions')"
    />
  </div>
</template>
