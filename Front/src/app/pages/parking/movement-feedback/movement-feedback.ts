import { DatePipe } from '@angular/common';
import { afterRenderEffect, Component, ElementRef, inject, viewChild } from '@angular/core';
import { RegistrosService } from '../../../core/services/registros.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-movement-feedback',
  imports: [DatePipe, Icon],
  template: `
    @if (registros.movimentacaoPendente(); as pendente) {
      <div class="notice entry-feedback" role="status">
        <app-icon name="car" />
        <p>
          Registrando a {{ pendente.operacao === 'entrada' ? 'entrada' : 'saída' }} de
          <strong>{{ pendente.carro.placa }}</strong> na vaga
          {{ pendente.vaga.numero.toString().padStart(2, '0') }}…
        </p>
      </div>
    }
    @if (registros.resultado(); as resultado) {
      <section
        #feedback
        class="notice entry-feedback"
        [class.entry-success]="resultado.tipo === 'success'"
        [class.entry-warning]="resultado.tipo !== 'success'"
        [class.exit-feedback]="resultado.operacao === 'saida'"
        [attr.role]="resultado.tipo === 'success' ? 'status' : 'alert'"
      >
        <app-icon [name]="resultado.tipo === 'success' ? 'check' : 'warning'" />
        <div class="entry-feedback-content">
          <h2>
            {{
              resultado.tipo === 'success'
                ? resultado.operacao === 'entrada'
                  ? 'Última entrada registrada'
                  : 'Última saída registrada'
                : resultado.tipo === 'error'
                  ? resultado.operacao === 'entrada'
                    ? 'Entrada não registrada'
                    : 'Saída não registrada'
                  : resultado.operacao === 'entrada'
                    ? 'Não foi possível confirmar a entrada'
                    : 'Não foi possível confirmar a saída'
            }}
          </h2>
          <p>{{ resultado.mensagem }}</p>
          @if (resultado.registro; as registro) {
            <dl class="entry-confirmation">
              <div>
                <dt>Registro</dt>
                <dd>{{ registro.id }}</dd>
              </div>
              <div>
                <dt>Vaga</dt>
                <dd>{{ registro.vaga.numero.toString().padStart(2, '0') }}</dd>
              </div>
              <div>
                <dt>Placa</dt>
                <dd>{{ registro.carro.placa }}</dd>
              </div>
              <div>
                <dt>Modelo</dt>
                <dd>{{ registro.carro.modelo }}</dd>
              </div>
              <div>
                <dt>Cor</dt>
                <dd>{{ registro.carro.cor }}</dd>
              </div>
              <div>
                <dt>Entrada</dt>
                <dd>{{ registro.entrada | date: 'dd/MM/yyyy HH:mm:ss' }}</dd>
              </div>
              @if (resultado.operacao === 'saida' && registro.saida) {
                <div>
                  <dt>Saída</dt>
                  <dd>{{ registro.saida | date: 'dd/MM/yyyy HH:mm:ss' }}</dd>
                </div>
              }
            </dl>
          } @else {
            <p>
              Solicitação: {{ resultado.carro.placa }} · vaga
              {{ resultado.vaga.numero.toString().padStart(2, '0') }}.
            </p>
          }
        </div>
        <button
          class="icon-button"
          type="button"
          aria-label="Dispensar mensagem da movimentação"
          (click)="registros.limparResultado()"
        >
          <app-icon name="close" />
        </button>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .entry-feedback {
      margin-bottom: 20px;
    }
    .entry-feedback-content {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    h2 {
      font-size: 13px;
    }
    .entry-success {
      background: #eaf7ef;
      border-color: #cbe6d5;
      color: #24734a;
    }
    .entry-warning {
      background: #fff7f3;
      border-color: #f1ddd1;
      color: #8b543e;
    }
    .entry-confirmation {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 28px;
      margin: 12px 0 0;
    }
    dt {
      font-size: 10px;
    }
    dd {
      margin: 2px 0 0;
      font-weight: 600;
    }
  `,
})
export class MovementFeedback {
  protected readonly registros = inject(RegistrosService);
  private readonly feedback = viewChild<ElementRef<HTMLElement>>('feedback');

  constructor() {
    afterRenderEffect({
      mixedReadWrite: () => {
        this.registros.resultado();
        this.feedback()?.nativeElement.scrollIntoView?.({ block: 'nearest' });
      },
    });
  }
}
