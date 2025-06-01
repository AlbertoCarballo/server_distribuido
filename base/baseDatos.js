// base/baseDatos.js
const mongoose = require("mongoose");
const Usuario = require("../models/Usuarios");
const Mensaje = require("../models/Mensaje");
const Chat = require("../models/Chat");
const obtenerSiguienteChatId = require("../utils/obtenerSiguienteChatId");

async function inicializarBaseDeDatos() {
    try {
        // Conectar sin opciones obsoletas
        await mongoose.connect("mongodb://localhost:27017/chat_distribuido");
        console.log("Conectado a MongoDB");

        // Crear usuario dummy si no existe
        const usuarioCount = await Usuario.countDocuments();
        if (usuarioCount === 0) {
            await new Usuario({
                nombreUsuario: "dummy",
                correo: "dummy@example.com",
                contraseña: "dummy",
                ip: "0.0.0.0",
            }).save();
            console.log("Usuario dummy creado");
        }

        // Crear chat dummy si no existe
        const chatCount = await Chat.countDocuments();
        let chatId;
        if (chatCount === 0) {
            chatId = await obtenerSiguienteChatId();
            await new Chat({
                chatId,
                nombre: "Chat inicial",
                participantes: ["dummy"],
            }).save();
            console.log("Chat dummy creado");
        } else {
            // Obtener un chatId existente para el dummy mensaje
            const chatExistente = await Chat.findOne();
            chatId = chatExistente.chatId;
        }

        // Crear mensaje dummy si no existe
        const mensajeCount = await Mensaje.countDocuments();
        if (mensajeCount === 0) {
            await new Mensaje({
                chatId,
                usuario: "info",
                mensaje: "Mensaje inicial del sistema",
            }).save();
            console.log("Mensaje dummy creado");
        }

        console.log("Inicialización completada");
        process.exit(0);
    } catch (error) {
        console.error("Error en la inicialización:", error);
        process.exit(1);
    }
}

inicializarBaseDeDatos();
