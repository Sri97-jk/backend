const mongoose = require('mongoose');

const sensorLogSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  motion: { type: Boolean, required: true },
  temperature: { type: Number, required: true },
  avgTemp: { type: Number, required: true },
  status: { type: String, required: true }, // SAFE, MOTION ALERT, FIRE ALERT, AI WARNING, HIGH RISK ALERT
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SensorLog', sensorLogSchema);
