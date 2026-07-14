import express from "express";
import morgan from "morgan"
import { register, getMe, refreshToken } from "./controllers/auth.controller.js";
import cookieParser from "cookie-parser";


const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.post("/api/auth/register", register);
app.get("/api/auth/get-me", getMe);
app.get("/api/auth/refresh-token", refreshToken);

export default app;