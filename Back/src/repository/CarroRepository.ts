// @ts-ignore Prisma Client is generated/installed outside this source file.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class CarroRepository {
  async criar(placa: string, modelo: string, cor: string) {
    return prisma.carro.create({
      data: { placa, modelo, cor },
    });
  }
  async listarTodas() {
    return prisma.carro.findMany();
  }

  async listarPorId(id: number) {
    return prisma.carro.findUnique({
      where: { id },
    });
  }
  async listarPorModelo(modelo: string) {
    return prisma.carro.findMany({
      where: { modelo },
    });
  }
  async atualizar(
    id: number,
    dados: Partial<{ placa: string; modelo: string; cor: string }>,
  ) {
    return prisma.carro.update({
      where: { id },
      data: dados,
    });
  }
  async deletar(id: number) {
    return prisma.carro.delete({
      where: { id },
    });
  }
  async possuiHistorico(carroId: number) {
    const registro = await prisma.registroEstacionamentos.findFirst({
      where: { carroId },
      select: { id: true },
    });
    return registro !== null;
  }
  async buscarRegistoAtivo(carroId: number) {
    return prisma.registroEstacionamentos.findFirst({
      where: {
        carroId: carroId,
        saida: null,
      },
    });
  }
  async buscarPorPlaca(placa: string) {
    return prisma.carro.findUnique({
      where: {
        placa: placa,
      },
    });
  }
}
