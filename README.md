# SCADA Designer

Angular 21 standalone proof of concept for an industrial SCADA HMI designer. It demonstrates that Angular, SVG, Angular CDK Drag & Drop, Signals, RxJS, and `svg-pan-zoom` can cover SCADA-style plant monitoring and layout design without GoJS, JointJS, X6, Fabric.js, or Konva.

This is not BPMN, a workflow editor, or a generic flowchart designer. It is a dark industrial HMI designer inspired by SCADA tools such as Ignition Perspective, Siemens WinCC, Wonderware, and Draw.io-style industrial symbol palettes.

## Run

```bash
npm install
npm start
```

On this Windows machine, use `npm.cmd start` if PowerShell blocks npm scripts.

## Architecture

```text
src/app/scada-designer/
├─ components/
│  ├─ palette/
│  ├─ canvas/
│  ├─ property-panel/
│  └─ toolbar/
├─ services/
│  ├─ svg-loader.service.ts
│  ├─ svg-dom.service.ts
│  ├─ layout.service.ts
│  └─ scada.service.ts
├─ models/
│  ├─ symbol.model.ts
│  └─ layout.model.ts
└─ scada-designer.component.ts
```

## What It Does

- Starts with an empty Draw.io-like canvas when no layout JSON is loaded.
- Can optionally load `assets/plant.svg` as a designer-authored plant background.
- Keeps any loaded SVG background as the source of truth for the plant mimic.
- Provides a Draw.io-like symbol palette with valve, pump, compressor, tank, sensor, pressure indicator, flow indicator, and text label symbols.
- Lets users upload custom SVG symbols into the symbol library.
- Loads built-in symbol groups from `assets/scada/symbols.json`.
- Renders the left symbol library by group, with `general` ordered first.
- Uses Angular CDK Drag & Drop to place symbols on the plant canvas.
- Stores uploaded symbol metadata as `{ id, name, svg }`.
- Stores placed symbols in memory as layout items with `id`, `assetId`, `type`, `x`, `y`, `width`, `height`, `rotation`, colors, label, and SVG markup.
- Lets the property panel update selected symbol properties immediately.
- Lets the property panel change fill, stroke, label, and label/text color independently.
- Lets users resize selected symbols directly on the canvas or by editing width/height.
- Lets users change label/text font size from the property panel.
- Toggles valve symbols between `OPEN` green and `CLOSED` red.
- Draws Draw.io-style orthogonal connectors from a source symbol port to a target symbol port.
- Supports click-to-connect or dragging from one symbol port and releasing on another port.
- Shows a dashed live connector preview while dragging from a port.
- Automatically updates connector paths when symbols move or resize.
- Simulates SCADA points every 2 seconds for pressure, flow, and temperature.
- Updates SVG text indicators by id where matching elements exist.
- Flashes alarm styles when pressure or temperature exceeds thresholds.
- Saves and restores the symbol library, overlay symbols, connectors, and properties as JSON.
- Supports pan and zoom through `svg-pan-zoom`.
- Shows a Figma-like minimap in the lower-left corner with symbols, connectors, and the current viewport.
- Deletes selected symbols or connectors from the property panel or with `Delete` / `Backspace`.

## Layer Model

```text
Background Layer   optional assets/plant.svg
Connection Layer   generated connector paths
Symbol Layer       user-placed SVG symbol overlays
```

When loaded, `plant.svg` remains the immutable plant background. User symbols and connectors are separate overlay layers that can be saved and restored independently.

## Symbol Groups

Built-in symbol assets live under:

```text
src/assets/scada/
├─ symbols.json
├─ general/
└─ basic/
```

Add new SVG files under a group folder and register them in `symbols.json`. The palette uses the manifest order; `general` is intentionally first.

## SVG-First Rule

`src/assets/plant.svg` is optional. A new design starts as an empty canvas. If the user loads a plant SVG, the application does not generate or replace that SVG. Angular only manages interactive overlay symbols, connectors, realtime bindings, selection, properties, and layout JSON.

Existing SVG indicators are updated by id, for example:

```text
PRESSURE_001
FLOW_001
```

If a designer supplies a different SVG, keep the SVG file as the contract and adjust bindings to its ids.
