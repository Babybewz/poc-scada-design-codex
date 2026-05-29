import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SafeHtml } from '@angular/platform-browser';
import svgPanZoom, { SvgPanZoomInstance } from 'svg-pan-zoom';

import { AlarmService } from './alarm.service';
import { AlarmState, RealtimeFrame, TagSnapshot, ValveId, ValveStatus } from './scada.models';
import { RealtimeSimulationService } from './realtime-simulation.service';
import { SvgDomService } from './svg-dom.service';
import { SvgLoaderService } from './svg-loader.service';

const VALVE_OPEN = '#00ff66';
const VALVE_CLOSED = '#ff3030';
const NORMAL_GREEN = '#00ff66';
const ALARM_RED = '#ff2020';
const PIPE_YELLOW = '#ffd21a';

@Component({
  selector: 'app-scada-viewer',
  standalone: true,
  providers: [SvgDomService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <main class="scada-screen">
      <section class="scada-toolbar" aria-label="SCADA header">
        <div>
          <p>GAS PIPELINE MONITORING HMI</p>
          <h1>NG Transmission Station A</h1>
        </div>

        <div class="scada-toolbar__status" [class.scada-toolbar__status--alarm]="alarm().active">
          {{ alarm().message }}
        </div>

        <div class="scada-toolbar__buttons">
          <button type="button" (click)="zoomIn()" title="Zoom in">+</button>
          <button type="button" (click)="zoomOut()" title="Zoom out">-</button>
          <button type="button" (click)="resetView()" title="Reset view">RESET</button>
        </div>
      </section>

      <section class="scada-workspace">
        <div class="scada-svg-host" #svgHost [innerHTML]="svgContent()" (click)="handleSvgClick($event)"></div>

        <aside class="scada-side-panel" aria-label="Realtime values">
          <h2>LIVE PROCESS VALUES</h2>
          @for (tag of tagSnapshots(); track tag.id) {
            <div class="scada-tag" [class.scada-tag--alarm]="tag.alarm">
              <span>{{ tag.label }}</span>
              <strong>{{ tag.value }}</strong>
            </div>
          }
        </aside>
      </section>
    </main>
  `,
  styles: [
    `
      html,
      body {
        background: #000000;
      }

      app-scada-viewer {
        display: block;
        min-height: 100vh;
        background: #000000;
        color: #ffffff;
      }

      .scada-screen {
        display: grid;
        grid-template-rows: 72px minmax(0, 1fr);
        min-height: 100vh;
        background: #000000;
        font-family: "Segoe UI", Arial, sans-serif;
      }

      .scada-toolbar {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 20px;
        padding: 10px 18px;
        border-bottom: 1px solid #3a3a3a;
        background: #050505;
      }

      .scada-toolbar p,
      .scada-toolbar h1 {
        margin: 0;
        letter-spacing: 0;
      }

      .scada-toolbar p {
        color: #ffd21a;
        font-size: 12px;
        font-weight: 700;
      }

      .scada-toolbar h1 {
        color: #ffffff;
        font-size: 23px;
        line-height: 1.2;
      }

      .scada-toolbar__status {
        min-width: 230px;
        padding: 10px 14px;
        border: 1px solid #00ff66;
        color: #00ff66;
        text-align: center;
        font-weight: 800;
      }

      .scada-toolbar__status--alarm {
        border-color: #ff2020;
        color: #ff2020;
        animation: scada-blink 0.8s steps(2, end) infinite;
      }

      .scada-toolbar__buttons {
        display: flex;
        gap: 8px;
      }

      .scada-toolbar button {
        min-width: 42px;
        height: 34px;
        border: 1px solid #888888;
        border-radius: 0;
        background: #111111;
        color: #ffffff;
        cursor: pointer;
        font-weight: 800;
      }

      .scada-workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        min-height: 0;
      }

      .scada-svg-host {
        min-height: calc(100vh - 72px);
        overflow: hidden;
        background: #000000;
      }

      .scada-svg-host svg {
        display: block;
        width: 100%;
        height: 100%;
        min-height: calc(100vh - 72px);
        background: #000000;
        user-select: none;
      }

      .scada-svg-host svg [id^='VALVE_'] {
        cursor: pointer;
      }

      .scada-side-panel {
        display: grid;
        align-content: start;
        gap: 10px;
        padding: 16px;
        border-left: 1px solid #3a3a3a;
        background: #050505;
      }

      .scada-side-panel h2 {
        margin: 0 0 8px;
        color: #ffd21a;
        font-size: 14px;
        letter-spacing: 0;
      }

      .scada-tag {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid #242424;
        color: #ffffff;
        font-size: 13px;
      }

      .scada-tag strong {
        color: #00ff66;
        font-size: 16px;
      }

      .scada-tag--alarm strong {
        color: #ff2020;
        animation: scada-blink 0.8s steps(2, end) infinite;
      }

      .scada-flow-line {
        animation: scada-flow 1.2s linear infinite;
      }

      .scada-alarm {
        animation: scada-blink 0.8s steps(2, end) infinite;
      }

      .scada-highlight {
        filter: drop-shadow(0 0 10px #ffd21a);
      }

      @keyframes scada-flow {
        to {
          stroke-dashoffset: -36;
        }
      }

      @keyframes scada-blink {
        50% {
          opacity: 0.18;
        }
      }

      @media (max-width: 980px) {
        .scada-screen {
          grid-template-rows: auto minmax(0, 1fr);
        }

        .scada-toolbar,
        .scada-workspace {
          grid-template-columns: 1fr;
        }

        .scada-side-panel {
          border-left: 0;
          border-top: 1px solid #3a3a3a;
        }
      }
    `,
  ],
})
export class ScadaViewerComponent implements AfterViewInit {
  @ViewChild('svgHost', { static: true })
  private readonly svgHost!: ElementRef<HTMLElement>;

  private readonly alarmService = inject(AlarmService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(RealtimeSimulationService);
  private readonly svgDom = inject(SvgDomService);
  private readonly svgLoader = inject(SvgLoaderService);

  private panZoom: SvgPanZoomInstance | null = null;

  readonly svgContent = signal<SafeHtml | null>(null);
  readonly alarm = signal<AlarmState>({ active: false, severity: 'NORMAL', message: 'SYSTEM NORMAL' });
  readonly frame = signal<RealtimeFrame>({
    pressure001: 68,
    pressure002: 57,
    flow001: 980,
    flow002: 720,
    co2: 1.2,
    h2o: 21,
  });
  readonly valves = signal<Record<ValveId, ValveStatus>>({
    VALVE_BV1: 'OPEN',
    VALVE_BV2: 'OPEN',
    VALVE_BV3: 'OPEN',
  });

  readonly tagSnapshots = computed<readonly TagSnapshot[]>(() => {
    const frame = this.frame();
    const alarm = this.alarm();

    return [
      { id: 'PRESSURE_001', label: 'PT-101 Inlet', value: `${frame.pressure001.toFixed(0)} bar`, alarm: alarm.active },
      { id: 'PRESSURE_002', label: 'PT-201 Outlet', value: `${frame.pressure002.toFixed(0)} bar` },
      { id: 'FLOW_001', label: 'FT-101 Main', value: `${frame.flow001.toFixed(0)} MMSCFD` },
      { id: 'FLOW_002', label: 'FT-201 Branch', value: `${frame.flow002.toFixed(0)} MMSCFD` },
      { id: 'CO2_001', label: 'CO2 Analyzer', value: `${frame.co2.toFixed(2)} %mol` },
      { id: 'H2O_001', label: 'H2O Analyzer', value: `${frame.h2o.toFixed(1)} lb/MMscf` },
      ...Object.entries(this.valves()).map(([id, status]) => ({ id, label: id.replace('VALVE_', ''), value: status })),
    ];
  });

  ngAfterViewInit(): void {
    this.svgDom.attach(this.svgHost.nativeElement);

    this.svgLoader
      .load('assets/plant.svg')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((svg) => {
        this.svgContent.set(svg);
        queueMicrotask(() => {
          this.initializePanZoom();
          this.syncAll();
        });
      });

    this.realtime.frames$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((frame) => this.applyRealtimeFrame(frame));
  }

  handleSvgClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const valve = target.closest('[id^="VALVE_BV"]');
    if (!this.isValveId(valve?.id)) {
      return;
    }

    const next: ValveStatus = this.valves()[valve.id] === 'OPEN' ? 'CLOSED' : 'OPEN';
    this.setValveState(valve.id, next);
  }

  zoomIn(): void {
    this.panZoom?.zoomIn();
  }

  zoomOut(): void {
    this.panZoom?.zoomOut();
  }

  resetView(): void {
    this.panZoom?.resetZoom();
    this.panZoom?.fit();
    this.panZoom?.center();
  }

  private initializePanZoom(): void {
    this.panZoom?.destroy();
    const svg = this.svgDom.getSvg();

    if (!svg) {
      return;
    }

    this.panZoom = svgPanZoom(svg, {
      center: true,
      controlIconsEnabled: false,
      fit: true,
      maxZoom: 8,
      minZoom: 0.45,
      zoomScaleSensitivity: 0.2,
    });
  }

  private applyRealtimeFrame(frame: RealtimeFrame): void {
    this.frame.set(frame);
    this.alarm.set(this.alarmService.evaluate(frame));
    this.updateAnalogValues(frame);
    this.updateAlarmVisuals();
  }

  private updateAnalogValues(frame: RealtimeFrame): void {
    this.svgDom.setText('PRESSURE_001', `${frame.pressure001.toFixed(0)} BAR`);
    this.svgDom.setText('PRESSURE_002', `${frame.pressure002.toFixed(0)} BAR`);
    this.svgDom.setText('FLOW_001', `${frame.flow001.toFixed(0)} MMSCFD`);
    this.svgDom.setText('FLOW_002', `${frame.flow002.toFixed(0)} MMSCFD`);
    this.svgDom.setText('CO2_001', `${frame.co2.toFixed(2)} %`);
    this.svgDom.setText('H2O_001', `${frame.h2o.toFixed(1)} LB`);
  }

  private updateAlarmVisuals(): void {
    const alarm = this.alarm();
    this.svgDom.setClass('PRESSURE_001', 'scada-alarm', alarm.active);
    this.svgDom.setClass('PRESSURE_BOX_001', 'scada-alarm', alarm.active);
    this.svgDom.setFill('PRESSURE_BOX_001', alarm.active ? '#340000' : '#06120a');
    this.svgDom.setStroke('PRESSURE_BOX_001', alarm.active ? ALARM_RED : NORMAL_GREEN);
    this.svgDom.setText('ALARM_BANNER', alarm.message);
    this.svgDom.setFill('ALARM_BANNER_BOX', alarm.active ? '#350000' : '#041407');
    this.svgDom.setStroke('ALARM_BANNER_BOX', alarm.active ? ALARM_RED : NORMAL_GREEN);
  }

  private setValveState(id: ValveId, status: ValveStatus): void {
    this.valves.update((valves) => ({ ...valves, [id]: status }));
    this.svgDom.setFill(id, status === 'OPEN' ? VALVE_OPEN : VALVE_CLOSED);
    this.svgDom.setStroke(id, status === 'OPEN' ? '#b9ffd3' : '#ffb3b3');
    this.svgDom.setText(`${id}_STATE`, status);
    this.svgDom.setFill(`${id}_STATE_BOX`, status === 'OPEN' ? '#063b1b' : '#410808');
    this.svgDom.setStroke(`${id}_STATE_BOX`, status === 'OPEN' ? VALVE_OPEN : VALVE_CLOSED);
    this.svgDom.highlight(id);
    this.updatePipelineFlow();
  }

  private updatePipelineFlow(): void {
    const values = this.valves();
    const flowing = Object.values(values).some((status) => status === 'OPEN');
    this.svgDom.setClass('PIPE_MAIN_FLOW', 'scada-flow-line', flowing);
    this.svgDom.setClass('PIPE_BRANCH_FLOW', 'scada-flow-line', values.VALVE_BV3 === 'OPEN');
    this.svgDom.setStroke('PIPE_MAIN_FLOW', PIPE_YELLOW);
    this.svgDom.setStroke('PIPE_BRANCH_FLOW', PIPE_YELLOW);
    this.svgDom.setOpacity('PIPE_MAIN_FLOW', flowing ? 1 : 0.2);
    this.svgDom.setOpacity('PIPE_BRANCH_FLOW', values.VALVE_BV3 === 'OPEN' ? 1 : 0.2);
  }

  private syncAll(): void {
    for (const [id, status] of Object.entries(this.valves())) {
      this.setValveState(id as ValveId, status);
    }

    this.updateAnalogValues(this.frame());
    this.updateAlarmVisuals();
    this.updatePipelineFlow();
  }

  private isValveId(id: string | undefined): id is ValveId {
    return id === 'VALVE_BV1' || id === 'VALVE_BV2' || id === 'VALVE_BV3';
  }
}
