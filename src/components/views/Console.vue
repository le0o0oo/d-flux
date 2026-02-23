<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { toast } from "vue-sonner";
import { ProtocolCommandType } from "@/services/ProtocolParser";
import { useConnectionStore } from "@/stores/connectionStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const connectionStore = useConnectionStore();

const sending = ref(false);
const selectedCommand = ref<ProtocolCommandType>(
  ProtocolCommandType.GET_ACQUISITION_STATE,
);
const commandPayload = ref("");
const rawPayload = ref("");
const appendNewlineMode = ref<"append" | "none">("append");
const logViewport = ref<HTMLElement | null>(null);

const statusLabel = computed(() => {
  switch (connectionStore.status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
});

const consoleLines = computed(() => connectionStore.console ?? []);
const isConnected = computed(() => connectionStore.isConnected);

const commandOptions = [
  ProtocolCommandType.START_ACQUISITION,
  ProtocolCommandType.STOP_ACQUISITION,
  ProtocolCommandType.GET_ACQUISITION_STATE,
  ProtocolCommandType.WHOIS,
  ProtocolCommandType.DISCONNECT,
  ProtocolCommandType.GET_SETTINGS,
  ProtocolCommandType.SET_SETTINGS,
];
const appendNewline = computed(() => appendNewlineMode.value === "append");

async function scrollLogsToBottom() {
  await nextTick();
  if (logViewport.value) {
    logViewport.value.scrollTop = logViewport.value.scrollHeight;
  }
}

watch(
  () => consoleLines.value.length,
  () => {
    void scrollLogsToBottom();
  },
);

function lineClass(line: string) {
  if (line.includes("ERROR")) return "text-destructive";
  if (line.includes("DATA")) return "text-emerald-500";
  if (line.includes("ACQUISITION_STATE")) return "text-primary";
  if (line.startsWith("TX:")) return "text-blue-500";
  return "text-foreground";
}

async function sendSelectedCommand() {
  if (!isConnected.value) return;
  sending.value = true;
  try {
    const payload = commandPayload.value.trim();
    await connectionStore.sendCommand(
      selectedCommand.value,
      payload || undefined,
    );
    // connectionStore.console.push(
    //   `TX: ${selectedCommand.value}${payload ? ` ${payload}` : ""}`
    // );
    commandPayload.value = "";
  } catch (err) {
    toast.error("Failed to send command");
    console.error(err);
  } finally {
    sending.value = false;
  }
}

async function sendRawData() {
  if (!isConnected.value) return;
  const payload = rawPayload.value.trim();
  if (!payload) return;

  sending.value = true;
  try {
    await connectionStore.sendRaw(payload, appendNewline.value);
    //connectionStore.console.push(`TX: ${payload}${appendNewline.value ? "\\n" : ""}`);
    rawPayload.value = "";
  } catch (err) {
    toast.error("Failed to send raw data");
    console.error(err);
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="grid min-w-0 gap-3 md:gap-4 lg:grid-cols-[320px_1fr]">
    <Card class="h-fit border-muted/60">
      <CardHeader class="pb-2">
        <CardTitle class="flex items-center justify-between gap-2 text-base">
          Console
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground">Command</p>
          <div class="grid gap-2">
            <Select
              v-model="selectedCommand"
              :disabled="!isConnected || sending"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Select command" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in commandOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              v-model="commandPayload"
              :disabled="!isConnected || sending"
              placeholder="Optional payload"
              @keydown.enter="sendSelectedCommand"
            />
            <Button
              :disabled="!isConnected || sending"
              @click="sendSelectedCommand"
            >
              Send
            </Button>
          </div>
        </div>

        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground">Raw data</p>
          <Input
            v-model="rawPayload"
            :disabled="!isConnected || sending"
            placeholder="e.g. CUSTOM_CMD foo=123"
            @keydown.enter="sendRawData"
          />
          <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select
              v-model="appendNewlineMode"
              :disabled="!isConnected || sending"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Line ending" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="append">Append \n</SelectItem>
                <SelectItem value="none">No newline</SelectItem>
              </SelectContent>
            </Select>
            <Button :disabled="!isConnected || sending" @click="sendRawData">
              Send Raw
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="border-muted/60">
      <CardHeader class="pb-2">
        <CardTitle class="flex items-center justify-between">
          Device Console
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-muted-foreground"
              >{{ consoleLines.length }} lines</span
            >
            <Button
              variant="outline"
              size="sm"
              @click="connectionStore.clearConsole()"
            >
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-0">
        <div
          ref="logViewport"
          class="h-[52svh] overflow-y-auto rounded-md border bg-muted/20 p-2.5 font-mono text-xs md:h-[62svh]"
        >
          <div v-if="consoleLines.length === 0" class="text-muted-foreground">
            No messages yet. Connect a device and send a command.
          </div>
          <div
            v-for="(line, index) in consoleLines"
            :key="`${index}-${line}`"
            class="flex gap-2 py-0.5"
          >
            <span class="w-8 shrink-0 text-right text-muted-foreground/80">{{
              index + 1
            }}</span>
            <span class="break-all" :class="lineClass(line)">
              {{ line }}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
