const mongoose = require("mongoose");
const Usuario = require("../models/Usuarios");
const Mensaje = require("../models/Mensaje");
const Chat = require("../models/Chat");
const obtenerSiguienteChatId = require("../utils/obtenerSiguienteChatId");

async function inicializarBaseDeDatos() {
    try {
        await mongoose.connect("mongodb://localhost:27017/chat_distribuido");
        console.log("Conectado a MongoDB");

        // Limpiar colecciones
        await Usuario.deleteMany({});
        await Mensaje.deleteMany({});
        // Nota: No borramos chats para no afectar esa colección
        console.log("Usuarios y mensajes limpiados");

        // Insertar usuarios dummy
        const usuarioCount = await Usuario.countDocuments();
        if (usuarioCount === 0) {
            await Usuario.insertMany([
                { nombreUsuario: "dummy", correo: "dummy@example.com", contraseña: "dummy", ip: "0.0.0.0" },
                { nombreUsuario: "dummy2", correo: "dummy2@example.com", contraseña: "dummy2", ip: "0.0.0.1" },
                { nombreUsuario: "dummy3", correo: "dummy3@example.com", contraseña: "dummy3", ip: "0.0.0.2" },
            ]);
            console.log("Usuarios dummy creados");
        }

        // Obtener un chatId existente para asociar mensajes dummy
        const chatExistente = await Chat.findOne();
        if (!chatExistente) {
            console.log("No existe chat para asignar mensajes dummy. Por favor crea al menos un chat primero.");
            process.exit(1);
        }
        const chatId = chatExistente.chatId;

        // Insertar mensajes dummy
        const mensajeCount = await Mensaje.countDocuments();
        if (mensajeCount === 0) {
            await Mensaje.insertMany([
                { chatId, usuario: "info", mensaje: "Mensaje inicial del sistema" },
                { chatId, usuario: "dummy2", mensaje: "Mensaje dummy 2" },
                { chatId, usuario: "dummy3", mensaje: "Mensaje dummy 3" },
            ]);
            console.log("Mensajes dummy creados");
        }

        console.log("Inicialización completada");
        process.exit(0);
    } catch (error) {
        console.error("Error en la inicialización:", error);
        process.exit(1);
    }
}

inicializarBaseDeDatos();
