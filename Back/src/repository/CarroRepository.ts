// @ts-ignore Prisma Client is generated/installed outside this source file.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


export class CarroRepository{

    async criar(placa: string, modelo: string, cor: string) {
        return prisma.carro.create({
            data:{placa, modelo, cor}
        });
    }
    async listarTodas(){
        return prisma.carro.findMany();
    }

    async listarPorId(id:Number){
        return prisma.carro.findUnique({
            where:{id}
        }
        )
    }
    async listarPorModelo(modelo : string){
        return prisma.carro.findUnique({
            where:{modelo}
        })
    }
    async atualizar(id: number, dados:Partial<{placa:string, modelo : string, cor : string}>){
        return prisma.carro.update({
            where:{id},
            data: dados
        })
    }
    async deletar(id:number){
        return prisma.carro.delete({
            where:{id}
        })
    }

}


