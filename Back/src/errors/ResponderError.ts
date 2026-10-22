// src/errors/responderErro.ts
import { Response } from "express";
import { AppError } from "./AppError";

export function responderErro(res: Response, error: unknown) {
    if (error instanceof AppError) {
        return res.status(error.status).json({ erro: error.message });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno" });
}