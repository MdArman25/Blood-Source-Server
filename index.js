const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

// const SSLCommerzPayment = require("sslcommerz-lts");
const port = process.env.PORT || 5000;
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());

console.log(process.env.USER, process.env.PASS);

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.ninjyyh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("token in the middleware", req?.cookies?.token);
  // no token available
  if (!token) {
    return;

    // return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    // console.log("decode");
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // const dbConect = async () => {
    //   try {
    //     console.log("dbConect successfully");
    //   } catch (error) {
    //     console.log(error.message);
    //   }
    // };
    // dbConect();
    const UserCollection = client.db("Blood-Source").collection("Users");
    const DonationRequestCollection = client
      .db("Blood-Source")
      .collection("DonationRequest");

    const verifyAdmin = async (req, res, next) => {
      const email = req?.user?.email;
      console.log("admin ", email);
      const query = { email: email };
      const user = await UserCollection.findOne(query);
      console.log(user);
      const isAdmin = user?.role === "admin";
      console.log(isAdmin, "isadmin ni re");
      if (isAdmin) {
        console.log("fbhjhsdfgha");

        next();
        // return res.status(403).send({ message: "forbidden access" });
      }
    };
    // const verifyVolunteer = async (req, res, next) => {
    //   const email = req?.user?.email;
    //   console.log("admin ", email);
    //   const query = { email: email };
    //   const user = await UserCollection.findOne(query);
    //   console.log(user);
    //   const isVolunteer = user?.role === "Volunteer";
    //   console.log("Volunteer user ", isVolunteer);
    //   if (isVolunteer) {
    //     next();
    //     // return
    //     // return res.status(403).send({ message: "forbidden access" });
    //   }
    // };

    app.get("/admin-status", verifyToken, async (req, res) => {
      const users = await UserCollection.estimatedDocumentCount();
      // const menusItems = await MenuCollection.estimatedDocumentCount();
      // const orders = await paymentsCollection.estimatedDocumentCount();

      // const result = await paymentsCollection
      //   .aggregate([
      //     {
      //       $group: {
      //         _id: null,
      //         totalRevenue: {
      //           $sum: "$price",
      //         },
      //       },
      //     },
      //   ])
      //   .toArray();
      // // console.log(result[0]);
      // const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      // const revenue = payments.reduce(
      //   (total, payment) => total + payment.price,
      //   0
      // );
      // const revenuePars = parseFloat(revenue.toFixed(2));
      console.log(users);
      // console.log(users, menusItems, orders, revenue);
      res.send({
        // orders,
        // menusItems,
        users,
        // revenue,
      });
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("jwt user", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      // console.log("this is token", token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/users", async (req, res) => {
      const User = req.body;
      console.log("auth user", User);
      const query = { email: User?.email };
      const Exitinguser = await UserCollection.findOne(query);
      if (Exitinguser) {
        console.log("user ase");
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await UserCollection.insertOne(User);
      console.log(result);
      return res.send(result);
    });
    app.post("/donation-request", verifyToken, async (req, res) => {
      const DonationRequest = req.body;
      console.log(DonationRequest);

      const result = await DonationRequestCollection.insertOne(DonationRequest);
      console.log(result);
      return res.send(result);
    });
    app.post("/logout", verifyToken, async (req, res) => {
      const user = req?.body;
      console.log("logging out", user);
      res.clearCookie("token").send({ success: true });
    });

    app.get("/Users", verifyToken, async (req, res) => {
      console.log("cheack to token", req?.user?.email);
      // console.log(req.user);
      const result = await UserCollection.find().toArray();
      // console.log(result);
      res.send(result);
    });
    app.get("/donation_request/:email", verifyToken, async (req, res) => {
      // const user = req.body;
      const email = req?.params?.email
      console.log(email,"arman");
      if (email === req?.user?.email) {
        const query = {
          requester_email: email,
        };
        const result = await DonationRequestCollection.find(query).toArray();

        console.log(",",result);
        res.send(result);
      }
    });
    app.get(
      "/Admin_donation_request",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const admin = req?.user?.email;
        const query = { email: admin };
        console.log(query, "i hoite hoi na etai");

        const result = await DonationRequestCollection.find().toArray();
        console.log(result);
        res.send(result);
      }
    );

    app.get("/admin/:email", verifyToken, verifyAdmin, async (req, res) => {
      console.log("asoe hlit hocche", req?.user?.email);
      const email = req.params.email;

      console.log(req?.user, "emaillllllll", email);
      if (email !== req?.user?.email) {
        console.log("provlem");
        return res.status(403).send({ message: "unauthorized Access" });
      }
      const query = { email: email };
      const user = await UserCollection.findOne(query);
      console.log("admin request user", user?.role);
      let isAdmin = false;
      if (user?.role === "admin") {
        // isAdmin = user?.role=='admin'
        isAdmin = true;
        console.log(isAdmin, "sadhdiowh");
      }
      res.send({ isAdmin });
    });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const UpdatedUser = {
        $set: {
          role: "admin",
        },
      };
      const result = await UserCollection.updateOne(query, UpdatedUser);
      console.log(result);

      res.send(result);
    });

    // modarator
    // app.get("/moderator/:email", verifyToken,verifyVolunteer, async (req, res) => {
    //   console.log(req?.user?.email);
    //   const email = req?.params?.email;

    //    console.log(req?.user,"emaillllllll",email);
    //   if (email !== req?.user?.email) {
    //     return res.status(403).send({ message: "unauthorized Access" });
    //   }
    //   const query = { email: email };
    //   const user = await UserCollection.findOne(query);
    //   console.log("Volunteer request user", user?.role);
    //   let isVolunteer = false;
    //   if (user.role === "Volunteer") {
    //     isVolunteer = true;
    //     console.log(isVolunteer, "the person is moderator");
    //   }
    //   res.send({isVolunteer});
    // });
    // app.patch("/users/admin/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };

    //   const UpdatedUser = {
    //     $set: {
    //       role: "admin",
    //     },
    //   };
    //   const result = await UserCollection.updateOne(query, UpdatedUser);
    //   console.log(result);

    //   res.send(result);
    // });
    app.put("/user-update", verifyToken, verifyAdmin, async (req, res) => {
      const email = req?.query.email;
      const role = req?.body.role;
      console.log("", email, role);
      const filter = { email: email };

      const update = {
        $set: {
          role: role,
        },
      };
      const options = { upsert: false };

      const result = await UserCollection.updateOne(filter, update, options);
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  console.log(res.send("BISTRO BOSS SERVER SITE IS RUNNING"));
});
app.listen(port, () => {
  console.log(`server is running on this port ${port}`);
});
