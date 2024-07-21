// const { MongoClient } = require("mongodb");

// const uri =
//   "mongodb+srv://rodrigo:rodrigo@cluster0.id8iq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// const client = new MongoClient(uri);

// async function run() {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB Atlas");

//     const database = client.db("myFirstDatabase");
//     const collection = database.collection("myCollection");

//     // Ejemplo: Insertar un documento
//     const doc = { name: "John Doe", age: 25, address: "123 Main St" };
//     const result = await collection.insertOne(doc);
//     console.log(`A document was inserted with the _id: ${result.insertedId}`);
//   } finally {
//     await client.close();
//   }
// }

// run().catch(console.dir);
