import { DestroyRef, inject, Injectable } from '@angular/core';
import { Carro, Vaga } from '../models/parking';
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

@Injectable({ providedIn: 'root' })
export class ParkingDataService {
  private readonly vagasApi = inject(VagasService);
  private readonly carrosApi = inject(CarrosService);

  readonly vagas = new ListResource(() => this.vagasApi.listar(), isVaga);
  readonly carros = new ListResource(() => this.carrosApi.listar(), isCarro);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.vagas.destroy();
      this.carros.destroy();
    });
  }
}
