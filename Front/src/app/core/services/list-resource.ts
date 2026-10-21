import { signal } from '@angular/core';
import { Observable, Subscription, timeout } from 'rxjs';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export class ListResource<T> {
  private readonly itemsState = signal<T[]>([]);
  private readonly statusState = signal<LoadStatus>('idle');
  private readonly updatedState = signal<Date | null>(null);
  private subscription?: Subscription;

  readonly items = this.itemsState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly updatedAt = this.updatedState.asReadonly();

  constructor(
    private readonly request: () => Observable<T[]>,
    private readonly isItem: (value: unknown) => value is T,
  ) {}

  ensureLoaded() {
    if (this.status() === 'idle') this.load();
  }

  reload() {
    this.subscription?.unsubscribe();
    this.statusState.set('idle');
    this.load();
  }

  load() {
    if (this.status() === 'loading') return;
    this.statusState.set('loading');
    this.itemsState.set([]);
    this.updatedState.set(null);
    this.subscription = this.request()
      .pipe(timeout(15000))
      .subscribe({
        next: (items) => {
          if (!Array.isArray(items) || !items.every(this.isItem)) {
            this.statusState.set('error');
            return;
          }
          this.itemsState.set(items);
          this.updatedState.set(new Date());
          this.statusState.set('success');
        },
        error: () => this.statusState.set('error'),
      });
  }

  destroy() {
    this.subscription?.unsubscribe();
  }
}
