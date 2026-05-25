const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const path = require("path");

// ✅ Load .env from the backend directory explicitly
require("dotenv").config({ path: path.join(__dirname, ".env") });

const busRoutes = require("./routes/busRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS setup (allowing local dev servers and netlify domains dynamically)
const allowedOrigins = [
  "https://vizagbusmate.netlify.app",
  "https://fabulous-zuccutto-becf80.netlify.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or file:// protocol in local files)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^https:\/\/[a-zA-Z0-9-]+\.netlify\.app$/.test(origin) ||
                      /^http:\/\/localhost:\d+$/.test(origin) ||
                      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
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
