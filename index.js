const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const { send } = require("express/lib/response");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.kowtn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    await client.connect();
    const servicesCollection = client.db("t-collection").collection("services");

    app.get("/services", async (req, res) => {
      const services = await servicesCollection.find({}).toArray();
      res.send(services);
    });

    app.get("/buyNow/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await servicesCollection.findOne(query);
      res.send(product);
    });
  } finally {
    // client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running t-collection");
});

app.listen(port, () => {
  console.log("running port", port);
});
