
export class Carro{

    id: number;
    placa: string;
    modelo: string;
    cor: string;

    constructor(id: number, placa: string, modelo: string, cor: string){
        this.id = id;
        this.placa = placa;
        this.modelo = modelo;
        this.cor = cor;
    }
}