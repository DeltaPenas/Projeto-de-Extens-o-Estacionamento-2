import { HttpClient, HttpParams } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import { ConsultaHistorico, PaginaHistorico, RegistroHistorico } from '../models/parking';
import { isCarro, isDate } from '../models/parking-validation';
import { API_BASE_URL } from './api.config';
import { LoadStatus } from './list-resource';

function isRegistro(value: unknown): value is RegistroHistorico {
  if (!value || typeof value !== 'object') return false;
  const registro = value as RegistroHistorico;
  return (
    Number.isInteger(registro.id) &&
    registro.id > 0 &&
    isDate(registro.entrada) &&
    (registro.saida === null ||
      (isDate(registro.saida) && Date.parse(registro.saida) >= Date.parse(registro.entrada))) &&
    isCarro(registro.carro) &&
    registro.carroId === registro.carro.id &&
    Number.isInteger(registro.vaga?.id) &&
    registro.vaga.id > 0 &&
    registro.vagaId === registro.vaga.id &&
    Number.isInteger(registro.vaga.numero) &&
    registro.vaga.numero > 0
  );
}

function isPagina(value: unknown, consulta: ConsultaHistorico): value is PaginaHistorico {
  if (!value || typeof value !== 'object') return false;
  const pagina = value as PaginaHistorico;
  return (
    pagina.page === consulta.page &&
    pagina.limit === consulta.limit &&
    Number.isSafeInteger(pagina.total) &&
    pagina.total >= 0 &&
    pagina.totalPages === Math.ceil(pagina.total / pagina.limit) &&
    Array.isArray(pagina.items) &&
    pagina.items.length ===
      Math.max(0, Math.min(pagina.limit, pagina.total - (pagina.page - 1) * pagina.limit)) &&
    pagina.items.every(isRegistro) &&
    new Set(pagina.items.map((item) => item.id)).size === pagina.items.length
  );
}

@Injectable({ providedIn: 'root' })
export class ParkingHistoryService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/registros`;
  private readonly consultaState = signal<ConsultaHistorico>({ page: 1, limit: 10 });
  private readonly paginaState = signal<PaginaHistorico | null>(null);
  private readonly statusState = signal<LoadStatus>('idle');
  private readonly updatedState = signal<Date | null>(null);
  private subscription?: Subscription;

  readonly consulta = this.consultaState.asReadonly();
  readonly pagina = this.paginaState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly updatedAt = this.updatedState.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  ensureLoaded() {
    if (this.status() === 'idle') this.load();
  }

  refresh() {
    this.load({ ...this.consulta(), page: 1 });
  }

  refreshIfLoaded() {
    if (this.status() !== 'idle') this.refresh();
  }

  load(consulta: ConsultaHistorico = this.consulta()) {
    this.subscription?.unsubscribe();
    this.consultaState.set({ ...consulta });
    this.statusState.set('loading');
    this.paginaState.set(null);
    this.updatedState.set(null);
    let params = new HttpParams();
    for (const [key, value] of Object.entries(consulta)) {
      if (value !== undefined && value !== '') params = params.set(key, value);
    }
    this.subscription = this.http
      .get<unknown>(this.url, { params })
      .pipe(timeout(15000))
      .subscribe({
        next: (pagina) => {
          if (!isPagina(pagina, consulta)) {
            this.statusState.set('error');
            return;
          }
          if (consulta.page > Math.max(1, pagina.totalPages)) {
            this.load({ ...consulta, page: Math.max(1, pagina.totalPages) });
            return;
          }
          this.paginaState.set(pagina);
          this.updatedState.set(new Date());
          this.statusState.set('success');
        },
        error: () => this.statusState.set('error'),
      });
  }
}
