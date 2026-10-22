import {CarroRepository} from "../repository/CarroRepository";
import {RegistroRepository} from "../repository/RegistroRepository";
import {VagaRepository} from "../repository/VagaRepository";
import { AppError } from "../errors/AppError";
import { consultarHistorico } from "./consulta-historico";
import { Prisma } from '@prisma/client';




const carroRepository = new CarroRepository();
const vagaRepository = new VagaRepository();
const registroRepository = new RegistroRepository();
export class RegistroService{
    listarHistorico(query: Record<string, unknown>) {
        return registroRepository.listarHistorico(consultarHistorico(query));
    }
    
    async ocuparVaga(carroId: number, vagaId: number) {
        const carro = await carroRepository.listarPorId(carroId);

        if (!carro) {
            throw new Error("Carro não encontrado");
        }

        const vaga = await vagaRepository.listarPorId(vagaId);

        if (!vaga) {
            throw new Error("Vaga não encontrada");
        }

        const registroAtivoVaga =
            await registroRepository.buscarAtivoPorVaga(vagaId);

        if (registroAtivoVaga) {
            throw new Error("Vaga já está ocupada");
        }

        const registroAtivoCarro =
            await registroRepository.buscarAtivoPorCarro(carroId);

        if (registroAtivoCarro) {
            throw new Error("Carro já possui uma entrada ativa");
        }

        try {
            return await registroRepository.registrarEntrada(carro.id, vaga.id);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new AppError('O veículo ou a vaga foi removido. Atualize os cadastros antes de registrar a entrada', 404);
            }
            throw error;
        }
    }


  async liberarVaga(registroId: number) {
    const registro = await registroRepository.buscarPorId(registroId);
    if (!registro) {
        throw new AppError("Registro não encontrado", 404);
    }

    const encerrados = await registroRepository.encerrarSeAtivo(registroId);
    if (encerrados === 0) {
        throw new AppError("Este registro já foi encerrado", 409);
    }

    return registroRepository.buscarPorId(registroId);
}
}
