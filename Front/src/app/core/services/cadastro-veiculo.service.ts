import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize, Observable, timeout } from 'rxjs';
import { CadastroCarroRequest, Carro } from '../models/parking';
import { isCarro } from '../models/parking-validation';
import { CarrosService } from './carros.service';
import { ParkingDataService } from './parking-data.service';
import { ParkingHistoryService } from './parking-history.service';

type Operacao = 'cadastro' | 'edicao' | 'exclusao';
interface ContextoOperacao {
  operacao: Operacao;
  dados: CadastroCarroRequest;
  id?: number;
}

interface ResultadoCadastro extends ContextoOperacao {
  tipo: 'success' | 'error' | 'uncertain';
  mensagem: string;
  titulo: string;
  carro?: Carro;
}

@Injectable({ providedIn: 'root' })
export class CadastroVeiculoService {
  private readonly api = inject(CarrosService);
  private readonly data = inject(ParkingDataService);
  private readonly historico = inject(ParkingHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pendenteState = signal<ContextoOperacao | null>(null);
  private readonly resultadoState = signal<ResultadoCadastro | null>(null);
  private readonly edicaoState = signal<Carro | null>(null);
  private readonly exclusaoState = signal<Carro | null>(null);
  private rascunhoCadastro?: CadastroCarroRequest;

  // O rascunho e o envio pertencem à sessão e sobrevivem à navegação entre as telas.
  readonly formulario = new FormGroup({
    placa: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/)],
    }),
    modelo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)],
    }),
    cor: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(40)],
    }),
  });
  readonly pendente = this.pendenteState.asReadonly();
  readonly resultado = this.resultadoState.asReadonly();
  readonly edicao = this.edicaoState.asReadonly();
  readonly exclusao = this.exclusaoState.asReadonly();
  // Um único envio de veículo por sessão, inclusive ao navegar entre as páginas.
  readonly cadastrando = computed(() => this.pendente() !== null);

  editar(carro: Carro) {
    if (this.cadastrando() || this.exclusao()) return;
    if (!this.edicao()) this.rascunhoCadastro = this.formulario.getRawValue();
    this.edicaoState.set({ ...carro });
    this.formulario.reset({ placa: carro.placa, modelo: carro.modelo, cor: carro.cor });
    this.limparResultado();
  }

  cancelarEdicao() {
    if (!this.cadastrando()) this.encerrarEdicao();
  }

  private encerrarEdicao() {
    this.edicaoState.set(null);
    this.formulario.reset(this.rascunhoCadastro);
    this.rascunhoCadastro = undefined;
  }

  solicitarExclusao(carro: Carro) {
    if (this.cadastrando() || this.exclusao()) return;
    this.exclusaoState.set({ ...carro });
  }

  cancelarExclusao() {
    if (!this.cadastrando()) this.exclusaoState.set(null);
  }

  excluir() {
    const carro = this.exclusao();
    if (!carro || this.cadastrando()) return;
    const { id, placa, modelo, cor } = carro;
    this.enviar(
      { operacao: 'exclusao', id, dados: { placa, modelo, cor } },
      this.api.excluir(id),
      204,
    );
  }

  cadastrar() {
    if (this.cadastrando() || this.exclusao()) return;
    const valores = this.formulario.getRawValue();
    const dados: CadastroCarroRequest = {
      placa: valores.placa.replace(/[\s-]/g, '').toUpperCase(),
      modelo: valores.modelo.trim(),
      cor: valores.cor.trim(),
    };
    this.formulario.setValue(dados);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    const carro = this.edicao();
    if (carro)
      this.enviar(
        { operacao: 'edicao', id: carro.id, dados },
        this.api.atualizar(carro.id, dados),
        200,
      );
    else this.enviar({ operacao: 'cadastro', dados }, this.api.criar(dados), 201);
  }

  private enviar(
    contexto: ContextoOperacao,
    request: Observable<HttpResponse<unknown>>,
    status: number,
  ) {
    this.resultadoState.set(null);
    this.pendenteState.set(contexto);
    // Não repetir mutações: a conexão pode falhar depois de o servidor gravar a operação.
    request
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pendenteState.set(null)),
      )
      .subscribe({
        next: (response) => {
          if (response.status === status) this.confirmar(contexto, response.body);
          else this.informarErro(contexto, null);
          this.atualizarConsultas(contexto);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === status)
            this.confirmar(contexto, null);
          else this.informarErro(contexto, error);
          this.atualizarConsultas(contexto);
        },
      });
  }

  private atualizarConsultas(contexto: ContextoOperacao) {
    if (contexto.operacao === 'exclusao') this.exclusaoState.set(null);
    // Cancelar leituras anteriores à mutação em todas as telas que usam esses cadastros.
    this.data.carros.reload();
    if (contexto.operacao !== 'cadastro') {
      this.data.refreshParking();
      this.historico.refreshIfLoaded();
    }
  }

  limparFormulario() {
    if (this.cadastrando()) return;
    if (this.edicao()) this.encerrarEdicao();
    else this.formulario.reset();
    this.limparResultado();
  }

  limparResultado() {
    this.resultadoState.set(null);
  }

  private confirmar(contexto: ContextoOperacao, body: unknown) {
    const { dados, operacao, id } = contexto;
    const carro =
      isCarro(body) &&
      (id === undefined || body.id === id) &&
      body.placa === dados.placa &&
      body.modelo === dados.modelo &&
      body.cor === dados.cor
        ? body
        : undefined;
    this.resultadoState.set({
      ...contexto,
      tipo: 'success',
      titulo:
        operacao === 'cadastro'
          ? 'Último veículo cadastrado'
          : operacao === 'edicao'
            ? 'Veículo atualizado'
            : 'Veículo excluído',
      carro,
      mensagem:
        operacao === 'exclusao'
          ? 'Veículo excluído com sucesso.'
          : carro
            ? operacao === 'cadastro'
              ? 'Veículo cadastrado com sucesso.'
              : 'Alterações salvas com sucesso.'
            : operacao === 'cadastro'
              ? 'Veículo cadastrado. Consulte a lista para conferir os detalhes.'
              : 'Alteração confirmada. Consulte a lista para conferir os detalhes.',
    });
    if (operacao === 'cadastro') this.formulario.reset();
    else if (operacao === 'edicao' || this.edicao()?.id === id) this.encerrarEdicao();
  }

  private informarErro(contexto: ContextoOperacao, error: unknown) {
    const { operacao } = contexto;
    const rejeitado =
      error instanceof HttpErrorResponse && [400, 404, 409, 422].includes(error.status);
    let mensagem =
      operacao === 'cadastro'
        ? 'Não foi possível cadastrar o veículo. Confira os dados e se a placa já está cadastrada.'
        : operacao === 'edicao'
          ? 'Não foi possível alterar o veículo. Confira os dados e se a placa já está cadastrada.'
          : 'Não foi possível excluir o veículo. Ele pode estar estacionado ou ter histórico de movimentações.';
    if (error instanceof HttpErrorResponse && error.status === 404)
      mensagem =
        'Veículo não encontrado. Atualize a lista e confira os cadastros disponíveis.';
    if (operacao === 'exclusao' && error instanceof HttpErrorResponse && error.status === 409) {
      const conhecidas = [
        'Não é possível excluir um veículo estacionado. Registre a saída primeiro',
        'Este veículo possui histórico de movimentações e não pode ser excluído',
      ];
      if (conhecidas.includes(error.error?.erro)) mensagem = error.error.erro;
    }
    const nome = { cadastro: 'cadastro', edicao: 'alteração', exclusao: 'exclusão' }[operacao];
    this.resultadoState.set({
      ...contexto,
      tipo: rejeitado ? 'error' : 'uncertain',
      titulo: rejeitado ? 'Operação não realizada' : 'Confirmação da operação pendente',
      mensagem: rejeitado
        ? mensagem
        : `Não foi possível confirmar ${operacao === 'cadastro' ? 'o' : 'a'} ${nome}. Atualize a lista e confira a placa antes de tentar novamente.`,
    });
  }
}
