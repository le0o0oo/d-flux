<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import { loadFluxData, type FluxRow } from "@/services/fluxCsvService";
import { useSettingsStore } from "@/stores/settingsStore";
import { Spinner } from "@/components/ui/spinner";

L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = "";

const settingsStore = useSettingsStore();
const mapContainer = ref<HTMLDivElement | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const pointCount = ref(0);
const isSatellite = ref(false);

let map: L.Map | null = null;
let markerGroup: L.LayerGroup | null = null;
let streetLayer: L.TileLayer | null = null;
let satelliteLayer: L.TileLayer | null = null;

function buildPopup(row: FluxRow): string {
  const date = new Date(row.date).toLocaleString();
  return `
    <div style="min-width:200px;font-size:13px;line-height:1.6">
      <strong style="font-size:14px">${date}</strong>
      <hr style="margin:4px 0;border-color:#e5e7eb"/>
      <div><b>Device:</b> ${row.sensorName}</div>
      <div><b>CO₂ Slope:</b> ${row.co2Slope} ppm/s</div>
      <div><b>CO₂ R²:</b> ${row.co2R2.toFixed(4)}</div>
      <div><b>CO₂ Multiplier:</b> ${row.co2Multiplier}</div>
      <div><b>CO₂ Offset:</b> ${row.co2Offset}</div>
      <div><b>CO₂:</b> ${row.co2Min} – ${row.co2Max} ppm</div>
      <div><b>Temp:</b> ${row.tempMin} – ${row.tempMax} °C</div>
      <div><b>Humidity:</b> ${row.humMin} – ${row.humMax} %</div>
      <hr style="margin:4px 0;border-color:#e5e7eb"/>
      <div style="color:#6b7280;font-size:11px">
        ${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}
      </div>
    </div>
  `;
}

function slopeColor(slope: number): string {
  if (slope > 0) return "#ef4444";
  if (slope < -0.5) return "#22c55e";
  return "#f59e0b";
}

const DOT_SIZE = 18;

function makeDotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [DOT_SIZE, DOT_SIZE],
    iconAnchor: [DOT_SIZE / 2, DOT_SIZE / 2],
    popupAnchor: [0, -DOT_SIZE / 2],
    html: `<div style="
      width:${DOT_SIZE}px;height:${DOT_SIZE}px;
      border-radius:50%;
      background:${color};
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    "></div>`,
  });
}

async function loadPoints() {
  if (!map) return;

  if (!settingsStore.saveFolderPath) {
    error.value = "Save folder not configured - set it in Settings.";
    return;
  }

  const folder = {
    path: settingsStore.saveFolderPath,
    uri: settingsStore.saveFolderUri,
  };

  loading.value = true;
  error.value = null;

  try {
    const rows = await loadFluxData(folder);
    pointCount.value = rows.length;

    if (markerGroup) markerGroup.clearLayers();

    if (rows.length === 0) {
      error.value = "No flux data points saved yet.";
      return;
    }

    const bounds: L.LatLngExpression[] = [];

    for (const row of rows) {
      const latlng: L.LatLngExpression = [row.latitude, row.longitude];
      bounds.push(latlng);

      const icon = makeDotIcon(slopeColor(row.co2Slope));

      const marker = L.marker(latlng, { icon }).bindPopup(buildPopup(row), {
        maxWidth: 280,
      });

      markerGroup!.addLayer(marker);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0] as L.LatLngExpression, 15);
    } else {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  } catch (err: any) {
    error.value = err?.message ?? "Failed to load flux data";
    console.error("Map: loadPoints error", err);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!mapContainer.value) return;

  map = L.map(mapContainer.value, {
    center: [48.2, 16.37],
    zoom: 5,
    zoomControl: true,
  });

  streetLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    },
  ).addTo(map);

  satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19,
    },
  );

  markerGroup = L.layerGroup().addTo(map);

  await nextTick();
  map.invalidateSize();

  loadPoints();
});

watch(() => settingsStore.saveFolderPath, loadPoints);

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

function toggleMapLayer() {
  if (!map || !streetLayer || !satelliteLayer) return;
  isSatellite.value = !isSatellite.value;
  if (isSatellite.value) {
    map.removeLayer(streetLayer);
    map.addLayer(satelliteLayer);
  } else {
    map.removeLayer(satelliteLayer);
    map.addLayer(streetLayer);
  }
}
</script>

<template>
  <div class="relative w-full min-h-[400px] h-full">
    <div ref="mapContainer" class="absolute inset-0 z-0 rounded-lg" />

    <div
      v-if="loading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg"
    >
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner class="w-4 h-4" />
        <span>Loading flux data…</span>
      </div>
    </div>

    <div
      v-if="error && !loading"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-background/90 border rounded-lg px-4 py-2 text-sm text-muted-foreground shadow-sm"
    >
      {{ error }}
    </div>

    <button
      class="absolute bottom-3 right-3 z-10 bg-background/90 border rounded-lg px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-accent transition-colors cursor-pointer"
      @click="loadPoints"
    >
      ↻ Reload ({{ pointCount }} points)
    </button>

    <button
      class="absolute bottom-3 left-3 z-10 bg-background/90 border rounded-lg px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-accent transition-colors cursor-pointer"
      @click="toggleMapLayer"
    >
      {{ isSatellite ? "🛰️ Satellite" : "🗺️ Street" }}
    </button>
  </div>
</template>

<style scoped>
/* Undo Tailwind preflight resets that break Leaflet rendering */
:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-container) img,
:deep(.leaflet-container) svg {
  max-width: none !important;
  max-height: none !important;
  display: inline !important;
}

:deep(.leaflet-pane),
:deep(.leaflet-tile),
:deep(.leaflet-marker-icon),
:deep(.leaflet-marker-shadow),
:deep(.leaflet-tile-container),
:deep(.leaflet-overlay-pane svg),
:deep(.leaflet-zoom-box) {
  position: absolute;
  left: 0;
  top: 0;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
}

:deep(.leaflet-control-container .leaflet-control) {
  border: 2px solid rgba(0, 0, 0, 0.2);
  background-clip: padding-box;
}

:deep(.leaflet-pane) {
  z-index: 1;
}

:deep(.leaflet-map-pane) {
  z-index: 1;
}

:deep(.leaflet-tile-pane) {
  z-index: 1;
}

:deep(.leaflet-control-container) {
  z-index: 1000 !important;
}

:deep(.leaflet-control-zoom) {
  z-index: 1000 !important;
  background: white !important;
  position: relative !important;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.65) !important;
  border-radius: 4px !important;
}

:deep(.leaflet-control-zoom-in),
:deep(.leaflet-control-zoom-out) {
  background: white !important;
  color: black !important;
  display: block !important;
  width: 30px !important;
  height: 30px !important;
  line-height: 30px !important;
  text-align: center !important;
  text-decoration: none !important;
  font-size: 22px !important;
  font-weight: bold !important;
}

:deep(.leaflet-top),
:deep(.leaflet-bottom) {
  z-index: 1000 !important;
  position: absolute;
  pointer-events: none;
}

:deep(.leaflet-top .leaflet-control),
:deep(.leaflet-bottom .leaflet-control) {
  pointer-events: auto;
  position: relative;
  clear: both;
  margin-top: 10px;
}
</style>
