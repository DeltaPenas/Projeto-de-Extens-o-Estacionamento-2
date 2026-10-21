import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { Carro, RegistrarEntradaRequest, RegistroEntrada, Vaga } from '../models/parking';
import { API_BASE_URL } from './api.config';
import { ParkingDataService } from './parking-data.service';

interface ContextoEntrada {
  carro: Carro;
  vaga: Vaga;
}

interface ResultadoEntrada extends ContextoEntrada {
  tipo: 'success' | 'error' | 'uncertain';
  mensagem: string;
  registro?: RegistroEntrada;
}

function isRegistroEntrada(value: unknown, contexto: ContextoEntrada): value is RegistroEntrada {
  if (!value || typeof value !== 'object') return false;
  const registro = value as RegistroEntrada;
  return (
    Number.isInteger(registro.id) &&
    registro.id > 0 &&
    registro.carroId === contexto.carro.id &&
    registro.vagaId === contexto.vaga.id &&
    registro.saida === null &&
    typeof registro.entrada === 'string' &&
    Number.isFinite(Date.parse(registro.entrada)) &&
    registro.carro?.id === registro.carroId &&
    typeof registro.carro.placa === 'string' &&
    typeof registro.carro.modelo === 'string' &&
    typeof registro.carro.cor === 'string' &&
    registro.vaga?.id === registro.vagaId &&
    registro.vaga.numero === contexto.vaga.numero
  );
}

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  private readonly http = inject(HttpClient);
  private readonly data = inject(ParkingDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = `${inject(API_BASE_URL)}/registros`;
  private readonly pendenteState = signal<ContextoEntrada | null>(null);
  private readonly resultadoState = signal<ResultadoEntrada | null>(null);

  readonly entradaPendente = this.pendenteState.asReadonly();
  readonly resultadoEntrada = this.resultadoState.asReadonly();
  readonly registrandoEntrada = computed(() => this.entradaPendente() !== null);

  readonly recursos = {
    consultarDetalhesOcupacao: false,
    registrarEntrada: true,
    registrarSaida: false,
  } as const;

  registrarEntrada(carro: Carro, vaga: Vaga) {
    if (this.registrandoEntrada()) return;
    const contexto = { carro: { ...carro }, vaga: { id: vaga.id, numero: vaga.numero } };
    const livre = this.data
      .vagasComDisponibilidade()
      .some(
        (item) =>
          item.id === vaga.id && item.numero === vaga.numero && item.disponibilidade === 'livre',
      );
    if (
      !livre ||
      this.data.carros.status() !== 'success' ||
      !this.data.carros.items().some((item) => item.id === carro.id)
    ) {
      this.resultadoState.set({
        ...contexto,
        tipo: 'error',
        mensagem: 'Confira o veículo e atualize a situação da vaga antes de registrar a entrada.',
      });
      return;
    }

    const dados: RegistrarEntradaRequest = { carroid: carro.id, vagaid: vaga.id };
    this.resultadoState.set(null);
    this.pendenteState.set(contexto);
    // A operação pertence à sessão e continua ao navegar entre as páginas.
    // Não repetir o POST automaticamente: uma falha de conexão pode ocorrer após a gravação.
    this.http
      .post<unknown>(`${this.url}/entrada`, dados, { observe: 'response' })
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pendenteState.set(null)),
      )
      .subscribe({
        next: (response) => {
          if (response.status === 201) {
            this.confirmarEntrada(contexto, response.body);
          } else {
            this.resultadoState.set({
              ...contexto,
              tipo: 'uncertain',
              mensagem:
                'Não foi possível confirmar a entrada. Confira a situação da vaga antes de tentar novamente.',
            });
          }
          this.data.refreshParking();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 201) {
            this.confirmarEntrada(contexto, null);
          } else {
            const rejeitada =
              error instanceof HttpErrorResponse && [400, 404, 409].includes(error.status);
            const mensagens = [
              'Carro não encontrado',
              'Vaga não encontrada',
              'Carro já possui uma entrada ativa',
              'Vaga já está ocupada',
            ];
            const mensagem =
              error instanceof HttpErrorResponse &&
              error.status === 409 &&
              mensagens.includes(error.error?.erro)
                ? (error.error.erro as string)
                : null;
            this.resultadoState.set({
              ...contexto,
              tipo: rejeitada ? 'error' : 'uncertain',
              mensagem:
                mensagem ??
                (rejeitada
                  ? 'Não foi possível registrar a entrada. Confira o veículo e a vaga selecionados.'
                  : 'Não foi possível confirmar a entrada. Confira a situação da vaga antes de tentar novamente.'),
            });
          }
          this.data.refreshParking();
        },
      });
  }

  limparResultado() {
    this.resultadoState.set(null);
  }

  private confirmarEntrada(contexto: ContextoEntrada, body: unknown) {
    const registro = isRegistroEntrada(body, contexto) ? body : undefined;
    this.resultadoState.set({
      ...contexto,
      tipo: 'success',
      mensagem: registro
        ? 'Entrada registrada com sucesso.'
        : 'Entrada registrada, mas os detalhes da confirmação não puderam ser carregados.',
      registro,
    });
  }
}
