const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config(); // ✅ Enable .env support

const busRoutes = require("./routes/busRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS setup for Netlify frontend
app.use(cors({
  origin: ['https://vizag-bus-mate.netlify.app'], // Replace with your actual Netlify URL if different
}));

// ✅ Middleware to parse JSON
app.use(express.json());

// ✅ API routes
app.use("/api/bus", busRoutes);

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
