const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config(); // ✅ Enable .env support

const busRoutes = require("./routes/busRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS setup for Netlify frontend
app.use(cors({
  origin: ['https://vizagbusmate.netlify.app',
    'https://fabulous-zuccutto-becf80.netlify.app', // Your current Netlify URL
    'http://localhost:3000', // For local development
    'https://*.netlify.app' // Allow all netlify subdomains
], // Replace with your actual Netlify URL if different
}));

// ✅ Middleware to parse JSON
app.use(express.json());

// ✅ API routes
app.use("/api/bus", busRoutes);
app.use("/api/chat", chatRoutes);

// ✅ MongoDB Connection using Environment Variable
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
