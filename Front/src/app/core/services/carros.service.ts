import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Carro } from '../models/parking';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class CarrosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/carros`;

  listar() {
    return this.http.get<Carro[]>(this.url);
  }

  buscarPorId(id: Carro['id']) {
    return this.http.get<Carro>(`${this.url}/${id}`);
  }
}
