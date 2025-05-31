const Contador = require("../models/Contador");

async function obtenerSiguienteChatId(nombre = "chatId") {
    const resultado = await Contador.findOneAndUpdate(
        { nombre },
        { $inc: { valor: 1 } },
        { new: true, upsert: true }
    );
    return resultado.valor;
}

module.exports = obtenerSiguienteChatId;
