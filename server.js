require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// MongoDB connection
const { MongoMemoryServer } = require('mongodb-memory-server');

async function startServer() {
  let MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    const mongoServer = await MongoMemoryServer.create();
    MONGO_URI = mongoServer.getUri();
    console.log(`No MONGO_URI provided, started in-memory MongoDB at ${MONGO_URI}`);
  }

  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
      
      // Auto-Seed a dummy user for the mock hardware so alerts don't fail
      const User = require('./models/User');
      const existingUser = await User.findOne({ deviceId: 'NODE-001' });
      if (!existingUser) {
        await User.create({ name: 'Admin', phoneNumber: '+1234567890', deviceId: 'NODE-001' });
        console.log('Seeded mock User for NODE-001');
      }

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
}

startServer();

// Export the app for Vercel serverless deployment
module.exports = app;
