const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");

const Mensaje = require("./models/Mensaje");
const Usuario = require("./models/Usuarios");
const Chat = require("./models/Chat");
const obtenerSiguienteChatId = require("./utils/obtenerSiguienteChatId");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Conexión a MongoDB
mongoose.connect("mongodb://localhost:27017/chat_distribuido")
    .then(() => console.log("Conectado a MongoDB"))
    .catch(err => console.error("Error conectando a MongoDB:", err));

// ✅ Endpoint para obtener IPs de usuarios
app.get("/usuarios/ips", async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, "ip");
        const ips = usuarios
            .map(u => u.ip)
            .filter(ip => ip && !["::1", "127.0.0.1", "localhost"].includes(ip))
            .map(ip => `http://${ip}:3001`);
        res.json([...new Set(ips)]); // elimina duplicados
    } catch (err) {
        console.error("Error al obtener IPs:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ✅ Conexión de sockets
io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // Notificación global
    socket.broadcast.emit("chat_message", {
        usuario: "info",
        mensaje: "Se ha unido un nuevo papuh"
    });

    // Crear nuevo chat
    socket.on("crear_chat", async ({ nombre, participantes }, callback) => {
        try {
            const chatId = await obtenerSiguienteChatId();
            const nuevoChat = new Chat({ chatId, nombre, participantes });
            await nuevoChat.save();
            return callback({ success: true, mensaje: "Chat creado", chat: nuevoChat });
        } catch (err) {
            console.error(err);
            return callback({ success: false, mensaje: "Error al crear chat" });
        }
    });

    // Enviar mensaje
    socket.on("enviar_mensaje", async ({ chatId, usuario, mensaje }) => {
        try {
            const nuevoMensaje = new Mensaje({ chatId, usuario, mensaje });
            await nuevoMensaje.save();
            io.emit("chat_message", { chatId, usuario, mensaje });
        } catch (err) {
            console.error("Error guardando mensaje:", err);
        }
    });

    // Obtener mensajes
    socket.on("obtener_mensajes", async (chatId, callback) => {
        try {
            const mensajes = await Mensaje.find({ chatId });
            return callback({ success: true, mensajes });
        } catch (err) {
            console.error("Error obteniendo mensajes:", err);
            return callback({ success: false, mensaje: "No se pudieron obtener los mensajes" });
        }
    });

    // Registro de usuario
    socket.on("registrar", async (data, callback) => {
        const { nombreUsuario, correo, contraseña } = data;
        const ipCliente = socket.handshake.address.replace(/^.*:/, ""); // limpia IPv6 mapeada

        try {
            const existe = await Usuario.findOne({ nombreUsuario });
            if (existe) return callback({ success: false, mensaje: "El nombre de usuario ya existe" });

            const nuevoUsuario = new Usuario({ nombreUsuario, correo, contraseña, ip: ipCliente });
            await nuevoUsuario.save();

            return callback({ success: true, mensaje: "Usuario registrado", usuario: nuevoUsuario });
        } catch (err) {
            console.error(err);
            return callback({ success: false, mensaje: "Error al registrar usuario" });
        }
    });

    // Login
    socket.on("login", async ({ nombreUsuario, contraseña }, callback) => {
        try {
            const usuario = await Usuario.findOne({ nombreUsuario });
            if (!usuario) return callback({ success: false, mensaje: "Usuario no encontrado" });
            if (usuario.contraseña !== contraseña) return callback({ success: false, mensaje: "Contraseña incorrecta" });

            const ipCliente = socket.handshake.address.replace(/^.*:/, "");
            usuario.ip = ipCliente;
            await usuario.save();

            return callback({ success: true, mensaje: "Login exitoso", usuario });
        } catch (err) {
            console.error(err);
            return callback({ success: false, mensaje: "Error en el servidor" });
        }
    });
});

// 🟢 Iniciar servidor
server.listen(3001, "0.0.0.0", () => {
    console.log("Servidor escuchando en el puerto 3001");
});
