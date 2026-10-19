import {CarroRepository} from "../repository/CarroRepository";
import {RegistroRepository} from "../repository/RegistroRepository";
import {VagaRepository} from "../repository/VagaRepository";

const carroRepository = new CarroRepository();
const vagaRepository = new VagaRepository();
const registroRepository = new RegistroRepository();

export class RegistroService{
    async ocuparVaga(placa:string, vagaId:number){
    const carro = await carroRepository.buscarPorPlaca(placa);
    if(!carro){
        throw new Error("carro não encontrado");
    }
    
    const vaga = await vagaRepository.listarPorId(vagaId);
    if(!vaga){
        throw new Error("vaga não encontrada");
    }
    const registroAtivoVaga = await registroRepository.buscarAtivoPorVaga(vagaId);
    if(registroAtivoVaga){
        throw new Error("vaga ocupada");
    }

    const registroAtivoCarro = await registroRepository.buscarAtivoPorPlaca(placa);
    if(registroAtivoCarro){
        throw new Error("carro já está em uma vaga");
    }

    const novoRegistro = await registroRepository.registrarEntrada(carro.id, vaga.id);
    return novoRegistro;
}

   async liberarVaga(placa: string) {
        const registroAtivo = await registroRepository.buscarAtivoPorPlaca(placa);
        if (!registroAtivo) {
            throw new Error("Veículo não encontrado ou já liberado.");
        }


        const registroAtualizado = await registroRepository.registrarSaida(registroAtivo.id);

        return registroAtualizado;
    }
}