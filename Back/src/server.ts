import express from "express";
import vagaRoutes from "./routes/VagasRoutes";
import carroRoutes from "./routes/CarroRoutes";
import {PrismaClient} from "@prisma/client";


const app = express();
app.use(express.json());
app.use("/carros", carroRoutes);
app.use("/vagas", vagaRoutes);

const PORTA = 3000;
app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});