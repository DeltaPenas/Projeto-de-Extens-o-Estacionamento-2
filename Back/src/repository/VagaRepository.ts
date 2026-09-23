// @ts-ignore Prisma Client is generated/installed outside this source file.
import { PrismaClient } from "@prisma/client";
 const prisma = new PrismaClient();

 export class VagaRepository {
    async criar(numero:number){
        return prisma.vaga.create({
            data:{numero};
        });
    }
    async listarTodas(){
        return prisma.vaga.findMany({
        });
    }
    async listarPorId(id:number){
        return prisma.vaga.findUnique({
            where:{id};
        })
    }
    async atualizar(id:number,dados:Partial<{numero:number}>){
                return prisma.vaga.update({
            where:{id},
            data:dados;
        })
    }
    async deletar(id:number){
        return prisma.vaga.delete({
            where:{id}
        })
    }
 

async buscarRegistroAtivo(vagaId: number) {
    return prisma.registroEstacionamentos.findFirst({
        where: { vagaId, saida: null }
    });
}
 }
