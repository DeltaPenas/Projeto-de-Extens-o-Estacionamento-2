import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import {
  Carro,
  DetalhesOcupacao,
  RegistrarEntradaRequest,
  RegistrarSaidaRequest,
  RegistroEntrada,
  RegistroSaida,
  Vaga,
} from '../models/parking';
import { isCarro, isDate } from '../models/parking-validation';
import { API_BASE_URL } from './api.config';
import { ParkingDataService } from './parking-data.service';
import { ParkingHistoryService } from './parking-history.service';

type ContextoMovimentacao = {
  carro: Carro;
  vaga: Vaga;
} & ({ operacao: 'entrada' } | { operacao: 'saida'; registroId: number; entrada: string });

type ResultadoMovimentacao = ContextoMovimentacao & {
  tipo: 'success' | 'error' | 'uncertain';
  mensagem: string;
  registro?: RegistroEntrada | RegistroSaida;
};

function isRegistro(
  value: unknown,
  contexto: ContextoMovimentacao,
): value is RegistroEntrada | RegistroSaida {
  if (!value || typeof value !== 'object') return false;
  const registro = value as RegistroEntrada | RegistroSaida;
  return (
    Number.isInteger(registro.id) &&
    registro.id > 0 &&
    registro.carroId === contexto.carro.id &&
    registro.vagaId === contexto.vaga.id &&
    isDate(registro.entrada) &&
    isCarro(registro.carro) &&
    registro.carro.id === registro.carroId &&
    registro.vaga?.id === registro.vagaId &&
    registro.vaga.numero === contexto.vaga.numero &&
    (contexto.operacao === 'entrada'
      ? registro.saida === null
      : registro.id === contexto.registroId &&
        registro.entrada === contexto.entrada &&
        isDate(registro.saida) &&
        Date.parse(registro.saida) >= Date.parse(registro.entrada))
  );
}

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  private readonly http = inject(HttpClient);
  private readonly data = inject(ParkingDataService);
  private readonly historico = inject(ParkingHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = `${inject(API_BASE_URL)}/registros`;
  private readonly pendenteState = signal<ContextoMovimentacao | null>(null);
  private readonly resultadoState = signal<ResultadoMovimentacao | null>(null);

  readonly movimentacaoPendente = this.pendenteState.asReadonly();
  readonly resultado = this.resultadoState.asReadonly();
  readonly registrando = computed(() => this.movimentacaoPendente() !== null);
  readonly registrandoEntrada = computed(() => this.movimentacaoPendente()?.operacao === 'entrada');
  readonly registrandoSaida = computed(() => this.movimentacaoPendente()?.operacao === 'saida');

  registrarEntrada(carro: Carro, vaga: Vaga) {
    if (this.registrando()) return;
    const contexto: ContextoMovimentacao = {
      operacao: 'entrada',
      carro: { ...carro },
      vaga: { id: vaga.id, numero: vaga.numero },
    };
    const livre = this.data
      .vagasComDisponibilidade()
      .some(
        (item) =>
          item.id === vaga.id && item.numero === vaga.numero && item.disponibilidade === 'livre',
      );
    if (!livre || !this.data.carrosDisponiveis().some((item) => item.id === carro.id)) {
      this.resultadoState.set({
        ...contexto,
        tipo: 'error',
        mensagem: 'Confira o veículo e atualize a situação da vaga antes de registrar a entrada.',
      });
      return;
    }
    const dados: RegistrarEntradaRequest = { carroid: carro.id, vagaid: vaga.id };
    this.enviar(contexto, dados);
  }

  registrarSaida(vaga: Vaga, ocupacao: DetalhesOcupacao) {
    if (this.registrando()) return;
    const contexto: ContextoMovimentacao = {
      operacao: 'saida',
      carro: { ...ocupacao.veiculo },
      vaga: { id: vaga.id, numero: vaga.numero },
      registroId: ocupacao.registroId,
      entrada: ocupacao.entrada,
    };
    const atual = this.data
      .vagasComDisponibilidade()
      .find(
        (item) =>
          item.id === vaga.id && item.numero === vaga.numero && item.disponibilidade === 'ocupada',
      )?.ocupacao;
    if (
      !atual ||
      atual.registroId !== ocupacao.registroId ||
      atual.veiculo.id !== ocupacao.veiculo.id ||
      atual.entrada !== ocupacao.entrada
    ) {
      this.resultadoState.set({
        ...contexto,
        tipo: 'error',
        mensagem:
          'A ocupação mudou. Atualize a vaga e confira o veículo antes de registrar a saída.',
      });
      return;
    }
    const dados: RegistrarSaidaRequest = { registroId: ocupacao.registroId };
    this.enviar(contexto, dados);
  }

  limparResultado() {
    this.resultadoState.set(null);
  }

  private enviar(
    contexto: ContextoMovimentacao,
    dados: RegistrarEntradaRequest | RegistrarSaidaRequest,
  ) {
    const statusEsperado = contexto.operacao === 'entrada' ? 201 : 200;
    this.resultadoState.set(null);
    this.pendenteState.set(contexto);
    // O envio pertence à sessão, mesmo ao navegar. Nunca repetir um POST automaticamente:
    // uma falha de conexão pode acontecer depois da gravação no servidor.
    this.http
      .post<unknown>(`${this.url}/${contexto.operacao}`, dados, { observe: 'response' })
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pendenteState.set(null)),
      )
      .subscribe({
        next: (response) => {
          if (response.status === statusEsperado) this.confirmar(contexto, response.body);
          else this.informarErro(contexto, null);
          this.data.refreshParking();
          this.historico.refreshIfLoaded();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === statusEsperado)
            this.confirmar(contexto, null);
          else this.informarErro(contexto, error);
          this.data.refreshParking();
          this.historico.refreshIfLoaded();
        },
      });
  }

  private informarErro(contexto: ContextoMovimentacao, error: unknown) {
    const rejeitada = error instanceof HttpErrorResponse && [400, 404, 409].includes(error.status);
    const mensagens =
      contexto.operacao === 'entrada'
        ? [
            'Carro não encontrado',
            'Vaga não encontrada',
            'Carro já possui uma entrada ativa',
            'Vaga já está ocupada',
            'O veículo ou a vaga foi removido. Atualize os cadastros antes de registrar a entrada',
          ]
        : ['Registro não encontrado', 'Este registro já foi encerrado'];
    const mensagem =
      error instanceof HttpErrorResponse && rejeitada && mensagens.includes(error.error?.erro)
        ? (error.error.erro as string)
        : null;
    this.resultadoState.set({
      ...contexto,
      tipo: rejeitada ? 'error' : 'uncertain',
      mensagem:
        mensagem ??
        (rejeitada
          ? contexto.operacao === 'entrada'
            ? 'Não foi possível registrar a entrada. Confira o veículo e a vaga selecionados.'
            : 'Não foi possível registrar a saída. Atualize a vaga e confira a movimentação selecionada.'
          : `Não foi possível confirmar a ${contexto.operacao === 'entrada' ? 'entrada' : 'saída'}. Confira a situação da vaga antes de tentar novamente.`),
    });
  }

  private confirmar(contexto: ContextoMovimentacao, body: unknown) {
    const registro = isRegistro(body, contexto) ? body : undefined;
    const nome = contexto.operacao === 'entrada' ? 'Entrada' : 'Saída';
    this.resultadoState.set({
      ...contexto,
      tipo: 'success',
      mensagem: registro
        ? `${nome} registrada com sucesso.`
        : `${nome} registrada, mas os detalhes da confirmação não puderam ser carregados.`,
      registro,
    });
  }
}
