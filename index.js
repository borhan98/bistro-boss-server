const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// Middlewares 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.94a08qg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)

        const menuCollection = client.db("BistroResturent").collection("menu");
        const reviewCollection = client.db("BistroResturent").collection("reviews");
        const cartCollection = client.db("BistroResturent").collection("carts");
        const userCollection = client.db("BistroResturent").collection("users");

        // Custom middlewares
        // Token verify
        const verifyToken = async (req, res, next) => {
            const token = req.headers?.authorization?.split(" ")[1];
            if (!token) {
                return res.status(401).send({ message: "Unauthorized access" });
            }
            jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "Unauthorized access" });
                }
                req.decoded = decoded;
                next();
            })
        }

        // Admin verify
        const verifyAdmin = async (req, res, next) => {
            const tokenEmail = req.decoded.email;
            const query = { email: tokenEmail };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: "Forbidden access" });
            }
            next();
        }

        /*--------------------------------------------------
                    jwt related APIs
        ---------------------------------------------------*/
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: "1h" });
            res.send({ token });
        })

        /*--------------------------------------------------
                        Menu related APIs
        ---------------------------------------------------*/
        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        })

        app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
            const newItem = req.body;
            const result = await menuCollection.insertOne(newItem);
            res.send(result);
        })

        /*--------------------------------------------------
                        Carts related APIs
        ---------------------------------------------------*/
        app.get("/carts", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        app.post("/carts", async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem);
            res.send(result);
        })

        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })

        /*--------------------------------------------------
                        Reviews related APIs
        ---------------------------------------------------*/
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        /*--------------------------------------------------
                        Users related APIs
        ---------------------------------------------------*/
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        // Check isAdmin
        app.get("/users/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const tokenEmail = req.decoded.email;
            if (email !== tokenEmail) {
                return res.status(403).send({ message: "Forbidden access" });
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })

        app.post("/users", async (req, res) => {
            const newUser = req.body;
            const query = { email: newUser.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "User already existing", insertedId: null })
            }
            const result = await userCollection.insertOne(newUser);
            res.send(result);
        })

        app.patch("/users/admin/:email", verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const updatedUser = {
                $set: {
                    role: "admin"
                }
            }
            const result = await userCollection.updateOne(query, updatedUser);
            res.send(result);
        })

        app.delete("/users/:email", verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Resturent is running...")
})

app.listen(port, () => {
    console.log("The resturent is running on port", port);
})