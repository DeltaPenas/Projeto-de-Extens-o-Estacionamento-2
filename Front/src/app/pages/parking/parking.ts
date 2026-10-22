import { DatePipe, DOCUMENT } from '@angular/common';
import { afterRenderEffect, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PHYSICAL_CAPACITY } from '../../core/parking-layout';
import { ParkingDataService } from '../../core/services/parking-data.service';
import { RegistrosService } from '../../core/services/registros.service';
import { EntryForm } from './entry-form/entry-form';
import { MovementFeedback } from './movement-feedback/movement-feedback';
import { ExitAction } from './exit-action/exit-action';
import { ParkingHistory } from './parking-history/parking-history';
import { ParkingHistoryService } from '../../core/services/parking-history.service';
import { Icon } from '../../shared/icon/icon';
import {
  associateSlots,
  PARKING_POSITIONS,
  ParkingMap,
  SLOT_LABELS,
} from '../../shared/parking-map/parking-map';

@Component({
  selector: 'app-parking',
  imports: [Icon, ParkingMap, DatePipe, EntryForm, MovementFeedback, ExitAction, ParkingHistory],
  templateUrl: './parking.html',
  styleUrl: './parking.css',
})
export class Parking {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly history = inject(ParkingHistoryService);
  private readonly routeSelectionPending = signal(false);
  protected readonly data = inject(ParkingDataService);
  protected readonly registros = inject(RegistrosService);
  protected readonly capacity = PHYSICAL_CAPACITY;
  protected readonly labels = SLOT_LABELS;
  protected readonly selectedNumber = signal<number | null>(null);
  protected readonly slots = computed(() =>
    associateSlots(this.data.vagasComDisponibilidade(), this.data.vagas.status() === 'success'),
  );
  protected readonly selected = computed(
    () => this.slots().find((slot) => slot.numero === this.selectedNumber()) ?? null,
  );
  protected readonly registered = computed(() => this.slots().filter((slot) => slot.vaga).length);
  protected readonly unmapped = computed(() => {
    const numbers = new Set(PARKING_POSITIONS.map((position) => position.numero));
    return this.data.vagas.items().filter((vaga) => !numbers.has(vaga.numero)).length;
  });

  constructor() {
    this.data.ensureParkingLoaded();
    this.route?.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const raw = params.get('vaga');
      const numero = raw && /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
      const valid = PARKING_POSITIONS.some((position) => position.numero === numero);
      this.selectedNumber.set(valid ? numero : null);
      this.routeSelectionPending.set(valid);
    });
    afterRenderEffect(() => {
      if (!this.routeSelectionPending() || !this.selected()) return;
      const title = this.document.getElementById('details-title');
      if (title) {
        title.focus({ preventScroll: true });
        this.document.getElementById('slot-details')?.scrollIntoView?.({ block: 'nearest' });
        this.routeSelectionPending.set(false);
      }
    });
  }

  protected refresh() {
    this.data.refreshParking();
    this.history.refresh();
  }

  protected selectSlot(numero: number) {
    this.selectedNumber.set(numero);
    if (this.document.defaultView?.matchMedia?.('(max-width: 900px)')?.matches) {
      // Esperar o painel renderizar antes de mover o foco e rolar até os detalhes.
      this.routeSelectionPending.set(true);
      return;
    }
    if (this.document.defaultView?.matchMedia?.('(max-width: 1320px)')?.matches) {
      this.document.getElementById('slot-details')?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  protected closeDetails() {
    const numero = this.selectedNumber();
    this.selectedNumber.set(null);
    this.routeSelectionPending.set(false);
    const mobile = this.document.defaultView?.matchMedia?.('(max-width: 900px)')?.matches;
    this.document
      .querySelector<HTMLElement | SVGElement>(
        mobile ? `[data-mobile-number="${numero}"]` : `g[data-number="${numero}"]`,
      )
      ?.focus();
  }
}
