
import { VagaRepository } from "../repository/VagaRepository";

const vagaRepository = new VagaRepository();

export class VagaService {

    async criar(numero: number) {
    
        

        return vagaRepository.criar(numero);
    }

    async listarTodas() {
        return vagaRepository.listarTodas();
    }

    async listarPorId(id: number) {
        const vaga = await vagaRepository.listarPorId(id);

        if (!vaga) {
            throw new Error("Vaga não encontrada");
        }

        return vaga;
    }

    async atualizar(id: number, dados: Partial<{ numero: number}>) {
        await this.listarPorId(id);
        return vagaRepository.atualizar(id, dados);
    }

    async deletar(id: number) {
        await this.listarPorId(id);

        const registroAtivo = await vagaRepository.buscarRegistroAtivo(id);
        if (registroAtivo) {
            throw new Error("Não é possível deletar uma vaga ocupada");
        }

        return vagaRepository.deletar(id);
    }

    async listarStatus() {
        const vagas = await vagaRepository.listarTodas();
        const resultado : { id: number; numero: number; status: boolean }[] = [];
        for (const vaga of vagas){
            const registroAtivo = await vagaRepository.buscarRegistroAtivo(vaga.id);
            resultado.push({
                id: vaga.id,
                numero:vaga.numero,
                status:registroAtivo ? true : false
            });

        }
        return resultado;
    }
}