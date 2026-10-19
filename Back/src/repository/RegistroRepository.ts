import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class RegistroRepository{
    async buscarAtivoPorVaga(vagaId:number){
        return prisma.registroEstacionamentos.findFirst({
            where:{
                vagaId:vagaId
            }
        })
    }

    async buscarAtivoPorCarro(carroId:number){
        return prisma.registroEstacionamentos.findFirst({
            where:{
                carroId:carroId
            }
        })
    }

    async registrarEntrada(carroId: number, vagaId: number){
    return prisma.registroEstacionamentos.create({
        data: {
            carroId: carroId,
            vagaId: vagaId,
            entrada: new Date()
        },
        include: { 
            carro: true, 
            vaga: true 
        } 
    });
}
      async buscarAtivoPorPlaca(placa: string) {
    return prisma.registroEstacionamentos.findFirst({
        where: {
            carro: {             
                placa: placa     
            },
            saida: null          
        }
    });
}

    async registrarSaida(id:number){
        return prisma.registroEstacionamentos.update({
            where:{id},
            data:{saida: new Date()},
            include:{carro:true, vaga:true}
        })
    }
}