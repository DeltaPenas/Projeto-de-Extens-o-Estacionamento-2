// A numeração e o alinhamento físico ficam aqui, sem depender dos IDs do banco.
export const PARKING_ROWS = [
  { numeros: Array.from({ length: 18 }, (_, i) => i + 1), startColumn: 0, y: 68, superior: true },
  {
    numeros: Array.from({ length: 9 }, (_, i) => i + 19),
    startColumn: 4.5,
    y: 284,
    superior: false,
  },
] as const;

export const SLOT_WIDTH = 48;
export const SLOT_HEIGHT = 104;
export const PHYSICAL_CAPACITY = PARKING_ROWS.reduce((total, row) => total + row.numeros.length, 0);
