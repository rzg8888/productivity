const axios = require("axios");
const fs = require("fs");

async function downloadImage(url, imagePath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(imagePath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function deleteImage(imagePath) {
  fs.unlink(imagePath, (err) => {
    if (err) {
      console.error("Error al eliminar el archivo:", err);
    } else {
      console.log("Archivo eliminado con éxito");
    }
  });
}

module.exports = { downloadImage, deleteImage };
