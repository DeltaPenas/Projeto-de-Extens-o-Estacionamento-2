import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { PHYSICAL_CAPACITY } from '../../core/parking-layout';
import { ParkingDataService } from '../../core/services/parking-data.service';
import { Icon } from '../../shared/icon/icon';
import {
  associateSlots,
  PARKING_POSITIONS,
  ParkingMap,
  SLOT_LABELS,
} from '../../shared/parking-map/parking-map';

@Component({
  selector: 'app-parking',
  imports: [Icon, ParkingMap],
  templateUrl: './parking.html',
  styleUrl: './parking.css',
})
export class Parking {
  private readonly document = inject(DOCUMENT);
  protected readonly data = inject(ParkingDataService);
  protected readonly capacity = PHYSICAL_CAPACITY;
  protected readonly labels = SLOT_LABELS;
  protected readonly selectedNumber = signal<number | null>(null);
  protected readonly slots = computed(() =>
    associateSlots(this.data.vagas.items(), this.data.vagas.status() === 'success'),
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
    this.data.vagas.ensureLoaded();
  }

  protected selectSlot(numero: number) {
    this.selectedNumber.set(numero);
    if (this.document.defaultView?.matchMedia?.('(max-width: 1320px)')?.matches) {
      this.document.getElementById('slot-details')?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  protected closeDetails() {
    const numero = this.selectedNumber();
    this.selectedNumber.set(null);
    this.document.querySelector<SVGElement>(`g[data-number="${numero}"]`)?.focus();
  }
}
