import type {Request, Response} from 'express';
import { RegistroService } from '../service/RegistroService';
import { responderErro } from '../errors/ResponderError';
import { AppError } from '../errors/AppError';

const registroService = new RegistroService();



export class RegistroController{
    async listar(req: Request, res: Response) {
        try {
            return res.status(200).json(await registroService.listarHistorico(req.query));
        } catch (error) {
            return responderErro(res, error);
        }
    }
     
async ocupar(req: Request, res: Response) {
    try {
            const { carroid, vagaid } = req.body;

            // validando os camnpos recebidos
            if (!Number.isInteger(carroid) ||carroid <= 0 ||!Number.isInteger(vagaid) || vagaid <= 0) {
                return res.status(400).json({
                    erro: "carroid ou vagaid Invalidos"
                });
            }

            // solicitando o registro de vagas do service
            const registro = await registroService.ocuparVaga(
                carroid,
                vagaid
            );

            return res.status(201).json(registro);

            //adicionando mensagens para conflito de negocios
            } catch (error) {
                if (error instanceof AppError) return responderErro(res, error);
                const mensagem = error instanceof Error
                    ? error.message
                    : "Erro desconhecido";

                const errosDeValidacao = [
                    "Carro não encontrado",
                    "Vaga não encontrada",
                    "Carro já possui uma entrada ativa",
                    "Vaga já está ocupada"
                ];

                if (errosDeValidacao.includes(mensagem)) {
                    return res.status(409).json({
                        erro: mensagem
                    });
                }

                console.error("Erro ao registrar entrada:", error);

                return res.status(500).json({
                    erro: "Erro interno ao registrar entrada"
                });
            }

    }


    async liberar(req: Request, res: Response) {
    try {
        const registroId = req.body?.registroId;

        if (!Number.isInteger(registroId) || registroId <= 0) {
            return res.status(400).json({
                erro: "registroId é obrigatório e deve ser um número inteiro positivo"
            });
        }

        const registro = await registroService.liberarVaga(registroId);
        return res.status(200).json(registro);
    } catch (error) {
        return responderErro(res, error);
    }
}
}
