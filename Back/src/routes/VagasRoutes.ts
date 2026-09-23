import { Router } from "express";
import { VagaController } from "../controller/VagaController";

const router = Router();
const vagaController = new VagaController();

router.post("/", (req:any, res:any) => vagaController.criar(req, res));
router.get("/", (req:any, res:any) => vagaController.listarTodas(req, res));
router.get("/:id", (req:any, res:any) => vagaController.listarPorId(req, res));
router.put("/:id", (req:any, res:any) => vagaController.atualizar(req, res));
router.delete("/:id", (req:  any, res:any) => vagaController.deletar(req, res));

export default router;