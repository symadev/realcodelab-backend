require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');


const app = express();

const PORT = process.env.PORT || 5000;

// Example usage of jsonwebtoken:
// const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET, { expiresIn: '1h' });

//middleWire
app.use(cors())
app.use(express.json())





const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cn4mz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();

    const userCollection = client.db("RealCodeLab").collection("user");




    app.post('/jwt', (req, res) => {

      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token });
    });




    //middleware process
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next(); // bar
      });

    }

    app.post('/user', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });



    
    app.post('/signup', async (req, res) => {
      const user = req.body;


      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.status(400).send({ message: 'User already exists' });
      }

      // Save new user
      const result = await userCollection.insertOne(user);

      // Generate token
      const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res.send({ token, user });
    });




    app.post('/login',verifyToken, async (req, res) => {
      const { email, password } = req.body;
      const existingUser = await userCollection.findOne({ email });

      if (!existingUser || existingUser.password !== password) {
        return res.status(401).send({ message: 'Invalid credentials' });
      }
      res.send({  user: existingUser });
    });
















































    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
