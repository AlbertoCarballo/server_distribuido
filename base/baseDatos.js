const mongoose = require("mongoose");
const Usuario = require("../models/Usuarios");
const Mensaje = require("../models/Mensaje");
const obtenerSiguienteChatId = require("../utils/obtenerSiguienteChatId");

async function inicializarBaseDeDatos() {
    try {
        // 🔧 Eliminar opciones obsoletas
        await mongoose.connect("mongodb://localhost:27017/chat_distribuido");
        console.log("Conectado a MongoDB");

        // Crear usuario dummy si no existe
        const usuarioCount = await Usuario.countDocuments();
        if (usuarioCount === 0) {
            await new Usuario({
                nombreUsuario: "dummy",
                correo: "dummy@example.com",
                contraseña: "dummy",
                ip: "0.0.0.0"
            }).save();
            console.log("Usuario dummy creado");
        }

        // Crear mensaje dummy si no existe
        const mensajeCount = await Mensaje.countDocuments();
        if (mensajeCount === 0) {
            const chatId = await obtenerSiguienteChatId(); // usa el contador autoincremental
            await new Mensaje({
                chatId,
                usuario: "info",
                mensaje: "Mensaje inicial del sistema"
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
