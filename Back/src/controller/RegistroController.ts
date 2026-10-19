import type {Request, Response} from 'express';
import { RegistroService } from '../service/RegistroService';

const registroService = new RegistroService();



export class RegistroController{
     async ocupar(req: Request, res: Response) {
        try {
            const { placa, vagaId } = req.body;

            if (!placa || !vagaId) {
                return res.status(400).json({ erro: "placa e vagaId são obrigatórios" });
            }

            const registro = await registroService.ocuparVaga(placa, Number(vagaId));
            return res.status(201).json(registro);
        } catch (error) {
            return (res, error);
        }
    }

    async liberar(req: Request, res: Response) {
        try {
            const { placa } = req.body;

            if (!placa) {
                return res.status(400).json({ erro: "placa é obrigatória" });
            }

            const registro = await registroService.liberarVaga(placa);
            return res.status(200).json(registro);
        } catch (error) {
            return res.status(500).json({erro:"erro ao liberar vagas "})
        }
    }
}