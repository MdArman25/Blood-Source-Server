const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

// const SSLCommerzPayment = require("sslcommerz-lts");
const port = process.env.PORT || 5000;
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173",
  "https://assignment-server-plum.vercel.app"],
    credentials: true,
  })
);
app.use(cookieParser());

console.log(process.env.USER, process.env.PASS);
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    return res.status(401).send({ message: "unauthorized access" });
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
        next();
      }
      // return res.status(403).send({ message: "forbidden access" });
      // if (isAdmin) {
      //   console.log("fbhjhsdfgha");

      //   next();
      //   // return res.status(403).send({ message: "forbidden access" });
      // }
    };
    const verifyVolunteer = async (req, res, next) => {
      const email = req?.user?.email;
      console.log("Volunteer ", email);
      const query = { email: email };
      const user = await UserCollection.findOne(query);
      console.log(user);
      const isVolunteer = user?.role === "Volunteer";
      console.log(isVolunteer, "isVolunteer ni re");
      if (isVolunteer) {
        // return
        next();
        // return res.status(403).send({ message: "forbidden access" });
      }
      // if (isVolunteer) {
      //   console.log("fbhjhsdfgha");

      //   next();
      //   // return res.status(403).send({ message: "forbidden access" });
      // }
    };

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;

      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/admin-status", verifyToken, verifyAdmin, async (req, res) => {
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

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/Users", verifyToken, verifyAdmin, async (req, res) => {
      console.log("cheack to token", req?.user?.email);
      // console.log(req.user);
      const result = await UserCollection.find().toArray();
      // console.log(result);
      res.send(result);
    });

    app.get("/donation_request/:email", verifyToken, async (req, res) => {
      // const user = req.body;
      const email = req?.params?.email;
      console.log(email, "arman");
      if (email === req?.user?.email) {
        const query = {
          requester_email: email,
        };
        const result = await DonationRequestCollection.find(query).toArray();

        console.log(",", result);
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
    app.get("/blood_donation_request", async (req, res) => {
      const donation_status = "pending";
      const query = {
        donation_status: donation_status,
      };

      const result = await DonationRequestCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });
    app.post("/SearchValue", async (req, res) => {
    const search = req.body;
    console.log("search",search);
      // const query = {
      //   donation_status: donation_status,
      // };
      console.log(search);

      // const result = await DonationRequestCollection.find(query).toArray();
      // console.log(result);
      // res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id", id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await DonationRequestCollection.findOne(query);
      console.log(result);
      res.send(result);
    });
    app.get("/donationDetails/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id", id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await DonationRequestCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    // app.get("/donationDetails/:id", verifyToken, async (req, res) => {
 
    //   const id = req.params.id;
    //   console.log("id", id);
    //   const query = {
    //     _id: new ObjectId(id),
    //   };
    //   console.log(query);
    //   const result = await DonationRequestCollection.findOne(query);
    //   console.log(result);
    //   res.send(result);
    // });

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
        console.log(isAdmin, "admin");
      }
      res.send({ isAdmin });
    });

    app.get(
      "/volunteer/:email",
      verifyToken,
      verifyVolunteer,
      async (req, res) => {
        console.log("asoe hlit hocche", req?.user?.email);
        const email = req.params.email;

        console.log(req?.user, "emaillllllll", email);
        if (email !== req?.user?.email) {
          console.log("provlem");
          return res.status(403).send({ message: "unauthorized Access" });
        }
        const query = { email: email };
        const user = await UserCollection.findOne(query);
        console.log("volunteer request user", user?.role);
        let isVolunteer = false;
        if (user?.role === "Volunteer") {
          // isVolunteer = user?.role=='volunteer'
          isVolunteer = true;
          console.log(isVolunteer, "volunteer");
        }
        console.log("request last ");
        res.send({ isVolunteer });
      }
    );
    app.get("/request", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log("pages", page, size);
      console.log("pagination query", page, size);
      const result = await DonationRequestCollection.find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/requestCount", async (req, res) => {
      const count = await DonationRequestCollection.estimatedDocumentCount();
      res.send({ count });
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
    app.put("/donar/:id", verifyToken, async (req, res) => {
      const id = req?.params.id;
      const donar = req?.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const update = {
        $set: {
          donar: donar,
          donation_status: "inprogress",
        },
      };
      console.log(update,id);

      const result = await DonationRequestCollection.updateOne(
        filter,
        update,
        options
      );
      console.log(result);
      res.send(result);
    });

    app.put("/Blood_Request_update/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedDonation = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      console.log("id", id);
      console.log("filter", filter);

      console.log(updatedDonation);

      const Donation = {
        $set: {
          recipient_name: updatedDonation?.recipient_name,
          address: updatedDonation?.address,
          District: updatedDonation?.District,
          Upazila: updatedDonation?.Upazila,
          hospital_name: updatedDonation?.hospital_name,

          donation_date: updatedDonation?.donation_date,
          donation_time: updatedDonation?.donation_time,
          hospital_name: updatedDonation?.hospital_name,
          Request_Message: updatedDonation?.Request_Message,

          donation_status: updatedDonation?.donation_status,
          requester_Name: updatedDonation?.requester_Name,
          requester_email: updatedDonation?.requester_email,
          requester_photo: updatedDonation?.requester_photo,
        },
      };
      console.log(Donation);

      const result = await DonationRequestCollection.updateOne(
        filter,
        Donation,
        options
      );
      console.log(result);
      res.send(result);
    });

    app.delete("/donationRequest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await DonationRequestCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  console.log(res.send("Assignment server is running"));
});
app.listen(port, () => {
  console.log(`server is running on this port ${port}`);
});
