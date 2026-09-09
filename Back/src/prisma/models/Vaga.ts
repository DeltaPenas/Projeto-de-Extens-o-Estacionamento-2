import { Andar } from "./Andar";

export class Vaga{

    id: number;
    numero: number;
    andar : Andar;


    constructor(id : number, numero: number, andar: Andar)
    {
        this.id = id;
        this.numero = numero;
        this.andar = andar;
    }
}