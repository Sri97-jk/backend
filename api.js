const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// Models
const User = require('../models/User');
const SensorLog = require('../models/SensorLog');
const Alert = require('../models/Alert');

// Twilio Config (Env variables)
const twilioClient = process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN ?
  twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN) : null;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// In-memory state for moving average and cooldowns
const deviceState = {};

// 1-hour Cooldown State to protect Twilio Limits
const LAST_SENT_TIME = {};
const COOLDOWN_SECONDS = 3600;

// Global Daily Limit to strictly protect the 50 limit
let dailySmsCount = 0;
let lastResetTime = Math.floor(Date.now() / 1000);

// Helper function to send SMS
async function sendSMS(phoneNumber, message) {
  const currentTime = Math.floor(Date.now() / 1000);

  // Reset daily limit every 24 hours
  if ((currentTime - lastResetTime) >= 86400) {
    dailySmsCount = 0;
    lastResetTime = currentTime;
  }

  // Strict check to ensure we NEVER exceed 50 SMS a day
  if (dailySmsCount >= 50) {
    console.log(`[BLOCKED] Skipped texting ${phoneNumber}: Global Twilio limit of 50 SMS reached for today.`);
    return true;
  }

  // Check Cooldown per phone number
  const lastTime = LAST_SENT_TIME[phoneNumber] || 0;
  
  if ((currentTime - lastTime) < COOLDOWN_SECONDS) {
    console.log(`Skipped texting ${phoneNumber}: On 1-hour cooldown to protect Twilio Daily Limit.`);
    return true;
  }
  
  LAST_SENT_TIME[phoneNumber] = currentTime;

  try {
    if (twilioClient) {
      await twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE,
        to: phoneNumber,
      });
      console.log(`SMS Sent to ${phoneNumber}: ${message}`);
    } else {
      console.log(`[Twilio Fallback Mock] SMS to ${phoneNumber}: ${message}`);
    }
    // Increment ONLY if it didn't throw an error
    dailySmsCount++;
  } catch (error) {
    console.error(`SMS Failed: ${error.message}`);
  }
}

// 1. POST /register
router.post('/register', async (req, res) => {
  try {
    const { name, phoneNumber, deviceId } = req.body;
    let user = await User.findOne({ deviceId });
    
    if (user) {
      user.name = name;
      user.phoneNumber = phoneNumber;
      await user.save();
    } else {
      user = new User({ name, phoneNumber, deviceId });
      await user.save();
    }
    
    res.status(200).json({ message: 'User registered successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /sensor-data
router.post('/sensor-data', async (req, res) => {
  try {
    const { deviceId, motion, temperature } = req.body;
    
    if (!deviceId) return res.status(400).json({ error: 'Device ID required' });

    // Initialize device state if new
    if (!deviceState[deviceId]) {
      deviceState[deviceId] = {
        avgTemp: temperature, // Initialize average with first reading
        lastAlertTime: 0
      };
    }
    
    const state = deviceState[deviceId];
    
    // Core AI Logic (Adaptive Temperature)
    state.avgTemp = (0.9 * state.avgTemp) + (0.1 * temperature);
    
    const anomaly = temperature > state.avgTemp + 8;
    const fire = temperature > 50;
    const highRisk = motion && (fire || anomaly);

    // Determine Status
    let status = 'SAFE';
    let alertMessage = null;
    let alertType = null;

    if (highRisk) {
      status = 'HIGH RISK ALERT';
      alertMessage = '🚨 HIGH RISK ALERT! Intrusion + Fire/Anomaly detected';
      alertType = 'high_risk';
    } else if (fire) {
      status = 'FIRE ALERT';
      alertMessage = '🔥 FIRE ALERT!';
      alertType = 'fire';
    } else if (anomaly) {
      status = 'AI WARNING';
      alertMessage = '⚠️ AI WARNING! Sudden Temperature Spike.';
      alertType = 'ai_warning';
    } else if (motion) {
      status = 'MOTION ALERT';
      alertMessage = '🚶 Motion Detected';
      alertType = 'motion';
    }

    // Save Sensor Log
    const log = new SensorLog({
      deviceId,
      motion,
      temperature,
      avgTemp: state.avgTemp,
      status
    });
    await log.save();

    // Check Cooldown and User for Alerts
    const now = Date.now();
    if (alertMessage && (now - state.lastAlertTime > 45000)) { // 45 seconds cooldown
      state.lastAlertTime = now;
      
      const user = await User.findOne({ deviceId });
      if (user) {
        // Save Alert
        const alertDb = new Alert({
          type: alertType,
          message: alertMessage,
          phoneNumber: user.phoneNumber,
          deviceId
        });
        await alertDb.save();

        // Send SMS to all 3 registered mobile numbers
        const activeNumbers = ['+917793929357', '+917075022609', '+919949805658'];
        for (const num of activeNumbers) {
          await sendSMS(num, alertMessage);
        }
      } else {
        console.warn(`Alert triggered but no user registered for device ${deviceId}`);
      }
    }

    res.status(200).json({ status, log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /status
router.get('/status', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const query = deviceId ? { deviceId } : {};
    
    // Get latest sensor log
    const latestLog = await SensorLog.findOne(query).sort({ timestamp: -1 });
    res.status(200).json(latestLog || { status: 'UNKNOWN' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /alerts
router.get('/alerts', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const query = deviceId ? { deviceId } : {};
    
    const alerts = await Alert.find(query).sort({ timestamp: -1 }).limit(50);
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
