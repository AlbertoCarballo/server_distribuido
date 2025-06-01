// models/Chat.js
const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
    chatId: Number,
    nombre: String,
    participantes: [String], // Nombres de usuario
});

module.exports = mongoose.model("Chat", ChatSchema);
