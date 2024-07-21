// En scheduler.js
const schedule = require("node-schedule");
const {
  connectBaileys,
  sendWhatsAppMessage,
  sendWhatsAppImageMessage,
} = require("../whatsapp"); // Asegúrate de importar o definir las funciones que uses
const generateMessage = require("./messageGenerator");
const { deleteImage } = require("./downloadImage");

let scheduledJobs = {};

function scheduleJob(
  id,
  phoneNumber,
  title,
  description,
  time,
  url,
  scheduledDate,
  caption,
  localImagePath
) {
  scheduledJobs[id] = schedule.scheduleJob(scheduledDate, async () => {
    const reminderMessage = generateMessage("reminder", {
      title: title,
      description: description,
      date: scheduledDate,
      time: time,
      url: url,
    });
    try {
      const sock = await connectBaileys();

      // Enviar mensaje de texto con los detalles de la tarea
      await sendWhatsAppMessage(sock, phoneNumber, reminderMessage);

      // Enviar mensaje de imagen con el subtítulo (si existe)
      if (localImagePath) {
        // Aquí usas localImagePath en lugar de imagePath
        console.log("ESTE ES EL LOCAL IMAGE PATH:", localImagePath);

        await sendWhatsAppImageMessage(
          sock,
          phoneNumber,
          localImagePath,
          caption || ""
        );

        // Eliminar el archivo después de enviarlo
        console.log(`Eliminando imagen programada: ${localImagePath}`);
        deleteImage(localImagePath);
      }

      console.log(
        `Mensaje programado enviado a ${phoneNumber}: ${reminderMessage}`
      );
    } catch (error) {
      console.error(
        "Error al enviar el mensaje programado de WhatsApp:",
        error
      );
    }
  });
}

function handleImageOnUpdate(task, localImagePath) {

  const currentTime = new Date();
  const reminderTime = new Date(task.scheduledDate);

  console.log("ESTE ES EL CURRENT TIME:", currentTime);
  console.log("ESTE ES EL REMINDER TIME:", reminderTime);

  if (localImagePath && reminderTime < currentTime) {
    console.log(`Eliminando imagen local: ${localImagePath}`);
    deleteImage(localImagePath);
  }
}

module.exports = { scheduleJob, scheduledJobs, handleImageOnUpdate };
