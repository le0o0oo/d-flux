# Architecture

A Tauri 2 + Vue 3 cross-platform app (desktop + Android) that connects to BLE sensor devices, streams CO2/temperature/humidity data in real time, and exports measurements to CSV.

---

## Directory structure

```
src/
├── App.vue                          # Root component, screen routing, setup flow
├── main.ts                          # Vue + Pinia bootstrap, icon registration
│
├── config/
│   ├── config.ts                    # Platform flags (isOnMobile, isMockMode), manufacturer ID
│   └── navItems.ts                  # Sidebar navigation items (Analyze, Console)
│
├── lib/
│   ├── navigation.ts                # currentView ref + setView() for in-app view switching
│   └── utils.ts                     # cn() helper (clsx + tailwind-merge)
│
├── stores/                          # Pinia stores
│   ├── appStore.ts                  # Current screen: connection | main | setup
│   ├── connectionStore.ts           # BLE connection lifecycle, send/receive, console log
│   ├── measurementStore.ts          # Sensor data, acquisition state, CSV export
│   └── settingsStore.ts             # Save folder path/URI, first-setup flag
│
├── services/                        # Platform-agnostic service layer
│   ├── transport.ts                 # BleTransport + ScanProvider interfaces, factory
│   ├── realBleTransport.ts          # Real BLE implementation (@mnlphlp/plugin-blec)
│   ├── mockBleTransport.ts          # Mock BLE with fake data streaming
│   ├── bleConstants.ts              # Shared BLE constants (service UUID, normalizeUuid)
│   ├── filesystem.ts                # FsService interface, desktop + Android implementations
│   ├── measurementCsvService.ts     # CSV building and export (delegates to FsService)
│   └── ProtocolParser.ts            # Line protocol parser (DATA, WHOIS, ACQUISITION_STATE)
│
├── composables/
│   └── useBleScanner.ts             # BLE scan composable, device filtering + metadata parsing
│
├── components/
│   ├── TitleBar.vue                 # Desktop window controls (minimize, maximize, close)
│   ├── DashboardView.vue            # Main layout: sidebar + content area + acquisition toggle
│   ├── ModeToggle.vue               # Light/dark theme switcher
│   │
│   ├── Navbar/
│   │   ├── AppSidebar.vue           # Sidebar shell: nav items + connection status
│   │   └── NavMain.vue              # Sidebar nav item rendering, view switching
│   │
│   ├── ConnectionViews/
│   │   ├── Scanner.vue              # BLE device scanner UI with connect button
│   │   └── ConnectStatus.vue        # Connection status card in sidebar
│   │
│   ├── setup/                       # Android first-run setup flow
│   │   ├── SetupFlow.vue            # Step orchestrator (folder -> permissions)
│   │   ├── FolderSetup.vue          # Save folder picker
│   │   └── PermissionsSetup.vue     # BLE + location permission grants
│   │
│   ├── views/
│   │   ├── Settings.vue             # Appearance + save folder settings
│   │   ├── Console.vue              # Raw protocol command console
│   │   └── AnalyzeView/
│   │       ├── AnalyzeView.vue      # Wrapper (renders DataView)
│   │       ├── DataView.vue         # Chart toolbar, chart cards, delete/regression tools
│   │       ├── DataCard.vue         # Single metric chart (CO2, temp, or humidity)
│   │       └── DataTables.vue       # Tabular data view
│   │
│   └── ui/                          # shadcn/vue primitives (reka-ui based), not app-specific
│
├── styles/
│   └── globals.css                  # Tailwind v4 config, CSS variables, scrollbar styles
│
└── assets/
    └── vue.svg
```

The Tauri backend lives in `src-tauri/` and is minimal -- it registers plugins (BLE, filesystem, dialog, geolocation, Android FS, OS info) and has no custom Rust commands.

---

## Screen flow

The app has three top-level screens managed by `appStore.currentScreen`:

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.vue                                 │
│                                                                 │
│  currentScreen = "setup"      (Android first-run only)          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SetupFlow: FolderSetup -> PermissionsSetup -> done       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  currentScreen = "connection"  (default)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Scanner.vue: scan for BLE devices, tap to connect        │  │
│  │  + settings dialog (folder picker)                        │  │
│  │  + connecting overlay with spinner                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼  (on successful connect)             │
│  currentScreen = "main"                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  DashboardView: sidebar + content                         │  │
│  │  ├── AppSidebar: nav items + ConnectStatus                │  │
│  │  └── <component :is="currentView" />                      │  │
│  │       ├── AnalyzeView (charts, data cards)                │  │
│  │       ├── Console (raw protocol commands)                 │  │
│  │       └── Settings (appearance, save folder)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

There is no Vue Router. View switching within the dashboard uses a `shallowRef` in `lib/navigation.ts` and `<component :is="currentView" />`. The sidebar nav items and Settings button call `setView(component)`.

---

## BLE transport layer

Device communication is abstracted behind two interfaces defined in `services/transport.ts`:

```
┌──────────────────────────────────────────────────────────┐
│                    connectionStore                        │
│  connectToDevice(), sendRaw(), disconnect()               │
│  Delegates to transport, knows nothing about mock/real    │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  BleTransport    │  (interface)
         │  connect()       │
         │  send()          │
         │  disconnect()    │
         └────────┬────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────┐   ┌────────────────┐
│ RealBle       │   │ MockBle        │
│ Transport     │   │ Transport      │
│               │   │                │
│ plugin-blec:  │   │ Fake WHOIS,    │
│ bleConnect,   │   │ random DATA    │
│ sendString,   │   │ on interval,   │
│ subscribeStr  │   │ responds to    │
│ listServices  │   │ START/STOP     │
└───────────────┘   └────────────────┘
```

```
┌──────────────────────────────────────────────────────────┐
│                   useBleScanner                           │
│  runScan(), devices (computed), scanning                  │
│  Delegates to scanner, filters by service UUID            │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  ScanProvider    │  (interface)
         │  scan()          │
         └────────┬────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────┐   ┌────────────────┐
│ RealScan      │   │ MockScan       │
│ Provider      │   │ Provider       │
│ startScan()   │   │ Returns 2 fake │
│ from plugin   │   │ devices after  │
│               │   │ 350ms delay    │
└───────────────┘   └────────────────┘
```

The factory in `transport.ts` reads `config.isMockMode` (from `VITE_USE_MOCK` env var) and creates the appropriate singleton. Set `VITE_USE_MOCK=true` in `.env` to develop without a real BLE device.

---

## Data flow

```
BLE device  ──(notify)──>  RealBleTransport.onData
                                    │
                                    ▼
                          connectionStore.handleIncomingData()
                          ├── buffer accumulation + line splitting
                          ├── push to console[]
                          └── measurementStore.ingestLine(line)
                                    │
                                    ▼
                          ProtocolParser.parseLine(line)
                          ├── DATA -> parseDataPayload -> push to data[]
                          │          (if acquiring, also push to currentSessionData[])
                          ├── ACQUISITION_STATE 0/1 -> toggle acquisition
                          │          (on stop: save currentSessionData to CSV)
                          ├── WHOIS -> set sensor name
                          └── ERROR -> log
```

### Acquisition & CSV export

1. User taps **Start** -> `connectionStore.sendCommand(START_ACQUISITION)` -> transport sends the command
2. Device responds with `ACQUISITION_STATE 1` -> `measurementStore` begins collecting into `currentSessionData`
3. `DATA` lines arrive and accumulate
4. User taps **Stop** -> sends `STOP_ACQUISITION`
5. Device responds `ACQUISITION_STATE 0` -> `measurementStore.applyAcquisitionState(false)` triggers `saveRowsToCsv()`
6. `measurementCsvService.saveMeasurementsCsv()` builds CSV content and calls `getFs().saveTextFile()` to write it

---

## Filesystem abstraction

Platform-specific file operations are behind `FsService` in `services/filesystem.ts`:

| Operation             | Desktop                                           | Android                                            |
| --------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `saveTextFile()`      | `@tauri-apps/plugin-fs` with auto-dedup filenames | `AndroidFs.createNewPublicFile` / `createNewFile`  |
| `pickFolder()`        | `@tauri-apps/plugin-dialog` `open()`              | `AndroidFs.showOpenDirPicker` + persist permission |
| `initDefaultFolder()` | `~/Documents/Measurements`, create if missing     | Default to `Documents` public dir, validate URI    |

The factory `getFs()` returns the right implementation based on `platform()`. All consumers (`measurementCsvService`, `settingsStore`, `Settings.vue`, `FolderSetup.vue`) call through this abstraction with no platform checks.

---

## Protocol format

The BLE device uses a simple line-based text protocol:

**Device -> App (notifications):**

```
WHOIS ID=<id>;NAME=<name>;ORG=<org>;FW=<version>
DATA CO2=<ppm>;TMP=<celsius>;HUM=<percent>
ACQUISITION_STATE <0|1>
ERROR <message>
```

**App -> Device (commands):**

```
START_ACQUISITION
STOP_ACQUISITION
GET_ACQUISITION_STATE
```

Parsed by `ProtocolParser` (static methods, no state).

---

## State management

Four Pinia stores:

| Store              | Responsibility                                                      |
| ------------------ | ------------------------------------------------------------------- |
| `appStore`         | Current screen (`connection`, `main`, `setup`)                      |
| `connectionStore`  | BLE connection lifecycle, send/receive buffering, console log       |
| `measurementStore` | Sensor data array, acquisition state, CSV export orchestration      |
| `settingsStore`    | Persisted save folder path/URI, first-setup flag (via `useStorage`) |

---

## Key dependencies

| Package                          | Role                                              |
| -------------------------------- | ------------------------------------------------- |
| `@mnlphlp/plugin-blec`           | Tauri BLE plugin (scan, connect, send, subscribe) |
| `@tauri-apps/plugin-fs`          | Desktop filesystem (read, write, mkdir, exists)   |
| `tauri-plugin-android-fs-api`    | Android SAF / MediaStore filesystem access        |
| `@tauri-apps/plugin-dialog`      | Native folder picker (desktop)                    |
| `@tauri-apps/plugin-os`          | Platform detection                                |
| `@tauri-apps/plugin-geolocation` | Location permission (required for BLE on Android) |
| `@unovis/vue`                    | Chart components (line charts, brush selection)   |
| `reka-ui`                        | Headless UI primitives (shadcn/vue foundation)    |
| `pinia`                          | State management                                  |
| `vue-sonner`                     | Toast notifications                               |
| `papaparse`                      | CSV parsing (used in data tables)                 |
