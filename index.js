const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const Mensaje = require("./models/Mensaje");
const Usuario = require("./models/Usuarios");
const Chat = require("./models/Chat");
const obtenerSiguienteChatId = require("./utils/obtenerSiguienteChatId");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

let listaDeIPs = [];

mongoose.connect("mongodb://localhost:27017/chat_distribuido")
    .then(() => console.log("Conectado a MongoDB"))
    .catch(err => console.error("Error conectando a MongoDB:", err));

app.get("/usuarios/ips", async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, "ip");
        const ips = usuarios
            .map(u => u.ip)
            .filter(ip => ip && !["::1", "127.0.0.1", "localhost"].includes(ip))
            .map(ip => `http://${ip}:3001`);
        listaDeIPs = [...new Set(ips)];
        res.json(listaDeIPs);
    } catch (err) {
        console.error("Error al obtener IPs:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.get("/mensajes", async (req, res) => {
    try {
        const mensajes = await Mensaje.find();
        res.json({ success: true, mensajes });
    } catch (err) {
        console.error("Error al obtener mensajes:", err);
        res.status(500).json({ success: false, mensaje: "Error interno del servidor" });
    }
});

app.post("/mensajes/replicar", async (req, res) => {
    const { _id, chatId, usuario, mensaje } = req.body;
    try {
        const existe = await Mensaje.findById(_id);
        if (existe) return res.json({ success: true, mensaje: "Ya existe" });

        const nuevoMensaje = new Mensaje({ _id, chatId, usuario, mensaje });
        await nuevoMensaje.save();
        res.json({ success: true });
    } catch (err) {
        console.error("Error al replicar mensaje:", err);
        res.status(500).json({ success: false });
    }
});

app.post("/shutdown", (req, res) => {
    console.log("🛑 Apagando servidor...");
    res.json({ mensaje: "Servidor detenido" });
    setTimeout(() => process.exit(0), 1000);
});

io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    socket.broadcast.emit("chat_message", {
        usuario: "info",
        mensaje: "Se ha unido un nuevo papuh"
    });

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

    socket.on("enviar_mensaje", async ({ chatId, usuario, mensaje }) => {
        try {
            const { ObjectId } = require("mongoose").Types;
            const mensajeId = new ObjectId();

            const nuevoMensaje = new Mensaje({ _id: mensajeId, chatId, usuario, mensaje });
            await nuevoMensaje.save();

            io.emit("chat_message", { _id: mensajeId, chatId, usuario, mensaje });

            for (const ip of listaDeIPs) {
                if (ip.includes("localhost") || ip.includes("127.0.0.1")) continue;
                try {
                    await axios.post(`${ip}/mensajes/replicar`, {
                        _id: mensajeId, chatId, usuario, mensaje
                    });
                    console.log(`✅ Replicado en ${ip}`);
                } catch (err) {
                    console.warn(`❌ Error replicando en ${ip}`);
                }
            }
        } catch (err) {
            console.error("Error guardando mensaje:", err);
        }
    });

    socket.on("obtener_mensajes", async (chatId, callback) => {
        try {
            const mensajes = await Mensaje.find({ chatId });
            return callback({ success: true, mensajes });
        } catch (err) {
            console.error("Error obteniendo mensajes:", err);
            return callback({ success: false, mensaje: "No se pudieron obtener los mensajes" });
        }
    });

    socket.on("login", async ({ nombreUsuario, contraseña, ip }, callback) => {
        try {
            const usuario = await Usuario.findOne({ nombreUsuario });
            if (!usuario || usuario.contraseña !== contraseña)
                return callback({ success: false, mensaje: "Credenciales inválidas" });

            usuario.ip = ip || socket.handshake.address.replace(/^.*:/, "");
            await usuario.save();

            return callback({ success: true, mensaje: "Login exitoso", usuario });
        } catch (err) {
            console.error(err);
            return callback({ success: false, mensaje: "Error en el servidor" });
        }
    });

    socket.on("registrar", async ({ nombreUsuario, correo, contraseña, ip }, callback) => {
        try {
            const existe = await Usuario.findOne({ nombreUsuario });
            if (existe) return callback({ success: false, mensaje: "El usuario ya existe" });

            const nuevoUsuario = new Usuario({ nombreUsuario, correo, contraseña, ip });
            await nuevoUsuario.save();

            return callback({ success: true });
        } catch (err) {
            console.error("Error en registro:", err);
            return callback({ success: false, mensaje: "Error del servidor" });
        }
    });
});

server.listen(3001, "0.0.0.0", () => {
    console.log("Servidor escuchando en el puerto 3001");
    setTimeout(sincronizarMensajes, 2000);
});

async function sincronizarMensajes() {
    try {
        const res = await axios.get("http://localhost:3001/usuarios/ips");
        const ips = res.data;

        const mensajesLocales = await Mensaje.find();
        const idsLocales = new Set(mensajesLocales.map(m => m._id.toString()));

        for (const ip of ips) {
            try {
                if (ip.includes("localhost") || ip.includes("127.0.0.1")) continue;

                const resp = await axios.get(`${ip}/mensajes`);
                const mensajesRemotos = resp.data.mensajes;

                for (const msg of mensajesRemotos) {
                    if (!idsLocales.has(msg._id)) {
                        const nuevo = new Mensaje(msg);
                        await nuevo.save();
                        console.log(`📥 Mensaje sincronizado desde ${ip}`);
                    }
                }
            } catch (err) {
                console.warn(`⚠️ No se pudo sincronizar con ${ip}`);
            }
        }

        console.log("✅ Sincronización de mensajes completada.");
    } catch (err) {
        console.error("❌ Error en sincronización:", err);
    }
}
