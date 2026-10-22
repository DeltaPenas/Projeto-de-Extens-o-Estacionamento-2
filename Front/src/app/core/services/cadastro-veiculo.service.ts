import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { CadastroCarroRequest, Carro } from '../models/parking';
import { isCarro } from '../models/parking-validation';
import { CarrosService } from './carros.service';
import { ParkingDataService } from './parking-data.service';

interface ResultadoCadastro {
  tipo: 'success' | 'error' | 'uncertain';
  mensagem: string;
  dados: CadastroCarroRequest;
  carro?: Carro;
}

@Injectable({ providedIn: 'root' })
export class CadastroVeiculoService {
  private readonly api = inject(CarrosService);
  private readonly data = inject(ParkingDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pendenteState = signal<CadastroCarroRequest | null>(null);
  private readonly resultadoState = signal<ResultadoCadastro | null>(null);

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
  readonly cadastrando = computed(() => this.pendente() !== null);

  cadastrar() {
    if (this.cadastrando()) return;
    const valores = this.formulario.getRawValue();
    const dados: CadastroCarroRequest = {
      placa: valores.placa.replace(/[\s-]/g, '').toUpperCase(),
      modelo: valores.modelo.trim(),
      cor: valores.cor.trim(),
    };
    this.formulario.setValue(dados);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.resultadoState.set(null);
    this.pendenteState.set(dados);
    // Não repetir o POST: a conexão pode falhar depois de o servidor gravar o veículo.
    this.api
      .criar(dados)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pendenteState.set(null)),
      )
      .subscribe({
        next: (response) => {
          if (response.status === 201) this.confirmar(dados, response.body);
          else this.informarErro(dados, null);
          this.data.carros.reload();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 201)
            this.confirmar(dados, null);
          else this.informarErro(dados, error);
          // Cancelar leituras anteriores ao cadastro para atualizar todas as telas com a mesma lista.
          this.data.carros.reload();
        },
      });
  }

  limparFormulario() {
    if (this.cadastrando()) return;
    this.formulario.reset();
    this.limparResultado();
  }

  limparResultado() {
    this.resultadoState.set(null);
  }

  private confirmar(dados: CadastroCarroRequest, body: unknown) {
    const carro =
      isCarro(body) &&
      body.placa === dados.placa &&
      body.modelo === dados.modelo &&
      body.cor === dados.cor
        ? body
        : undefined;
    this.resultadoState.set({
      tipo: 'success',
      dados,
      carro,
      mensagem: carro
        ? 'Veículo cadastrado com sucesso.'
        : 'Veículo cadastrado. Consulte a lista para conferir os detalhes.',
    });
    this.formulario.reset();
  }

  private informarErro(dados: CadastroCarroRequest, error: unknown) {
    const rejeitado = error instanceof HttpErrorResponse && [400, 409, 422].includes(error.status);
    this.resultadoState.set({
      tipo: rejeitado ? 'error' : 'uncertain',
      dados,
      mensagem: rejeitado
        ? 'Não foi possível cadastrar o veículo. Confira os dados e se a placa já está cadastrada.'
        : 'Não foi possível confirmar o cadastro. Atualize a lista e confira a placa antes de tentar novamente.',
    });
  }
}
