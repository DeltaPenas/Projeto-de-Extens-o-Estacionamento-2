export interface Vaga {
  id: number;
  numero: number;
}

export interface Carro {
  id: number;
  placa: string;
  modelo: string;
  cor: string;
}

// Estados da interface; GET /vagas ainda não informa ocupação.
export type Disponibilidade = 'livre' | 'ocupada' | 'desconhecida' | 'nao-cadastrada';

export interface DetalhesOcupacao {
  veiculo: Carro;
  entrada: string;
}
