import type { Request, Response } from "express";
import { CarroService } from "../service/CarroService";
import { responderErro } from "../errors/ResponderError";
import {
  validarCarroId,
  validarDadosCarro,
} from "../validation/CarroValidation";

const carroService = new CarroService();

export class CarroController {
  async criar(req: Request, res: Response) {
    try {
      const { placa, modelo, cor } = validarDadosCarro(req.body, true);

      const carro = await carroService.criar(placa, modelo, cor);
      return res.status(201).json(carro);
    } catch (error: unknown) {
      return responderErro(res, error);
    }
  }
  async listarTodos(req: Request, res: Response) {
    try {
      const carros = await carroService.listarTodas();
      return res.status(200).json(carros);
    } catch (error: any) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarPorId(req: Request, res: Response) {
    try {
      const id = validarCarroId(req.params.id);
      const carro = await carroService.listarPorId(id);
      return res.status(200).json(carro);
    } catch (error: unknown) {
      return responderErro(res, error);
    }
  }
  async listarPorModelo(req: Request, res: Response) {
    try {
      const modelo = String(req.params.modelo);
      const carro = await carroService.listarCarroPorModelo(modelo);
      return res.status(200).json(carro);
    } catch (error: any) {
      return res.status(400).json({ erro: error.message });
    }
  }
  async atualizar(req: Request, res: Response) {
    try {
      const id = validarCarroId(req.params.id);
      const dados = validarDadosCarro(req.body);

      const carro = await carroService.atualizar(id, dados);
      return res.status(200).json(carro);
    } catch (error: unknown) {
      return responderErro(res, error);
    }
  }
  async deletar(req: Request, res: Response) {
    try {
      const id = validarCarroId(req.params.id);
      await carroService.deletar(id);
      return res.status(204).send();
    } catch (error: unknown) {
      return responderErro(res, error);
    }
  }
}
