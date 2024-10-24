app.post('/api/chat', async (req, res) => {
    const { message, snippet } = req.body;
  
    try {
      // Build the content array
      const contentArray = [

        {
          "type": "text",
          "text": message,
        },
      ];
  
      // Include the image data if available
      if (snippet) {
        contentArray.push({
          "type": "image_url",
          "image_url": {
            "url": `data:image/png;base64,${snippet}`,
          },
        });
      }
  
      const messages = [
        {
          role: 'user',
          content: contentArray,
        },
      ];
  
      // OpenAI API request
      const response = await openai.chat.completions.create({
        model: 'ft:gpt-4o-2024-08-06:akcanuv:dimension-v3:ALV2swqE',
        messages: messages,
        temperature: 0,
        max_tokens: 2048,
        top_p: 0,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: {
            "type": "text"
        },
      });
  
      // Extract the assistant's reply
      res.json({ reply: response.choices[0].message.content.trim() });
    } catch (error) {
      console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Error communicating with OpenAI API' });
    }
  });