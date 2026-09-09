import { numericColumn } from "@prisma/orm-postgres/adapter";

export class Andar{
    id: number;
    numero : number;

    constructor(id: number, numero: number){
        this.id = id;
        this.numero = numero;
    }
}