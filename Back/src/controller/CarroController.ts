import type {Request, Response} from "express";
import { CarroService } from "../service/CarroService";

const carroService = new CarroService();

export class CarroController{

    async criar(req: Request, res: Response){
        try
        {
            const {placa, modelo, cor} = req.body;

            if(!placa){
                return res.status(400).json({ erro: "id e placa são obrigatórios" });
            }

            const carro = await carroService.criar(placa, modelo, cor);
            return res.status(201).json(carro);

        }
        catch (error: any){
            return res.status(400).json({erro: error.message})
        }
    }
    async listarTodos(req: Request, res: Response)
    {
        try{
            const carros = await carroService.listarTodas();
            return res.status(200).json(carros);
        }catch(error: any){
            return res.status(400).json({erro: error.message})
        }
    }

    async listarPorId(req: Request, res: Response) {
            try {
                const id = Number(req.params.id);
                const carro = await carroService.listarPorId(id);
                return res.status(200).json(carro);
            } catch (error: any) {
                return res.status(404).json({ erro: error.message });
            }
    }
    async listarPorModelo(req : Request, res : Response){
        try{
            const modelo = String(req.params.modelo);
            const carro = await carroService.listarCarroPorModelo(modelo);
            return res.status(200).json(carro);

        }catch(error: any){
            return res.status(400).json({erro: error.message})
        }
    }
    async atualizar(req: Request, res: Response) {
            try {
                const id = Number(req.params.id);
                const { placa, modelo, cor } = req.body;
    
                const vaga = await carroService.atualizar(id, { placa, modelo, cor });
                return res.status(200).json(vaga);
            } catch (error: any) {
                return res.status(400).json({ erro: error.message });
            }
        }
    async deletar(req: Request, res: Response) {
            try {
                const id = Number(req.params.id);
                await carroService.deletar(id);
                return res.status(204).send();
            } catch (error: any) {
                return res.status(400).json({ erro: error.message });
            }
        }
    



}