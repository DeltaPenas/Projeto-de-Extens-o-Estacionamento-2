import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import { Carro, Vaga, VagaComDisponibilidade, VagaStatus } from '../models/parking';
import { PARKING_ROWS } from '../parking-layout';
import { CarrosService } from './carros.service';
import { ListResource } from './list-resource';
import { VagasService } from './vagas.service';

function isVaga(value: unknown): value is Vaga {
  if (!value || typeof value !== 'object') return false;
  const vaga = value as Vaga;
  return Number.isInteger(vaga.id) && vaga.id > 0 && Number.isInteger(vaga.numero);
}

function isCarro(value: unknown): value is Carro {
  if (!value || typeof value !== 'object') return false;
  const carro = value as Carro;
  return (
    Number.isInteger(carro.id) &&
    carro.id > 0 &&
    typeof carro.placa === 'string' &&
    typeof carro.modelo === 'string' &&
    typeof carro.cor === 'string'
  );
}

function isVagaStatus(value: unknown): value is VagaStatus {
  return isVaga(value) && typeof (value as VagaStatus).status === 'boolean';
}

const physicalNumbers = new Set(PARKING_ROWS.flatMap((row) => row.numeros));

@Injectable({ providedIn: 'root' })
export class ParkingDataService {
  private readonly vagasApi = inject(VagasService);
  private readonly carrosApi = inject(CarrosService);

  readonly vagas = new ListResource(() => this.vagasApi.listar(), isVaga);
  readonly ocupacao = new ListResource(() => this.vagasApi.listarStatus(), isVagaStatus);
  readonly carros = new ListResource(() => this.carrosApi.listar(), isCarro);

  readonly parkingLoading = computed(
    () => this.vagas.status() === 'loading' || this.ocupacao.status() === 'loading',
  );
  readonly vagasComDisponibilidade = computed<VagaComDisponibilidade[]>(() => {
    if (this.vagas.status() !== 'success') return [];
    const statuses = new Map(
      (this.ocupacao.status() === 'success' ? this.ocupacao.items() : []).map((vaga) => [
        vaga.id,
        vaga,
      ]),
    );
    return this.vagas.items().map((vaga) => {
      const status = statuses.get(vaga.id);
      return {
        ...vaga,
        disponibilidade:
          status?.numero === vaga.numero ? (status.status ? 'ocupada' : 'livre') : 'desconhecida',
      };
    });
  });
  readonly occupancySummary = computed(() => {
    const vagas = this.vagasComDisponibilidade().filter((vaga) => physicalNumbers.has(vaga.numero));
    return {
      total: vagas.length,
      free: vagas.filter((vaga) => vaga.disponibilidade === 'livre').length,
      occupied: vagas.filter((vaga) => vaga.disponibilidade === 'ocupada').length,
      unknown: vagas.filter((vaga) => vaga.disponibilidade === 'desconhecida').length,
    };
  });
  readonly occupancyMetrics = computed(() => {
    const summary = this.occupancySummary();
    if (
      this.vagas.status() !== 'success' ||
      this.ocupacao.status() !== 'success' ||
      summary.unknown > 0
    ) {
      return null;
    }
    return {
      ...summary,
      rate: summary.total > 0 ? (summary.occupied / summary.total) * 100 : null,
    };
  });

  ensureParkingLoaded() {
    this.vagas.ensureLoaded();
    this.ocupacao.ensureLoaded();
  }

  refreshParking() {
    this.vagas.load();
    this.ocupacao.load();
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.vagas.destroy();
      this.ocupacao.destroy();
      this.carros.destroy();
    });
  }
}
