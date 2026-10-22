import { Carro, RegistroAtivo, Vaga } from './parking';

export function isCarro(value: unknown): value is Carro {
  if (!value || typeof value !== 'object') return false;
  const carro = value as Carro;
  return (
    Number.isInteger(carro.id) &&
    carro.id > 0 &&
    typeof carro.placa === 'string' &&
    carro.placa.trim().length > 0 &&
    typeof carro.modelo === 'string' &&
    carro.modelo.trim().length > 0 &&
    typeof carro.cor === 'string' &&
    carro.cor.trim().length > 0
  );
}

export function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function isRegistroAtivo(value: unknown, vaga: Vaga): value is RegistroAtivo {
  if (!value || typeof value !== 'object') return false;
  const registro = value as RegistroAtivo;
  return (
    Number.isInteger(registro.id) &&
    registro.id > 0 &&
    registro.vagaId === vaga.id &&
    registro.saida === null &&
    isDate(registro.entrada) &&
    isCarro(registro.carro) &&
    registro.carroId === registro.carro.id
  );
}
