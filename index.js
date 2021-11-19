const { MongoClient } = require("mongodb");
const objectId = require("mongodb").ObjectId;
require("dotenv").config();
const admin = require("firebase-admin");

const express = require("express");
const cors = require("cors");

const serviceAccount = require("./happy-home-mh-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const port = process.env.PORT || 5000;

// Middelware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d3pnh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("happyHome");
    const apartmentsCollection = database.collection("apartments");
    const bookingCollection = database.collection("bookig");
    const usersCollection = database.collection("users");
    const ratingCollection = database.collection("rating");

    // GET API
    app.get("/apartments", async (req, res) => {
      const cursor = apartmentsCollection.find({});
      const apartments = await cursor.toArray();
      res.send(apartments);
    });

    // GET API Rating
    app.get("/rating", async (req, res) => {
      const cursor = ratingCollection.find({});
      const rating = await cursor.toArray();
      res.json(rating);
    });
    // Get Singal Apartment
    app.get("/apartment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) };
      const apartment = await apartmentsCollection.findOne(query);
      res.send(apartment);
    });

    // Get All orders
    app.get("/bookings", async (req, res) => {
      const cursor = bookingCollection.find({});
      const bookings = await cursor.toArray();
      res.send(bookings);
    });

    // Get a User Orders Api
    app.get("/booking", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = bookingCollection.find(query);
      const booking = await cursor.toArray();
      res.json(booking);
    });

    // Get admin user
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // Add A apartmet POST API
    app.post("/apartments", async (req, res) => {
      const places = req.body;
      const result = await apartmentsCollection.insertOne(places);
      res.json(result);
    });

    // add Orders Api
    app.post("/booking", async (req, res) => {
      const order = req.body;
      order.createAt = new Date();
      const result = await bookingCollection.insertOne(order);
      res.json(result);
    });

    // Post Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // POST Rating
    app.put("/rating", async (req, res) => {
      const rating = req.body;
      const filter = { email: rating?.user?.email };
      const options = { upsert: true };
      const updateDoc = { $set: rating };
      const result = await ratingCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "You do not have to eccec this Section" });
      }
    });

    // delete Api Apartment Collection
    app.delete("/apartments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) };
      const result = await apartmentsCollection.deleteOne(query);
      res.json(result);
    });

    // delete orders Api
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: objectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("WellCome Happy to Home!");
});

app.listen(port, () => {
  console.log(`Happy Home listening on ${port}`);
});
