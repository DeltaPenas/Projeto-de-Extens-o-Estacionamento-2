import { AppError } from "../errors/AppError";

export interface ConsultaHistorico {
  page: number;
  limit: number;
  placa?: string;
  dataInicio?: Date;
  dataFim?: Date;
  situacao?: "abertos" | "encerrados";
}

function inteiro(value: unknown, padrao: number, nome: string): number {
  if (value === undefined) return padrao;
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw new AppError(`${nome} deve ser um número inteiro positivo`, 400);
  }
  return Number(value);
}

function data(value: unknown, nome: string): Date | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new AppError(`${nome} deve ser uma data ISO com horário e fuso`, 400);
  }
  // Date.parse normaliza dias inexistentes, como 30/02. Rejeitar essa normalização.
  const dia = value.slice(0, 10);
  if (new Date(`${dia}T00:00:00.000Z`).toISOString().slice(0, 10) !== dia) {
    throw new AppError(`${nome} deve ser uma data válida`, 400);
  }
  return new Date(value);
}

export function consultarHistorico(
  query: Record<string, unknown>,
): ConsultaHistorico {
  const page = inteiro(query.page, 1, "page");
  const limit = inteiro(query.limit, 20, "limit");
  if (limit > 100 || (page - 1) * limit > 2147483647) {
    throw new AppError("Paginação inválida: limit deve ser no máximo 100", 400);
  }
  if (
    query.placa !== undefined &&
    (typeof query.placa !== "string" || query.placa.trim().length > 20)
  ) {
    throw new AppError("placa deve ser um texto de até 20 caracteres", 400);
  }
  const placa =
    typeof query.placa === "string" ? query.placa.trim().toUpperCase() : "";
  const dataInicio = data(query.dataInicio, "dataInicio");
  const dataFim = data(query.dataFim, "dataFim");
  if (dataInicio && dataFim && dataInicio >= dataFim) {
    throw new AppError("dataInicio deve ser anterior a dataFim", 400);
  }
  const situacao = query.situacao;
  if (
    situacao !== undefined &&
    situacao !== "abertos" &&
    situacao !== "encerrados"
  ) {
    throw new AppError("situacao deve ser abertos ou encerrados", 400);
  }
  return {
    page,
    limit,
    ...(placa ? { placa } : {}),
    ...(dataInicio ? { dataInicio } : {}),
    ...(dataFim ? { dataFim } : {}),
    ...(situacao ? { situacao } : {}),
  };
}
