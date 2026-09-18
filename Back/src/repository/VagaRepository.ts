import {PrismaClient} from "@prisma/client";
 const prisma = new PrismaClient();

 export class VagaRepository {
    async criar(numero:number, andarId: number){
        return prisma.vaga.create({
            data:{numero, andarId},
            include:{andar:true}
        });
    }
    async listarTodas(){
        return prisma.vaga.findMany({
            include:{andar:true}
        });
    }
    async listarPorId(id:number){
        return prisma.vaga.findUnique({
            where:{id},
            include:{andar:true}
        })
    }
    async atualizar(id:number,dados:Partial<{numero:number,andarId:number}>){
                return prisma.vaga.update({
            where:{id},
            data:dados,
            include:{andar:true}
        })
    }
    async deletar(id:number){
        return prisma.vaga.delete({
            where:{id}
        })
    }
 }
