import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PARKING_ROWS, PHYSICAL_CAPACITY } from '../../core/parking-layout';
import { ParkingDataService } from '../../core/services/parking-data.service';
import { Icon } from '../../shared/icon/icon';
import { MetricCard } from '../../shared/metric-card/metric-card';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

@Component({
  selector: 'app-dashboard',
  imports: [Icon, MetricCard, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly data = inject(ParkingDataService);
  protected readonly capacity = PHYSICAL_CAPACITY;
  protected readonly search = signal('');
  protected readonly situacao = signal('');
  protected readonly physicalNumbers = new Set(PARKING_ROWS.flatMap((row) => row.numeros));
  protected readonly loading = computed(
    () => this.data.parkingLoading() || this.data.carros.status() === 'loading',
  );
  protected readonly occupancyRate = computed(() => {
    const rate = this.data.occupancyMetrics()?.rate;
    return rate == null ? '—' : `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  });
  protected readonly filteredCars = computed(() => {
    const term = normalize(this.search().trim());
    return this.data
      .carrosComSituacao()
      .filter(
        (carro) =>
          normalize(`${carro.placa} ${carro.modelo} ${carro.cor}`).includes(term) &&
          (!this.situacao() || carro.situacao === this.situacao()),
      );
  });

  constructor() {
    this.data.ensureParkingLoaded();
    this.data.carros.ensureLoaded();
  }

  protected refresh() {
    this.data.refreshParking();
    this.data.carros.load();
  }
}
