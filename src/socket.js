import { io } from "socket.io-client";

export const socket = io("https://scribble-balckend.onrender.com", {
  transports: ["websocket", "polling"], // force transports
  withCredentials: true
});
