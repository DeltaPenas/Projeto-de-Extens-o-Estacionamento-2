import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Vaga, VagaStatus } from '../models/parking';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class VagasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/vagas`;

  listar() {
    return this.http.get<Vaga[]>(this.url);
  }

  listarStatus() {
    return this.http.get<VagaStatus[]>(`${this.url}/status`);
  }

  buscarPorId(id: Vaga['id']) {
    return this.http.get<Vaga>(`${this.url}/${id}`);
  }
}
