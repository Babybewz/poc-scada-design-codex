---
name: scada-svg-expert
description: Expert guidance for Angular SCADA and industrial monitoring viewer applications that use designer-exported SVG files as the source of truth. Use when building or modifying SCADA-style monitoring screens, SVG plant layouts, realtime tag updates, valve/pump/flow/pressure indicators, alarm visualization, Angular Signals/RxJS/WebSocket/SignalR data binding, or reusable SvgDomService/ScadaService/AlarmService architectures. Avoid diagram/editor libraries unless explicitly requested.
---

# SCADA SVG Expert

## Core Principle

Treat designer-exported SVG as the source of truth. Build a SCADA Viewer, not a Diagram Editor.

Do not introduce GoJS, X6, JointJS, Drawflow, React Flow, Fabric.js, or Konva.js unless the user explicitly requests one of them.

## Responsibility Split

Use Angular for:

- Data binding
- Interaction
- State management
- Realtime updates
- Alarm orchestration

Use SVG for:

- Layout
- Shapes
- Visual design
- Designer-owned ids and grouping

Never recreate SVG graphics using TypeScript. Do not generate valves, pumps, pipes, labels, or process equipment from Angular code when they already belong in the SVG asset.

## SVG Access Rules

Always reference SVG elements by stable ids. Prefer direct operational ids such as:

```text
VALVE_001
PUMP_001
FLOW_001
PRESSURE_001
```

Prefer id-based updates over broad CSS selectors. Keep ids as the contract between the designer-exported SVG and Angular.

Limit runtime SVG mutations to:

- `fill`
- `stroke`
- `textContent`
- tightly scoped classes for alarm/highlight effects when needed

## Realtime Data

Expect realtime data through WebSocket, SignalR, RxJS streams, or simulated RxJS streams for POCs. Prefer Angular Signals for local UI state and RxJS for streaming transport and timing.

For Angular implementations, prefer reusable services:

- `SvgDomService` for DOM-safe SVG element lookup and mutation
- `ScadaService` for realtime tag streams and snapshots
- `AlarmService` for alarm state, blinking, acknowledgement, and severity rules

Keep direct document access out of components. If DOM interaction is needed, isolate it in the dedicated SVG DOM service and use Angular-safe APIs such as `Renderer2`, `ElementRef`, `DomSanitizer`, and lifecycle cleanup.

## Viewer, Not Editor

SCADA Viewer features are in scope:

- Display designer SVG
- Update existing SVG elements
- Click known assets by id
- Alarm visualization
- Realtime monitoring
- Zoom and pan for viewing

Diagram Editor features are out of scope unless explicitly requested:

- Drag and drop layout editing
- Drawing connections
- Creating shapes
- Editing plant layout geometry
- Persisting graph models
- Shape palettes and connector routing

When requirements are ambiguous, choose the viewer interpretation and keep the SVG designer-driven.
