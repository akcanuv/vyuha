// server.js

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increase limit to handle large images

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set your API key in environment variables
});

app.post('/api/chat', async (req, res) => {
  const { message, snippet, imageData } = req.body;

  try {
    // Build the messages array according to OpenAI's expected format
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: message },
        ],
      },
    ];

    // Include the snippet if available
    if (snippet) {
      messages[0].content.push({
        type: 'text',
        text: snippet,
      });
    }

    // Include the image data if available
    if (imageData) {
      messages[0].content.push({
        type: 'image_url',
        image_url: {
          url: imageData, // Assuming the API accepts base64 data URLs
        },
      });
    }

    // OpenAI API request
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      response_format: {
        type: 'text',
      },
    });

    // Extract the assistant's reply
    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error communicating with OpenAI API' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});