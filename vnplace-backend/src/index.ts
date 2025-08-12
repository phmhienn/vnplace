import express from "express";
import http from "http";
import cors from "cors";
import { api } from "./api";
import { config } from "./config";
import { setupSocket } from "./socket";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", api);

const server = http.createServer(app);
const io = setupSocket(server);
app.set("io", io);

server.listen(config.port, () => {
  console.log("Backend listening on", config.port);
});
import { dbPing } from "./db";
dbPing().catch(console.error);
