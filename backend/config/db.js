const mongoose = require("mongoose");
const dns = require("dns");

// Disable Mongoose query buffering to prevent queries from hanging indefinitely during connection retries
mongoose.set("bufferCommands", false);

let isConnected = false;
let connectedHost = null;
let connectedDb = null;

const sanitizeUri = (uri) => {
  if (!uri) return "";
  return uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
};

const connectDB = async (retries = 8, delay = 2000) => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/budgetbuddy";
  const isAtlas = uri.startsWith("mongodb+srv://");

  if (isAtlas) {
    // Windows DNS resolvers frequently reject SRV records; set reliable DNS servers
    try {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch (e) {
      // Ignore if environment does not allow modifying DNS
    }
  }

  const maxAttempts = isAtlas ? retries : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (isAtlas && attempt > 1) {
        console.log(`[MongoDB] Connecting to MongoDB Atlas (attempt ${attempt}/${maxAttempts})...`);
      }
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: isAtlas ? 15000 : 3000,
        connectTimeoutMS: isAtlas ? 15000 : 3000,
      });

      isConnected = true;
      connectedHost = conn.connection.host;
      connectedDb = conn.connection.name;

      console.log(`[MongoDB] Genuinely connected to MongoDB: ${connectedHost}/${connectedDb}`);
      return conn;
    } catch (error) {
      if (attempt < maxAttempts) {
        console.warn(`[MongoDB] Attempt ${attempt} encountered transient handshake issue (${error.message}). Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        isConnected = false;
        connectedHost = null;
        connectedDb = null;

        console.warn(`[MongoDB] Notice: Could not connect to MongoDB at ${sanitizeUri(uri)} (${error.message}).`);
        console.log(
          `[BudgetBuddy] Running in local document storage mode (backend/data/local_db.json). All features remain operational. To connect genuine MongoDB Atlas or local MongoDB, paste your MONGO_URI in backend/.env.`
        );
        return null;
      }
    }
  }
};

mongoose.connection.on("connected", () => {
  isConnected = true;
});

mongoose.connection.on("error", (err) => {
  console.warn(`[MongoDB] Connection warning: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
});

const getDatabaseStatus = () => {
  const readyState = mongoose.connection.readyState;
  return {
    mongooseReadyState: readyState,
    isMongoConnected: readyState === 1,
    mode: readyState === 1 ? "MongoDB" : "Local Document Fallback",
    host: connectedHost || (readyState === 1 ? mongoose.connection.host : null),
    database: connectedDb || (readyState === 1 ? mongoose.connection.name : "local_db.json"),
  };
};

module.exports = {
  connectDB,
  getDatabaseStatus,
};
