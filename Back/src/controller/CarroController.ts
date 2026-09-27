import type {Request, Response} from "express";
import { CarroService } from "../service/CarroService";

const carroService = new CarroService();

export class CarroController{

    async criar(req: Request, res: Response){
        try
        {
            const {placa, modelo, cor} = req.body;

            if(!placa || !modelo ||!cor){
                return res.status(400).json({ erro: "id, placa, modelo e cor são obrigatórios" });
            }

            const carro = await carroService.criar(placa, modelo, cor);
            return res.status(201).json(carro);

        }
        catch (error: any){
            return res.status(400).json({erro: error.message})
        }
    }


}