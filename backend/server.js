const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const mongoose = require("mongoose");
const {  setupSocketServer } = require("./websockets"); // Import WebSocket setup

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
const apiRoutes = require("./routes/index");
const docRoutes = require("./routes/Document")
app.use("/api", docRoutes);

// MongoDB Connection
const connectToDatabase = async () => {
  try {
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
