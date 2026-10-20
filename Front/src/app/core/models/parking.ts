export interface Vaga {
  id: number;
  numero: number;
}

export interface VagaStatus extends Vaga {
  // Contrato de GET /vagas/status: true significa ocupada.
  status: boolean;
}

export interface VagaComDisponibilidade extends Vaga {
  disponibilidade: Exclude<Disponibilidade, 'nao-cadastrada'>;
}

export interface Carro {
  id: number;
  placa: string;
  modelo: string;
  cor: string;
}

// Cadastro e ocupação são consultados separadamente.
export type Disponibilidade = 'livre' | 'ocupada' | 'desconhecida' | 'nao-cadastrada';

export interface DetalhesOcupacao {
  veiculo: Carro;
  entrada: string;
}
