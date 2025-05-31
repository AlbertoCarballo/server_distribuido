const http = require("http");
const mongoose = require("mongoose");
const Mensaje = require("./models/Mensaje");
const Usuario = require("./models/Usuarios");

const server = http.createServer();
const io = require("socket.io")(server, {
    cors: { origin: "*" }
});

mongoose.connect("mongodb://localhost:27017/chat_distribuido", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Conectado a MongoDB");
}).catch(err => {
    console.error("Error conectando a MongoDB:", err);
});

io.on("connection", (socket) => {
    console.log("Se ha conectado un cliente:", socket.id);

    socket.broadcast.emit("chat_message", {
        usuario: "info",
        mensaje: "Se ha unido un nuevo papuh"
    });

    socket.on("chat_message", async (data) => {
        const nuevoMensaje = new Mensaje(data);
        await nuevoMensaje.save();
        io.emit("chat_message", data);
    });

    socket.on("registrar", async (data, callback) => {
        const { nombreUsuario, correo, contraseña } = data;
        const ipCliente = socket.handshake.address;

        try {
            const existe = await Usuario.findOne({ nombreUsuario });
            if (existe) {
                return callback({ success: false, mensaje: "El nombre de usuario ya existe" });
            }

            const nuevoUsuario = new Usuario({ nombreUsuario, correo, contraseña, ip: ipCliente });
            await nuevoUsuario.save();

            return callback({ success: true, mensaje: "Usuario registrado", usuario: nuevoUsuario });
        } catch (err) {
            console.error(err);
            return callback({ success: false, mensaje: "Error al registrar usuario" });
        }
    });

    socket.on("login", async ({ nombreUsuario, contraseña }, callback) => {
        try {
            const usuario = await Usuario.findOne({ nombreUsuario });

            if (!usuario) {
                return callback({ success: false, mensaje: "Usuario no encontrado" });
            }

            if (usuario.contraseña !== contraseña) {
                return callback({ success: false, mensaje: "Contraseña incorrecta" });
            }

            usuario.ip = socket.handshake.address;
            await usuario.save();

            return callback({ success: true, mensaje: "Login exitoso", usuario });
        } catch (err) {
            console.error(err);
            return callback({ success: false, mensaje: "Error en el servidor" });
        }
    });
});

server.listen(3001, '0.0.0.0', () => {
    console.log("Servidor escuchando en el puerto 3001");
});
