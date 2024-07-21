const express = require("express");
const bodyParser = require("body-parser");
const schedule = require("node-schedule");
const {
  connectBaileys,
  sendWhatsAppMessage,
  sendWhatsAppImageMessage,
} = require("./whatsapp");
const moment = require("moment-timezone");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const port = 4545;

app.use(bodyParser.json());
app.use(cors()); // Habilita CORS

const uri =
  "mongodb+srv://rodrigo:rodrigo@cluster0.id8iq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

let database;
let Task;
global.baileysConnection = null;

async function initializeMongo() {
  try {
    await client.connect();
    console.log("Conectado a MongoDB Atlas");
    database = client.db("myFirstDatabase");
    Task = database.collection("myCollection");
  } catch (error) {
    console.error("Error al conectar MongoDB Atlas:", error);
  }
}

async function initializeServer() {
  await initializeMongo();

  global.baileysConnection = await connectBaileys();

  app.use((req, res, next) => {
    req.Task = Task;
    next();
  });

  app.use(taskRoutes);
}

initializeServer().catch((error) => {
  console.error("Error al iniciar el server:", error);
});

app.post("/send-message", async (req, res) => {
  const { phoneNumber, message, imagePath, caption } = req.body;

  if (!phoneNumber || (!message && !imagePath)) {
    return res
      .status(400)
      .json({ error: "phoneNumber y (message o imagePath) son requeridos" });
  }

  try {
    const sock = global.baileysConnection;

    if (imagePath) {
      await sendWhatsAppImageMessage(sock, phoneNumber, imagePath, caption);
    } else if (message) {
      await sendWhatsAppMessage(sock, phoneNumber, message);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error al enviar el mensaje de WhatsApp:", error);
    res.status(500).json({ error: "Error al enviar el mensaje de WhatsApp" });
  }
});

// Endpoint para programar mensajes de WhatsApp
app.post("/schedule-message", async (req, res) => {
  const { phoneNumber, message, date } = req.body;

  if (!phoneNumber || !message || !date) {
    return res
      .status(400)
      .json({ error: "phoneNumber, message y date son requeridos" });
  }

  try {
    const scheduledDate = moment.tz(date, "America/Lima").toDate();

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    console.log(`Programando mensaje para ${scheduledDate}`);

    schedule.scheduleJob(scheduledDate, async () => {
      console.log(
        `Intentando enviar mensaje programado a ${phoneNumber}: ${message}`
      );
      try {
        const sock = global.baileysConnection;
        await sendWhatsAppMessage(sock, phoneNumber, message);
        console.log(`Mensaje programado enviado a ${phoneNumber}: ${message}`);
      } catch (error) {
        console.error(
          "Error al enviar el mensaje programado de WhatsApp:",
          error
        );
      }
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("Error al programar el mensaje de WhatsApp:", error);
    res
      .status(500)
      .json({ error: "Error al programar el mensaje de WhatsApp" });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
