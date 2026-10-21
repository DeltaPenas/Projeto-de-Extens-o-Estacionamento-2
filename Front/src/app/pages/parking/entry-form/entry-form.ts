import { Component, effect, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Vaga } from '../../../core/models/parking';
import { ParkingDataService } from '../../../core/services/parking-data.service';
import { RegistrosService } from '../../../core/services/registros.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-entry-form',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './entry-form.html',
  styleUrl: './entry-form.css',
})
export class EntryForm {
  readonly vaga = input.required<Vaga>();
  protected readonly data = inject(ParkingDataService);
  protected readonly registros = inject(RegistrosService);
  protected readonly carroId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor() {
    this.data.carros.ensureLoaded();
    effect(() => {
      this.vaga();
      this.carroId.reset('');
    });
  }

  protected submit(event: Event) {
    event.preventDefault();
    if (this.registros.registrandoEntrada()) return;
    this.carroId.markAsTouched();
    const carro = this.data.carros.items().find((item) => item.id === Number(this.carroId.value));
    if (this.carroId.invalid || !carro) return;
    this.registros.registrarEntrada(carro, this.vaga());
  }
}
