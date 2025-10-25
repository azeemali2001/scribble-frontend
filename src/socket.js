// src/socket.js
import { io } from "socket.io-client";

// Use deployed backend URL instead of localhost
export const socket = io("https://scribble-balckend.onrender.com");
