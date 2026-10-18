import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-metric-card',
  imports: [Icon],
  template: `<article class="metric-card panel" [class.metric-unavailable]="unavailable()">
    <div class="metric-top">
      <span>{{ label() }}</span
      ><span class="metric-icon"><app-icon [name]="icon()" /></span>
    </div>
    <div class="metric-value">
      {{ value() }}<span class="metric-unit">{{ unit() }}</span>
    </div>
    <p>{{ description() }}</p>
  </article>`,
  styles: `
    :host {
      display: block;
    }
    .metric-card {
      padding: 22px;
      height: 100%;
    }
    .metric-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .metric-icon {
      background: var(--blue-soft);
      color: var(--blue);
      padding: 9px;
      border-radius: 10px;
      display: flex;
    }
    .metric-value {
      margin: 16px 0 8px;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -1.5px;
      line-height: 1.1;
    }
    .metric-unit {
      margin-left: 6px;
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0;
      color: var(--text-muted);
    }
    p {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }
    .metric-unavailable .metric-value {
      color: var(--text-muted);
    }
    .metric-unavailable .metric-icon {
      color: #66758b;
      background: #f1f4f8;
    }
  `,
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly unit = input('');
  readonly description = input('');
  readonly unavailable = input(false);
}
