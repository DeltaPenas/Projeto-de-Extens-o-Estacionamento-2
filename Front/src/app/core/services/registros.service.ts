import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  // Sem chamadas HTTP até a definição e validação dos contratos de movimentação.
  readonly recursos = {
    consultarOcupacao: false,
    registrarEntrada: false,
    registrarSaida: false,
  } as const;
}
