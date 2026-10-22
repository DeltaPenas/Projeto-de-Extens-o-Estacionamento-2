import { Router } from "express";
import { RegistroController } from "../controller/RegistroController";

const router = Router();
const registroController = new RegistroController();
router.get("/", (req, res) => registroController.listar(req, res));

router.post("/entrada", (req:any, res:any) => registroController.ocupar(req, res));
router.post("/saida", (req:any, res:any) => registroController.liberar(req, res));

export default router;
