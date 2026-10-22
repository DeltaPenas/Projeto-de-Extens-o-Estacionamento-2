import { CarroRepository } from "../repository/CarroRepository";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";

function tratarErroPersistencia(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      throw new AppError("Esta placa já está cadastrada", 409);
    if (error.code === "P2025")
      throw new AppError("Veículo não encontrado", 404);
    // A FK também protege o histórico caso uma entrada ocorra durante a exclusão.
    if (error.code === "P2003")
      throw new AppError(
        "Este veículo possui histórico de movimentações e não pode ser excluído",
        409,
      );
  }
  throw error;
}

const carroRepository = new CarroRepository();

export class CarroService {
  async criar(placa: string, modelo: string, cor: string) {
    try {
      return await carroRepository.criar(placa, modelo, cor);
    } catch (error) {
      tratarErroPersistencia(error);
    }
  }

  async listarTodas() {
    return carroRepository.listarTodas();
  }
  async listarPorId(id: number) {
    const carro = await carroRepository.listarPorId(id);

    if (!carro) {
      throw new AppError("Veículo não encontrado", 404);
    }

    return carro;
  }
  async listarCarroPorModelo(modelo: string) {
    return carroRepository.listarPorModelo(modelo);
  }
  async listarPorPlaca(placa: string) {
    const carro = await carroRepository.buscarPorPlaca(placa);

    if (!carro) {
      throw new Error("Carro não encontrado");
    }

    return carro;
  }

  async atualizar(
    id: number,
    dados: Partial<{ placa: string; modelo: string; cor: string }>,
  ) {
    await this.listarPorId(id);
    try {
      return await carroRepository.atualizar(id, dados);
    } catch (error) {
      tratarErroPersistencia(error);
    }
  }

  async deletar(id: number) {
    await this.listarPorId(id);

    const registroAtivo = await carroRepository.buscarRegistoAtivo(id);
    if (registroAtivo) {
      throw new AppError(
        "Não é possível excluir um veículo estacionado. Registre a saída primeiro",
        409,
      );
    }
    if (await carroRepository.possuiHistorico(id)) {
      throw new AppError(
        "Este veículo possui histórico de movimentações e não pode ser excluído",
        409,
      );
    }
    try {
      return await carroRepository.deletar(id);
    } catch (error) {
      tratarErroPersistencia(error);
    }
  }
}
