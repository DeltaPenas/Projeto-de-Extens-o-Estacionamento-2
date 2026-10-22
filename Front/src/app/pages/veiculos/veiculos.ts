import { DatePipe } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CadastroCarroRequest } from '../../core/models/parking';
import { CadastroVeiculoService } from '../../core/services/cadastro-veiculo.service';
import { ParkingDataService } from '../../core/services/parking-data.service';
import { Icon } from '../../shared/icon/icon';

function normalizar(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

@Component({
  selector: 'app-veiculos',
  imports: [ReactiveFormsModule, DatePipe, Icon],
  templateUrl: './veiculos.html',
  styleUrl: './veiculos.css',
})
export class Veiculos {
  protected readonly data = inject(ParkingDataService);
  protected readonly cadastro = inject(CadastroVeiculoService);
  protected readonly pesquisa = signal('');
  protected readonly veiculosFiltrados = computed(() => {
    const termo = normalizar(this.pesquisa().trim());
    return this.data.carros
      .items()
      .filter((veiculo) =>
        normalizar(`${veiculo.placa} ${veiculo.modelo} ${veiculo.cor}`).includes(termo),
      );
  });
  private readonly feedback = viewChild<ElementRef<HTMLElement>>('feedback');
  private readonly formulario = viewChild<ElementRef<HTMLFormElement>>('formulario');

  constructor() {
    this.data.carros.ensureLoaded();
    afterRenderEffect({
      mixedReadWrite: () => {
        this.cadastro.resultado();
        this.feedback()?.nativeElement.scrollIntoView?.({ block: 'nearest' });
      },
    });
  }

  protected invalido(campo: keyof CadastroCarroRequest) {
    const control = this.cadastro.formulario.controls[campo];
    return control.touched && control.invalid;
  }

  protected cadastrarVeiculo() {
    this.cadastro.cadastrar();
    const campo = Object.entries(this.cadastro.formulario.controls).find(
      ([, control]) => control.invalid,
    );
    if (campo)
      this.formulario()?.nativeElement.querySelector<HTMLInputElement>(`#${campo[0]}`)?.focus();
  }
}
