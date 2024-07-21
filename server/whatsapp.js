const {
  DisconnectReason,
  useMultiFileAuthState,
  default: makeWASocket,
} = require("@whiskeysockets/baileys");
const fs = require("fs");

let baileysSocket = null;

async function sendWhatsAppFile(
  sock,
  phoneNumber,
  filePath,
  fileName,
  caption = ""
) {
  try {
    const jid = `${phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    const fileBuffer = fs.readFileSync(filePath);
    const sentMsg = await sock.sendMessage(jid, {
      document: fileBuffer,
      mimetype: "application/octet-stream", // Tipo MIME genérico para datos binarios
      fileName: fileName,
      caption: caption,
    });
    console.log("Archivo enviado con éxito");
    console.log(sentMsg);
  } catch (error) {
    console.error("Error al enviar el archivo:", error);
  }
}

// Ejecuta la función de prueba

async function sendWhatsAppImageMessage(sock, phoneNumber, imagePath, caption) {
  try {
    const jid = `${phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    const image = fs.readFileSync(imagePath);
    const sentMsg = await sock.sendMessage(jid, {
      image: image,
      caption: caption,
    });
    console.log("Mensaje de imagen de WhatsApp enviado con éxito");
    console.log(sentMsg);
  } catch (error) {
    console.error("Error al enviar el mensaje de imagen de WhatsApp:", error);
  }
}

async function sendWhatsAppMessage(sock, phoneNumber, messageText) {
  try {
    const jid = `${phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    const sentMsg = await sock.sendMessage(jid, { text: messageText });
    console.log("Mensaje de WhatsApp enviado con éxito");
    console.log(sentMsg);
  } catch (error) {
    console.error("Error al enviar el mensaje de WhatsApp:", error);
    if (error.message && error.message.includes("Timed Out")) {
      console.log(
        "Detectado error de tiempo de espera. Intentando reconectar..."
      );
      await connectBaileys();
      await sendWhatsAppMessage(sock, phoneNumber, messageText); // Intenta reenviar el mensaje
    }
  }
}

async function connectBaileys() {
  if (baileysSocket && baileysSocket.authState) {
    return baileysSocket;
  }

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("messages.upsert", async (m) => {
    console.log(JSON.stringify(m, undefined, 2));
    const senderJid = m.messages[0].key.remoteJid;
    const fromMe = m.messages[0].key.fromMe;
    const senderName = m.messages[0].pushName || "Usuario";
    let incomingMessage = "";

    // Verificar si es un mensaje de texto extendido
    if (m.messages[0].message && m.messages[0].message.extendedTextMessage) {
      incomingMessage = m.messages[0].message.extendedTextMessage.text;
    }
    // Verificar si es un mensaje de texto simple
    else if (m.messages[0].message && m.messages[0].message.conversation) {
      incomingMessage = m.messages[0].message.conversation;
    } else {
      console.log(
        senderJid,
        "Mensaje no reconocido o no es un mensaje de texto."
      );
      return;
    }

    console.log(`${senderName} (${senderJid}): ${incomingMessage}`);

    // Si el mensaje proviene de este número de teléfono, no lo proceses
    if (fromMe) {
      return;
    }

    // Aquí puedes agregar lógica adicional para manejar los mensajes recibidos
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update || {};

    if (connection === "open") {
      baileysSocket = sock; // Almacena la conexión en la variable global
      console.log("Conexión abierta con WhatsApp");
    } else if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Intentando reconectar...");
        try {
          await connectBaileys();
        } catch (error) {
          console.error("Error al intentar reconectar:", error);
        }
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

module.exports = {
  connectBaileys,
  sendWhatsAppMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppFile,
};
