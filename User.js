const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  deviceId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('User', userSchema);
