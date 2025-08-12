import { Server } from "socket.io";

export function setupSocket(httpServer: any) {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("region:subscribe", ({ rx, ry }) => {
      socket.join(`r:${rx}:${ry}`);
    });
    socket.on("region:unsubscribe", ({ rx, ry }) => {
      socket.leave(`r:${rx}:${ry}`);
    });
  });

  return io;
}
