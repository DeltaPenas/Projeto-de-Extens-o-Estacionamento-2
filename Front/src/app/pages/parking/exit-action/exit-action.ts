import {
  afterRenderEffect,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DetalhesOcupacao, Vaga } from '../../../core/models/parking';
import { RegistrosService } from '../../../core/services/registros.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-exit-action',
  imports: [Icon],
  template: `
    <section class="exit-section" aria-labelledby="exit-title">
      <h3 id="exit-title">Registrar saída</h3>
      @if (confirmando()) {
        <div class="exit-confirmation" role="group" aria-labelledby="exit-question">
          <p id="exit-question">
            Confirmar a saída de <strong>{{ ocupacao().veiculo.placa }}</strong> ({{
              ocupacao().veiculo.modelo
            }}) da vaga <strong>{{ vaga().numero.toString().padStart(2, '0') }}</strong
            >?
          </p>
          <p>A vaga será liberada após a confirmação da operação.</p>
          <div class="exit-buttons">
            <button
              #confirmButton
              class="button button-primary"
              type="button"
              [disabled]="registros.registrando()"
              (click)="confirmar()"
            >
              {{ registros.registrandoSaida() ? 'Registrando saída…' : 'Confirmar saída' }}
            </button>
            <button
              class="button"
              type="button"
              [disabled]="registros.registrando()"
              (click)="cancelar()"
            >
              Cancelar
            </button>
          </div>
        </div>
      } @else {
        <button
          #openButton
          class="button"
          type="button"
          [disabled]="registros.registrando()"
          (click)="confirmando.set(true)"
        >
          <app-icon name="arrow" />Registrar saída
        </button>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 23px;
    }
    h3 {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .exit-section > .button {
      width: 100%;
    }
    .exit-confirmation {
      padding: 14px;
      background: #f6f8fc;
      border: 1px solid var(--border);
      border-radius: 7px;
    }
    p {
      margin: 0 0 12px;
      font-size: 12px;
      line-height: 1.7;
      overflow-wrap: anywhere;
    }
    .exit-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class ExitAction {
  readonly vaga = input.required<Vaga>();
  readonly ocupacao = input.required<DetalhesOcupacao>();
  protected readonly registros = inject(RegistrosService);
  protected readonly confirmando = signal(false);
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');
  private readonly openButton = viewChild<ElementRef<HTMLButtonElement>>('openButton');
  private readonly voltarFoco = signal(false);

  constructor() {
    effect(() => {
      this.vaga().id;
      this.ocupacao().registroId;
      this.confirmando.set(false);
    });
    afterRenderEffect(() => {
      if (this.confirmando()) this.confirmButton()?.nativeElement.focus();
      const button = this.openButton();
      if (button && this.voltarFoco()) {
        button.nativeElement.focus();
        this.voltarFoco.set(false);
      }
    });
  }

  protected cancelar() {
    this.confirmando.set(false);
    // O botão reaparece após a renderização; o efeito devolve o foco.
    this.voltarFoco.set(true);
  }

  protected confirmar() {
    if (!this.confirmando() || this.registros.registrando()) return;
    this.registros.registrarSaida(this.vaga(), this.ocupacao());
  }
}
