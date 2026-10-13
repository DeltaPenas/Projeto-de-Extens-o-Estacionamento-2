import {CarroRepository} from "../repository/CarroRepository";
import {RegistroRepository} from "../repository/RegistroRepository";
import {VagaRepository} from "../repository/VagaRepository";

const carroRepository = new CarroRepository();
const vagaRepository = new VagaRepository();
const registroRepository = new RegistroRepository();

export class RegistroService{
    async ocuparVaga(carroId:number, vagaId:number){
        const carro = await carroRepository.listarPorId(carroId);
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

        const registroAtivoCarro = await registroRepository.buscarAtivoPorCarro(carroId);
        if(registroAtivoCarro){
            throw new Error("carro já está em uma vaga");
        }
    }

    async liberarVaga(registroId:number){
        const registro = await registroRepository.buscarAtivoPorVaga(registroId);
        if(!registro){
            throw new Error("registro não encontrado");
        }

        return registroRepository.registrarSaida(registroId);
    }
}