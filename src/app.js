import express from "express";
import morgan from "morgan"
import { register } from "./controllers/auth.controller.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.post("/api/auth/register", register);


export default app;