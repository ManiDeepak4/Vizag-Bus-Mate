const mongoose = require("mongoose");

const express = require("express");
const path = require("path");
const cors = require("cors");

const busRoutes = require("./routes/busRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS if needed
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// ✅ Serve static files from frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ Your API routes
app.use("/api/bus", busRoutes);

// ✅ Send index.html for any unknown route (like /about, /contact)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});
const MONGO_URI = "mongodb+srv://kondramanideepak:MySecurePWD123@cluster0.lh0idrc.mongodb.net/vizagbus?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
