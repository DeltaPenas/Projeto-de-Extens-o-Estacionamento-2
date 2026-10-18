import { Component, input } from '@angular/core';

const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  parking:
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M9 17V7h4a3 3 0 0 1 0 6H9',
  car: 'm5 7 2-4h10l2 4 M5 7h14l2 4v7H3v-7z M3 13h18 M6 18v3 M18 18v3 M6 10h.01 M18 10h.01',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6.1 6.1a8 8 0 0 1 13 1.9 M4.9 16a8 8 0 0 0 13 1.9',
  info: 'M12 8h.01 M12 11v5 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  search: 'm21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  arrow: 'M5 12h14 m-5-5 5 5-5 5',
  close: 'm6 6 12 12 M6 18 18 6',
  building: 'M4 21V3h12v18 M16 9h4v12 M2 21h20 M8 7h4 M8 11h4 M8 15h4 M9 21v-3h2v3',
  check: 'm8 12 3 3 5-6 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  chart: 'M12 3v9h9 M21 15a9 9 0 1 1-12-12',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  warning: 'm12 3 10 18H2z M12 9v5 M12 17h.01',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
} as const;

export type IconName = keyof typeof paths;

@Component({
  selector: 'app-icon',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()]" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly paths = paths;
}
