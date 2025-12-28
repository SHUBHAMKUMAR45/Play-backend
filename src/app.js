import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();
app.use(cors({
    origin: process.env.CORE_ORIGIN || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(urlencoded({ extended: true , limit: "5mb"}));
app.use(express.static("public"));
app.use(cookieParser());


//routes import 
import UserRouter from "./routes/user.routes.js";


//routes declaration
app.use("/api/v1/users",UserRouter)

export default app;