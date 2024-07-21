const express = require("express");
const router = express.Router();
const {
  scheduleJob,
  scheduledJobs,
  handleImageOnUpdate,
} = require("../utils/scheduler");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const {
  sendWhatsAppMessage,
  sendWhatsAppImageMessage,
} = require("../whatsapp");
const moment = require("moment-timezone");
const generateMessage = require("../utils/messageGenerator");
const { downloadImage } = require("../utils/downloadImage");
const uuidv4 = require("uuid").v4;
const path = require("path");
const fs = require("fs");

router.use(cors());

//CREATE

router.post("/create-task", async (req, res) => {
  const {
    title,
    description,
    date,
    time,
    url,
    phoneNumber,
    imagePath, // Esto debería ser la URL de Firebase Storage
    caption,
  } = req.body;

  // Agregar propiedad createdAt con la fecha y hora actual
  const createdAt = new Date();

  let localImagePath = "";

  // Enviar mensaje de imagen con el subtítulo (si existe)
  if (imagePath) {
    const uniqueFilename = uuidv4() + ".png";
    localImagePath = path.join("./temp_image", uniqueFilename); // Cambia esto a la ruta donde quieres guardar la imagen
    await downloadImage(imagePath, localImagePath);
  }

  const newTask = {
    title,
    description,
    date,
    time,
    url,
    firebaseImagePath: imagePath,
    localImagePath,
    caption,
    createdAt,
  };

  try {
    const result = await req.Task.insertOne(newTask);
    console.log(`Un documento fue insertado con el _id: ${result.insertedId}`);

    const message = generateMessage("newTask", {
      title: title,
      description: description,
      date: date,
      time: time,
      url: url,
    });
    const sock = global.baileysConnection;

    // Enviar mensaje de texto con los detalles de la tarea
    await sendWhatsAppMessage(sock, phoneNumber, message);

    if (imagePath) {
      await sendWhatsAppImageMessage(
        sock,
        phoneNumber,
        localImagePath,
        caption || ""
      );
    }

    try {
      const scheduledDate = moment
        .tz(`${date} ${time}`, "America/Lima")
        .toDate();
      scheduleJob(
        result.insertedId,
        phoneNumber,
        title,
        description,
        time,
        url,
        scheduledDate,
        caption,
        localImagePath
      );
    } catch (error) {
      console.error("Error al programar el trabajo:", error);
      // Aquí puedes decidir si quieres enviar un error 500 o no
    }

    res.status(201).json({ message: "Tarea creada y notificación enviada" });
  } catch (error) {
    console.error("Error al crear la tarea:", error);
    res.status(500).json({ error: "Error al crear la tarea" });
  }
});

// READ
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await req.Task.find().toArray();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las tareas" });
  }
});

// UPDATE

router.put("/update-task/:id", async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    date,
    time,
    url,
    phoneNumber,
    imagePath,
    caption,
  } = req.body;

  // Asegúrate de que todos los campos necesarios están definidos
  if (!title || !description || !date || !time || !url || !phoneNumber) {
    console.log("Faltan campos necesarios en la solicitud de actualización.");
    return res
      .status(400)
      .json({ error: "Por favor, rellena todos los campos necesarios." });
  }

  console.log(`Received update request for task with id: ${id}`);

  try {
    const task = await req.Task.findOne({ _id: new ObjectId(id) });

    if (!task) {
      console.log(`Tarea no encontrada con id: ${id}`);
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    let localImagePath = task.localImagePath;

    if (imagePath || !fs.existsSync(localImagePath)) {
      const uniqueFilename = uuidv4() + ".png";
      localImagePath = path.join("./temp_image", uniqueFilename);
      await downloadImage(imagePath || task.firebaseImagePath, localImagePath);
    }

    const result = await req.Task.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          title,
          description,
          date,
          time,
          url,
          phoneNumber,
          firebaseImagePath: imagePath || task.firebaseImagePath,
          localImagePath,
          caption,
        },
      },
      { new: true }
    );

    const message = generateMessage("updateTask", {
      title: title,
      description: description,
      date: date,
      time: time,
      url: url,
    });
    const sock = global.baileysConnection;
    await sendWhatsAppMessage(sock, phoneNumber, message);

    if (localImagePath) {
      await sendWhatsAppImageMessage(
        sock,
        phoneNumber,
        localImagePath,
        caption || ""
      );
    }

    // Cancelar la tarea programada anterior si existe
    if (scheduledJobs[id]) {
      scheduledJobs[id].cancel();
      delete scheduledJobs[id];
    }

    // Programar nueva tarea
    const scheduledDate = moment.tz(`${date} ${time}`, "America/Lima").toDate();

    scheduleJob(
      id,
      phoneNumber,
      title,
      description,
      time,
      url,
      scheduledDate,
      caption,
      localImagePath
    );

    task.scheduledDate = scheduledDate;
    handleImageOnUpdate(task, localImagePath);

    console.log(`Task updated successfully: ${JSON.stringify(result.value)}`);
    res.status(200).json(result.value);
  } catch (error) {
    console.error("Error al actualizar la tarea:", error);
    res.status(500).json({ error: "Error al actualizar la tarea" });
  }
});

// DELETE

router.delete("/delete-task/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await req.Task.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    res.json({ message: "Tarea eliminada" });
  } catch (error) {
    console.error("Error al eliminar la tarea:", error);
    res.status(500).json({ error: "Error al eliminar la tarea" });
  }
});

// Exporta el router
module.exports = router;
