import { Router } from "express";
import { CarroController } from "../controller/CarroController";

const router = Router();
const carroController = new CarroController();

router.post("/", (req:any, res:any) => carroController.criar(req, res));
router.get("/", (req:any, res:any) => carroController.listarPorModelo(req, res));
router.get("/:id", (req:any, res:any) => carroController.listarPorId(req, res));
router.put("/:id", (req:any, res:any) => carroController.atualizar(req, res));
router.delete("/:id", (req:  any, res:any) => carroController.deletar(req, res));

export default router;