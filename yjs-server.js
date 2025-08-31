import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.js";

const server = http.createServer();

const wss = new WebSocketServer({ server, path: "/yjs" });

wss.on("connection", (ws, req) => setupWSConnection(ws, req));

server.listen(4000, () => {
  console.log("Yjs WebSocket server running on port 4000");
});

