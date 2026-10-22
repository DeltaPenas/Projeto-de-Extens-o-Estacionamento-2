export interface Vaga {
  id: number;
  numero: number;
}

export interface VagaStatus extends Vaga {
  // Contrato de GET /vagas/status: true significa ocupada.
  status: boolean;
  // Ausência do campo é tolerada para exibir o status antigo, sem habilitar movimentações.
  registroAtivo?: RegistroAtivo | null;
}

export interface VagaComDisponibilidade extends Vaga {
  disponibilidade: Exclude<Disponibilidade, 'nao-cadastrada'>;
  ocupacao?: DetalhesOcupacao;
}

export interface Carro {
  id: number;
  placa: string;
  modelo: string;
  cor: string;
}

export interface RegistrarEntradaRequest {
  carroid: number;
  vagaid: number;
}

export interface RegistrarSaidaRequest {
  registroId: number;
}

export interface RegistroAtivo {
  id: number;
  entrada: string;
  saida: null;
  carroId: number;
  vagaId: number;
  carro: Carro;
}

export interface RegistroEntrada {
  id: number;
  entrada: string;
  saida: null;
  carroId: number;
  vagaId: number;
  carro: Carro;
  vaga: Vaga;
}

export interface RegistroSaida extends Omit<RegistroEntrada, 'saida'> {
  saida: string;
}

// Cadastro e ocupação são consultados separadamente.
export type Disponibilidade = 'livre' | 'ocupada' | 'desconhecida' | 'nao-cadastrada';

export interface DetalhesOcupacao {
  registroId: number;
  veiculo: Carro;
  entrada: string;
}
