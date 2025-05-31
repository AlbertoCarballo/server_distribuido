const mongoose = require("mongoose");

const contadorSchema = new mongoose.Schema({
    nombre: { type: String, required: true, unique: true },
    valor: { type: Number, default: 1 }
});

module.exports = mongoose.model("Contador", contadorSchema);
