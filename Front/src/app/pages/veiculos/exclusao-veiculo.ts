import { afterRenderEffect, Component, ElementRef, inject, viewChild } from '@angular/core';
import { CadastroVeiculoService } from '../../core/services/cadastro-veiculo.service';

@Component({
  selector: 'app-exclusao-veiculo',
  template: `
    <dialog
      #dialogo
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      (cancel)="cancelar($event)"
    >
      @if (cadastro.exclusao(); as carro) {
        <h2 id="delete-title">Excluir veículo?</h2>
        <p id="delete-description">
          Confirme a exclusão deste cadastro. Esta ação não pode ser desfeita.
        </p>
        <dl>
          <dt>Placa</dt>
          <dd>{{ carro.placa }}</dd>
          <dt>Modelo</dt>
          <dd>{{ carro.modelo }}</dd>
          <dt>Cor</dt>
          <dd>{{ carro.cor }}</dd>
        </dl>
        <p>Veículos estacionados ou com histórico de movimentações não podem ser excluídos.</p>
        <div class="actions">
          <button
            class="button"
            type="button"
            autofocus
            [disabled]="cadastro.cadastrando()"
            (click)="cadastro.cancelarExclusao()"
          >
            Cancelar
          </button>
          <button
            class="button button-danger"
            type="button"
            [disabled]="cadastro.cadastrando()"
            (click)="cadastro.excluir()"
          >
            {{ cadastro.cadastrando() ? 'Excluindo…' : 'Confirmar exclusão' }}
          </button>
        </div>
        @if (cadastro.cadastrando()) {
          <p role="status">Excluindo o veículo {{ carro.placa }}…</p>
        }
      }
    </dialog>
  `,
  styleUrl: './exclusao-veiculo.css',
})
export class ExclusaoVeiculo {
  protected readonly cadastro = inject(CadastroVeiculoService);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    afterRenderEffect({
      mixedReadWrite: () => {
        const dialogo = this.dialogo().nativeElement;
        if (this.cadastro.exclusao()) {
          if (!dialogo.open) dialogo.showModal?.();
        } else if (dialogo.open) dialogo.close();
      },
    });
  }

  protected cancelar(event: Event) {
    event.preventDefault();
    this.cadastro.cancelarExclusao();
  }
}
