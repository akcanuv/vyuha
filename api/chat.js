// api/chat.js

import OpenAI from 'openai';

export default async function handler(req, res) {
  // Handle CORS if necessary
  res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your domain for security
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, snippet } = req.body;

    // Build the content array
    const contentArray = [
      {
        type: 'text',
        text: message,
      },
    ];

    // Include the image data if available
    if (snippet) {
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${snippet}`,
        },
      });
    }

    const messages = [
      {
        role: 'user',
        content: contentArray,
      },
    ];

    // Initialize OpenAI API
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // OpenAI API request
    const response = await openai.chat.completions.create({
      model: 'ft:gpt-4o-2024-08-06:akcanuv:calculations-241026:AMezsqVO',
      messages: messages,
      temperature: 0,
      max_tokens: 2048,
      top_p: 0,
      frequency_penalty: 0,
      presence_penalty: 0,
      response_format: {
        type: 'text',
      },
    });

    // Extract the assistant's reply
    res.status(200).json({ reply: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error(
      'OpenAI API Error:',
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: 'Error communicating with OpenAI API' });
  }
}