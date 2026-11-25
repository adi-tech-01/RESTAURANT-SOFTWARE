import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "tranquil-love-production-6fd5be62.up.railway.app";
export const socket = io(BACKEND_URL);