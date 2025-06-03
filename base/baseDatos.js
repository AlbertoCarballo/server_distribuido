const mongoose = require("mongoose");
const Usuario = require("../models/Usuarios");
const Mensaje = require("../models/Mensaje");

async function inicializarBaseDeDatos() {
    try {
        await mongoose.connect("mongodb://localhost:27017/chat_distribuido");
        console.log("Conectado a MongoDB");

        // Limpiar colecciones
        await Usuario.deleteMany({});
        await Mensaje.deleteMany({});
        // No borramos chats
        console.log("Usuarios y mensajes eliminados");

        console.log("Inicialización completada sin insertar datos dummy");
        process.exit(0);
    } catch (error) {
        console.error("Error en la inicialización:", error);
        process.exit(1);
    }
}

inicializarBaseDeDatos();
