const express = require('express');
const router = express.Router();
const ai = require('../gemini');
const { authenticateUser, optionalAuth } = require('../middleware/auth');

/**
 * Generate recipe suggestions based on user input
 * POST /api/ai/generate
 * Body: { prompt: string }
 * Returns: JSON object with 5 recipes
 */
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt, 
      config: {
        // 1. System Instruction
        systemInstruction: 'You are a helpful culinary assistant that must generate exactly 5 distinct cooking recipes based on the user\'s request. Do not include any introductory text, closing remarks, or explanations. Respond ONLY with the JSON object that follows the provided schema.',
        
        // 2. ENFORCE JSON OUTPUT
        responseMimeType: 'application/json',
        
        // 3. DEFINE THE STRICT JSON STRUCTURE
        responseSchema: {
            type: 'object',
            properties: {
                recipes: {
                    type: 'array',
                    description: 'A list of 5 cooking recipes.',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string', description: 'The name of the recipe.' },
                            time: { type: 'string', description: 'Total cooking time (e.g., "45 mins" or "1 hour").' },
                            ingredients: { type: 'array', items: { type: 'string' }, description: 'A list of ingredients with quantities.' },
                            instructions: { type: 'array', items: { type: 'string' }, description: 'A list of step-by-step cooking instructions.' },
                        },
                        required: ['title', 'time', 'ingredients', 'instructions']
                    }
                }
            },
            required: ['recipes']
        },
      }
    });

    // The model's response.text will now contain a clean JSON string, 
    // which we can safely parse:
    const data = JSON.parse(response.text);

    res.json(data);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to generate response from AI' });
  }
});



module.exports = router;
