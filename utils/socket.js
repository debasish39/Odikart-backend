import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Replace with your frontend URL in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);

    socket.on("joinUser", (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on("joinAdmin", () => {
      socket.join("admins");
    });

    socket.on("disconnect", () => {
      console.log("Socket Disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};