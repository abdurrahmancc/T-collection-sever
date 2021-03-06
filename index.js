const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { json } = require("express/lib/response");
require("dotenv").config();
const port = process.env.PORT || 5000;

// app.use(cors());

app.use(
  cors({
    credentials: true,
    crossDomain: true,
    origin: ["https://t-collection-eaf74.firebaseapp.com", "http://localhost:3000"],
  })
);
app.use(express.json());

//verify json web token
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    if (decoded) {
      req.decoded = decoded;
      next();
    }
  });
};

//stripy
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//mongodb
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
    const usersCollection = client.db("t-collection").collection("users");
    const adminCollection = client.db("t-collection").collection("admin");
    const orderCollection = client.db("t-collection").collection("order");
    const paymentCollection = client.db("t-collection").collection("payment");
    const reviewCollection = client.db("t-collection").collection("review");

    //review
    app.post("/review", verifyToken, async (req, res) => {
      const info = req.body;
      const result = await reviewCollection.insertOne(info);
      res.send(result);
    });

    //review
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find({}).sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // all-payments
    app.get("/all-payments", verifyToken, async (req, res) => {
      const result = await paymentCollection.find({}).toArray();
      res.send(result);
    });

    ///admin
    app.get("/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // payment method
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { totalPrice } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalPrice * 100,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.patch("/order/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const payment = req.body.payment;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updateOrder = await orderCollection.updateOne(filter, updateDoc);
      res.send({ updateOrder, result });
    });

    //update available
    app.patch("/update-available/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const info = req.body.available;
      const updateDoc = {
        $set: {
          available: info,
        },
      };
      const result = await servicesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/order-payment/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    app.get("/get-order/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    // delete order
    app.delete("/order-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    //post order
    app.post("/order", verifyToken, async (req, res) => {
      const orderInfo = req.body;
      const result = await orderCollection.insertOne(orderInfo);
      res.send(result);
    });

    //all user
    app.get("/all-user", verifyToken, async (req, res) => {
      const users = await usersCollection.find({}).toArray();
      res.send(users);
    });

    //delete user
    app.delete("/user-delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //delete admin
    app.delete("/admin-delete/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await adminCollection.deleteOne(query);
      res.send(result);
    });

    //add admin
    app.put("/user/admin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      const admin = await adminCollection.insertOne(user);
      res.send(result);
    });

    //add admin
    app.put("/update-user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const info = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: info,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get("/update-profileUser/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
      res.send(result);
    });

    app.get("/user/admin", verifyToken, async (req, res) => {
      const result = await adminCollection.find({}).toArray();
      res.send(result);
    });

    // sign with access token
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const userInfo = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: userInfo,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: "" }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
      res.send({ token, result });
    });

    // add product
    app.post("/add-product", verifyToken, async (req, res) => {
      const info = req.body;
      const product = await servicesCollection.insertOne(info);
      res.send(product);
    });

    // delete product
    app.delete("/product-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });

    // all products
    app.get("/all-products", verifyToken, async (req, res) => {
      const products = await servicesCollection.find({}).toArray();
      res.send(products);
    });

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
