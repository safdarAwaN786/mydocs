const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const mongoose = require("mongoose");
const {  setupSocketServer } = require("./websockets"); // Import WebSocket setup

const app = express();
const PORT = 7000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
// Middleware
app.use(express.json());
app.use(morgan("dev"));
// Enable CORS for all routes
// async function getShopifyAccessScopes(storeDomain, accessToken) {
//   // const url = `https://${storeDomain}/admin/oauth/access_scopes.json`;
//   const url = `https://${storeDomain}/admin/api/2024-10/orders/5712624812085.json`;

//   try {
//       const response = await fetch(url, {
//           method: "GET",
//           headers: {
//               "X-Shopify-Access-Token": accessToken,
//               "Content-Type": "application/json"
//           }
//       });

//       if (!response.ok) {
//           throw new Error(`Error: ${response.status} ${response.statusText}`);
//       }

//       const data = await response.json();
//       console.log("Response Data:", data);
//       return data;
//   } catch (error) {
//       console.error("Failed to fetch access scopes:", error.message);
//   }
// }

// Example Usage:
const storeDomain = "sidesumtest.myshopify.com"; // Replace with your store domain
const accessToken = "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"; // Replace with your actual access token


// Routes
const apiRoutes = require("./routes/index");
const docRoutes = require("./routes/Document")
app.use("/api", docRoutes);

// MongoDB Connection
const connectToDatabase = async () => {
  // getShopifyAccessScopes(storeDomain, accessToken);
  try {
    // await mongoose.connect("mongodb://localhost:27017/mydocs");

    await mongoose.connect("mongodb+srv://safdarstudent:bRrdx2h2Yg2B3fbq@cluster0.tvqbbr3.mongodb.net/mydocs");
    console.log("📦 MongoDB Connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB Connection failed:", error);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

// Connect to MongoDB before starting the server

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

connectToDatabase();
// Attach WebSocket Server
setupSocketServer(server)



