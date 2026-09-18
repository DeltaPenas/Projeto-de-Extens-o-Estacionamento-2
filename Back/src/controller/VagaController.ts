import { Request, Response } from "express";
import { VagaService } from "../service/VagaService";

const vagaService = new VagaService();

export class VagaController {

    async criar(req: Request, res: Response) {
        try {
            const { numero, andarId } = req.body;

            if (!numero || !andarId) {
                return res.status(400).json({ erro: "numero e andarId são obrigatórios" });
            }

            const vaga = await vagaService.criar(numero, andarId);
            return res.status(201).json(vaga);
        } catch (error: any) {
            return res.status(400).json({ erro: error.message });
        }
    }

    async listarTodas(req: Request, res: Response) {
        try {
            const vagas = await vagaService.listarTodas();
            return res.status(200).json(vagas);
        } catch (error: any) {
            return res.status(500).json({ erro: "Erro ao listar vagas" });
        }
    }

    async listarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const vaga = await vagaService.listarPorId(id);
            return res.status(200).json(vaga);
        } catch (error: any) {
            return res.status(404).json({ erro: error.message });
        }
    }

    async atualizar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const { numero, andarId } = req.body;

            const vaga = await vagaService.atualizar(id, { numero, andarId });
            return res.status(200).json(vaga);
        } catch (error: any) {
            return res.status(400).json({ erro: error.message });
        }
    }

    async deletar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            await vagaService.deletar(id);
            return res.status(204).send();
        } catch (error: any) {
            return res.status(400).json({ erro: error.message });
        }
    }
}