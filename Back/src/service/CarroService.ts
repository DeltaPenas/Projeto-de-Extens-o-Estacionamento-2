import { CarroRepository} from "../repository/CarroRepository";

const carroRepository = new CarroRepository();

export class CarroService{

    async criar(placa: string, modelo : string, cor : string){

        return carroRepository.criar(placa, modelo, cor)
    }

    async listarTodas(){

        return carroRepository.listarTodas();
    }
    async listarPorId(id : number){
        const carro = await carroRepository.listarPorId(id);

        if(!carro){
            throw new Error("Carro não encontrado");
        }

        return carro;
    }
    async listarCarroPorModelo(modelo: string){

        return carroRepository.listarPorModelo(modelo);
    }

    async atualizar(id: number, dados : Partial<{placa: string, modelo: string, cor : string}>){
        await this.listarPorId(id);
        return carroRepository.atualizar(id, dados);
    }

    async deletar(id: number){
        await this.listarPorId(id);

        const registroAtivo = await carroRepository.buscarRegistoAtivo(id);
        if(!registroAtivo){
            throw new Error("Não foi possivel deletar esse carro");
        }

        return carroRepository.deletar(id);
    }

}