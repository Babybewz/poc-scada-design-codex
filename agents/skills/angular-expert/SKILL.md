---
name: angular-expert
description: Expert Angular engineering guidance for Angular 21 standalone applications. Use when building or modifying Angular components, services, models, routing, Signals state, RxJS streams, Angular CDK DragDrop, forms, svg-pan-zoom integrations, frontend UI behavior, production TypeScript, build/test verification, or project architecture in this repository.
---

# Angular Expert

## Core Principle

Build Angular features with modern standalone APIs, Signals-first local state, production-quality TypeScript, and minimal changes that respect the current project architecture.

For this repository, treat Angular as the application orchestration layer for SCADA Designer behavior: state, interaction, realtime streams, persistence, and UI composition. Keep SVG assets and SCADA symbol graphics designer-owned unless the user explicitly asks to create or edit SVG assets.

## Project Defaults

Prefer these patterns unless the existing file clearly uses another convention:

- Standalone components with `ChangeDetectionStrategy.OnPush`
- Angular control flow: `@if`, `@for`, `@switch`
- `inject()` for dependency injection
- Signals for component and service state
- RxJS for realtime streams, timers, HTTP pipelines, and event streams
- Typed models in `models/`
- Reusable services in `services/`
- Feature components under `components/`
- `apply_patch` for code edits

Avoid unnecessary NgModules, broad refactors, jQuery, direct `document` access in components, and new global libraries unless they are already part of the project or explicitly requested.

## Workflow

1. Inspect `package.json` and touched files before changing code.
2. Follow existing folder structure and naming.
3. Keep edits scoped to the requested behavior.
4. Use Signals or computed state for UI state that Angular templates consume.
5. Use RxJS streams for timed/realtime data and bridge to Signals only when it simplifies templates.
6. Isolate DOM-heavy behavior in services or narrow integration components.
7. Run `npm.cmd run build` after Angular/TypeScript/template/CSS changes.

## Component Guidance

Use standalone component metadata:

```ts
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class FeatureComponent {}
```

Keep templates declarative. Avoid expensive method calls inside repeated template bindings when a `computed()` signal can express the same result.

For drag/drop interactions, prefer Angular CDK DragDrop. Disable sorting for canvas-like drop zones when the layout should not reorder existing objects:

```html
<section cdkDropList [cdkDropListSortingDisabled]="true"></section>
```

## Signals And RxJS

Use Signals for local mutable state:

```ts
readonly selectedId = signal<string | null>(null);
readonly selectedItem = computed(() =>
  this.items().find((item) => item.id === this.selectedId()) ?? null,
);
```

Use RxJS for realtime streams:

```ts
readonly points$ = interval(2000).pipe(
  map(() => this.nextTelemetry()),
  shareReplay({ bufferSize: 1, refCount: true }),
);
```

When an `effect()` calls code that reads or writes other Signals indirectly, use `untracked()` to avoid accidental feedback loops.

## DOM And Third-Party Integrations

Keep direct DOM access inside dedicated services or integration components. Use `ElementRef` only where a library requires a host element. Clean up global listeners and third-party instances with `DestroyRef`.

For `svg-pan-zoom`:

- Initialize after the SVG host is rendered.
- Destroy the previous instance before replacing SVG content.
- Sync pan/zoom to Signals only from `onPan` and `onZoom` callbacks.
- Avoid bidirectional effects that can trigger pan/zoom loops.

## UI And CSS

Preserve the SCADA Designer layout:

- Left palette/sidebar
- Center canvas
- Right property panel
- Optional minimap in sidebar

Use stable dimensions for fixed-format UI such as canvas overlays, minimap, toolbars, handles, ports, and symbol bounding boxes. Prefer local class changes over broad CSS resets.

When editing canvas behavior, ensure selection, drag, resize, connector drawing, minimap rendering, and save/load JSON still work together.

## Verification

After code changes, run:

```powershell
npm.cmd run build
```

If tests or lint scripts are added later, run those too. Report any command that could not be run and why.
