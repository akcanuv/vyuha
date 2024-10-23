// server.js

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY  // Set your API key in environment variables
  });
  

app.post('/api/chat', async (req, res) => {
  const { message, snippet } = req.body;

  try {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [],
        temperature: 1,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: {
          "type": "text"
        },
      });
    res.json({ reply: response.data.choices[0].text.trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error communicating with OpenAI API' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});