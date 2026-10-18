import { Component, computed, input, output } from '@angular/core';
import { DetalhesOcupacao, Disponibilidade, Vaga } from '../../core/models/parking';
import { PARKING_ROWS, SLOT_HEIGHT, SLOT_WIDTH } from '../../core/parking-layout';

export interface ParkingPosition {
  numero: number;
  x: number;
  y: number;
  superior: boolean;
}

export interface ParkingSlot extends ParkingPosition {
  vaga?: Vaga;
  disponibilidade: Disponibilidade;
  cadastroVerificado: boolean;
  ocupacao?: DetalhesOcupacao;
}

export const PARKING_POSITIONS: ParkingPosition[] = PARKING_ROWS.flatMap((row) =>
  row.numeros.map((numero, column) => ({
    numero,
    x: 48 + (row.startColumn + column) * SLOT_WIDTH,
    y: row.y,
    superior: row.superior,
  })),
);

export function associateSlots(vagas: Vaga[], cadastroVerificado: boolean): ParkingSlot[] {
  const byNumber = new Map(vagas.map((vaga) => [vaga.numero, vaga]));
  return PARKING_POSITIONS.map((position) => {
    const vaga = cadastroVerificado ? byNumber.get(position.numero) : undefined;
    return {
      ...position,
      vaga,
      cadastroVerificado,
      disponibilidade: cadastroVerificado && !vaga ? 'nao-cadastrada' : 'desconhecida',
    };
  });
}

export const SLOT_LABELS: Record<Disponibilidade, string> = {
  livre: 'Livre',
  ocupada: 'Ocupada',
  desconhecida: 'Disponibilidade não informada',
  'nao-cadastrada': 'Não cadastrada',
};

@Component({
  selector: 'app-parking-map',
  templateUrl: './parking-map.html',
  styleUrl: './parking-map.css',
})
export class ParkingMap {
  readonly slots = input.required<ParkingSlot[]>();
  readonly selectedNumber = input<number | null>(null);
  readonly selectSlot = output<number>();
  protected readonly width = SLOT_WIDTH;
  protected readonly height = SLOT_HEIGHT;
  protected readonly labels = SLOT_LABELS;
  protected readonly hasUnregistered = computed(() =>
    this.slots().some((slot) => slot.disponibilidade === 'nao-cadastrada'),
  );

  protected accessibleLabel(slot: ParkingSlot) {
    const state = slot.cadastroVerificado
      ? this.labels[slot.disponibilidade]
      : 'Cadastro não verificado';
    return `Vaga ${slot.numero}, ${state}. Ver detalhes`;
  }

  protected selectWithSpace(event: Event, numero: number) {
    event.preventDefault();
    this.selectSlot.emit(numero);
  }
}
