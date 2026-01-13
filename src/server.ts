import express from 'express';
import User from './models/User';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running! 🤖');
});

// VRChat API Endpoint
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'userId customName username updatedAt').sort({ updatedAt: -1 });
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
