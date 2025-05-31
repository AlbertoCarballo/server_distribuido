const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
    nombreUsuario: { type: String, required: true, unique: true },
    correo: { type: String, required: true, unique: true },
    contraseña: { type: String, required: true },
    ip: { type: String }
});

module.exports = mongoose.model("Usuarios", UsuarioSchema);
