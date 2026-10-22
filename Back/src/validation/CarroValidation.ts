import { AppError } from "../errors/AppError";

type DadosCarro = { placa: string; modelo: string; cor: string };

export function validarCarroId(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError("ID do veículo deve ser um número inteiro positivo");
  }
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    throw new AppError("ID do veículo deve ser um número inteiro positivo");
  }
  return id;
}

export function validarDadosCarro(body: unknown, completo: true): DadosCarro;
export function validarDadosCarro(
  body: unknown,
  completo?: false,
): Partial<DadosCarro>;
export function validarDadosCarro(
  body: unknown,
  completo = false,
): Partial<DadosCarro> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("Informe os dados do veículo");
  }
  const entrada = body as Record<string, unknown>;
  const dados: Partial<DadosCarro> = {};
  for (const campo of ["placa", "modelo", "cor"] as const) {
    if (!completo && !Object.hasOwn(entrada, campo)) continue;
    const value = entrada[campo];
    if (typeof value !== "string" || !value.trim()) {
      throw new AppError("Placa, modelo e cor devem ser textos preenchidos");
    }
    dados[campo] =
      campo === "placa"
        ? value.replace(/[\s-]/g, "").toUpperCase()
        : value.trim();
  }
  if (Object.keys(dados).length === 0)
    throw new AppError("Informe os dados a alterar");
  if (dados.placa && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(dados.placa)) {
    throw new AppError("Informe uma placa válida com 7 caracteres");
  }
  if ((dados.modelo?.length ?? 0) > 80 || (dados.cor?.length ?? 0) > 40) {
    throw new AppError(
      "Modelo deve ter até 80 caracteres e cor até 40 caracteres",
    );
  }
  return dados;
}
