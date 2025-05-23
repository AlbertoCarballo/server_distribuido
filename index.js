const http = require("http");
const server = http.createServer();
const io = require("socket.io")(server, {
    cors: { origin: "*" }
});

io.on("connection", (socket) => {
    console.log("se ha conectado");

    socket.broadcast.emit("chat_message", {
        usuario: "info",
        mensaje: "se ha unido un nuevo papuh"
    });

    socket.on("chat_message", (data) => {
        io.emit("chat_message", data);
    });
});

// Escuchar en todas las interfaces de red (incluye tu IP local)
server.listen(3001, '0.0.0.0', () => {
    console.log("Servidor escuchando en el puerto 3001");
});
