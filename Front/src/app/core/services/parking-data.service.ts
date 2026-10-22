import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import { Carro, Vaga, VagaComDisponibilidade, VagaStatus } from '../models/parking';
import { isCarro, isRegistroAtivo } from '../models/parking-validation';
import { PARKING_ROWS } from '../parking-layout';
import { CarrosService } from './carros.service';
import { ListResource } from './list-resource';
import { VagasService } from './vagas.service';

function isVaga(value: unknown): value is Vaga {
  if (!value || typeof value !== 'object') return false;
  const vaga = value as Vaga;
  return Number.isInteger(vaga.id) && vaga.id > 0 && Number.isInteger(vaga.numero);
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
      const registro =
        status?.numero === vaga.numero &&
        status.status &&
        isRegistroAtivo(status.registroAtivo, vaga)
          ? status.registroAtivo
          : null;
      return {
        ...vaga,
        disponibilidade:
          status?.numero === vaga.numero ? (status.status ? 'ocupada' : 'livre') : 'desconhecida',
        ocupacao: registro
          ? {
              registroId: registro.id,
              veiculo: registro.carro,
              entrada: registro.entrada,
            }
          : undefined,
      };
    });
  });
  // A seleção precisa conhecer também os ocupantes de cadastros fora do mapa físico.
  readonly ocupacaoCompleta = computed(() => {
    if (this.vagas.status() !== 'success' || this.ocupacao.status() !== 'success') return false;
    const statuses = this.ocupacao.items();
    if (new Set(statuses.map((vaga) => vaga.id)).size !== statuses.length) return false;
    if (
      !this.vagas
        .items()
        .every((vaga) =>
          statuses.some((item) => item.id === vaga.id && item.numero === vaga.numero),
        )
    )
      return false;
    const carros = new Set<number>();
    const registros = new Set<number>();
    return statuses.every((vaga) => {
      if (!vaga.status) return vaga.registroAtivo === null;
      const registro = vaga.registroAtivo;
      if (
        !isRegistroAtivo(registro, vaga) ||
        carros.has(registro.carroId) ||
        registros.has(registro.id)
      )
        return false;
      carros.add(registro.carroId);
      registros.add(registro.id);
      return true;
    });
  });
  readonly carrosDisponiveis = computed<Carro[]>(() => {
    if (!this.ocupacaoCompleta() || this.carros.status() !== 'success') return [];
    const estacionados = new Set(
      this.ocupacao
        .items()
        .filter((vaga) => vaga.status)
        .map((vaga) => vaga.registroAtivo!.carroId),
    );
    return this.carros.items().filter((carro) => !estacionados.has(carro.id));
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
    // Uma movimentação pode terminar enquanto uma consulta anterior ainda está em andamento.
    this.vagas.reload();
    this.ocupacao.reload();
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.vagas.destroy();
      this.ocupacao.destroy();
      this.carros.destroy();
    });
  }
}
