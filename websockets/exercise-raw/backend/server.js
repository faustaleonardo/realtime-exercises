import http from "http";
import handler from "serve-handler";
import nanobuffer from "nanobuffer";

// these are helpers to help you deal with the binary data that websockets use
import objToResponse from "./obj-to-response.js";
import generateAcceptValue from "./generate-accept-value.js";
import parseMessage from "./parse-message.js";

let connections = [];
const msg = new nanobuffer(50);
const getMsgs = () => Array.from(msg).reverse();

msg.push({
  user: "brian",
  text: "hi",
  time: Date.now(),
});

// serve static assets
const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: "./frontend",
  });
});

server.on("upgrade", (request, socket) => {
  if (request.headers["upgrade"] !== "websocket") {
    socket.end("HTTP/1.1 400 Bad Request");
    return;
  }

  const acceptKey = request.headers["sec-websocket-key"];
  const acceptValue = generateAcceptValue(acceptKey);
  const headers = [
    "HTTP/1.1 101 Web Socket Protocol Handshake",
    "Upgrade: WebSocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptValue}`,
    `Sec-WebSocket-Protocol: json`,
    "\r\n", // telling websocket that we're done with the headers
  ];

  socket.write(headers.join("\r\n"));
  socket.write(objToResponse({ msg: getMsgs() }));
  connections.push(socket);

  // receive message from client
  socket.on("data", (buffer) => {
    const { user, text } = parseMessage(buffer);
    msg.push({
      user,
      text,
      time: Date.now(),
    });

    connections.forEach((s) => {
      s.write(objToResponse({ msg: getMsgs() }));
    });
  });

  socket.on("close", () => {
    connections = connections.filter((s) => s !== socket);
  });

  console.log("upgrade requested!");
});

/*
 *
 * your code goes here
 *
 */

const port = process.env.PORT || 8080;
server.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
