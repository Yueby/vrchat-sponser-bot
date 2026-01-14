import express from 'express';
import rateLimit from 'express-rate-limit';
import User from './models/User';

const app = express();
// Pterodactyl often uses SERVER_PORT, while others use PORT
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// API rate limiting: max 180 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180, // max 180 requests
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Apply rate limiting to all /api/ paths
app.use('/api/', apiLimiter);

app.get('/', (req, res) => {
  res.send('Bot is running! 🤖');
});

// VRChat API Endpoint
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'userId customName username avatar roles roleNames updatedAt').sort({ updatedAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🌍 Web server running on port ${PORT}`);
  });
};
