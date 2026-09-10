import type { Carro } from "./Carro";
import type { Vaga } from "./Vaga";

export class RegistroEstacionamento{
    id : number;
    carro : Carro;
    vaga : Vaga;
    entrada : Date;
    saida : Date | null;

    constructor(id: number, carro: Carro, vaga: Vaga, entrada: Date, saida: Date | null){
        this.id = id;
        this.carro = carro;
        this.vaga = vaga;
        this.entrada = entrada;
        this.saida = saida;
    }



    


}