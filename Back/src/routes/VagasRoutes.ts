import { Router } from "express";
import { VagaController } from "../controller/VagaController";

const router = Router();
const vagaController = new VagaController();

router.post("/", (req, res) => vagaController.criar(req, res));
router.get("/", (req, res) => vagaController.listarTodas(req, res));
router.get("/:id", (req, res) => vagaController.listarPorId(req, res));
router.put("/:id", (req, res) => vagaController.atualizar(req, res));
router.delete("/:id", (req, res) => vagaController.deletar(req, res));

export default router;