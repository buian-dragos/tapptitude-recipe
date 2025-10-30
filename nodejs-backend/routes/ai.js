const express = require('express');
const router = express.Router();
const ai = require('../gemini');
const { authenticateUser } = require('../middleware/auth');
// Node.js 18+ has native fetch support, no need to import

// --- Helper function to search for an image ---
const getRecipeImage = async (query) => {
  try {
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // Store your key in .env
    if (!PEXELS_API_KEY) {
      console.warn('PEXELS_API_KEY is not set. Skipping image fetch.');
      return null;
    }

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('Pexels API error:', await response.text());
      return null;
    }

    const data = await response.json();
    
    // Return the URL of the first photo in a good size (e.g., 'medium' or 'large')
    return data.photos?.[0]?.src?.large || null;

  } catch (error) {
    console.error('Error fetching image from Pexels:', error);
    return null;
  }
};


/**
 * Generate recipe suggestions based on user input
 * POST /api/ai/generate
 * Body: { prompt: string }
 * Returns: JSON object with 5 recipes, including image URLs
 */
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // --- 1. Call Gemini API ---
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt, 
      config: {
        systemInstruction: 'You are a helpful culinary assistant that must generate exactly 5 distinct cooking recipes based on the user\'s request. Do not include any introductory text, closing remarks, or explanations. Respond ONLY with the JSON object that follows the provided schema.',
        responseMimeType: 'application/json',
        
        // --- 3. UPDATED SCHEMA ---
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
                            
                            // --- ADD THIS NEW FIELD ---
                            image_query: { type: 'string', description: 'A short, descriptive search query for a high-quality stock photo of the finished dish (e.g., "creamy mashed potatoes in a rustic bowl").' }
                        },
                        // Add 'image_query' to the required list
                        required: ['title', 'time', 'ingredients', 'instructions', 'image_query']
                    }
                }
            },
            required: ['recipes']
        },
      }
    });

    const data = JSON.parse(response.text);

    // --- 2. Fetch Images in Parallel ---
    // We use Promise.all to fetch all 5 images concurrently
    const recipesWithImages = await Promise.all(
      data.recipes.map(async (recipe) => {
        // Use the new 'image_query' for a better search result
        const imageUrl = await getRecipeImage(recipe.image_query);
        
        // Add the new imageUrl to the recipe object
        return {
          ...recipe,
          imageUrl: imageUrl, // Will be null if fetch fails
        };
      })
    );

    // Replace the old recipes array with the new one
    const finalResponse = {
      recipes: recipesWithImages,
    };

    res.json(finalResponse);

  } catch (error) {
    console.error('Gemini API error or JSON parsing error:', error);
    res.status(500).json({ error: 'Failed to generate response from AI' });
  }
});

/**
 * Regenerate recipe suggestions excluding disliked recipes
 * POST /api/ai/regenerate
 * Body: { prompt: string, excludedRecipes: string[] }
 * Returns: JSON object with 5 new recipes (excluding the disliked ones)
 */
router.post('/regenerate', authenticateUser, async (req, res) => {
  try {
    const { prompt, excludedRecipes } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build the enhanced prompt with excluded recipes
    let enhancedPrompt = prompt;
    if (excludedRecipes && excludedRecipes.length > 0) {
      const excludedList = excludedRecipes.join(', ');
      enhancedPrompt = `${prompt}\n\nDo not suggest the following recipes: ${excludedList}`;
    }

    // --- 1. Call Gemini API with enhanced prompt ---
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: enhancedPrompt, 
      config: {
        systemInstruction: 'You are a helpful culinary assistant that must generate exactly 5 distinct cooking recipes based on the user\'s request. Do not include any introductory text, closing remarks, or explanations. Respond ONLY with the JSON object that follows the provided schema. If the user specifies recipes to exclude, make sure not to suggest those recipes or very similar variations.',
        responseMimeType: 'application/json',
        
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
                            image_query: { type: 'string', description: 'A short, descriptive search query for a high-quality stock photo of the finished dish (e.g., "creamy mashed potatoes in a rustic bowl").' }
                        },
                        required: ['title', 'time', 'ingredients', 'instructions', 'image_query']
                    }
                }
            },
            required: ['recipes']
        },
      }
    });

    const data = JSON.parse(response.text);

    // --- 2. Fetch Images in Parallel ---
    const recipesWithImages = await Promise.all(
      data.recipes.map(async (recipe) => {
        const imageUrl = await getRecipeImage(recipe.image_query);
        
        return {
          ...recipe,
          imageUrl: imageUrl,
        };
      })
    );

    const finalResponse = {
      recipes: recipesWithImages,
    };

    res.json(finalResponse);

  } catch (error) {
    console.error('Gemini API regenerate error:', error);
    res.status(500).json({ error: 'Failed to regenerate recipes from AI' });
  }
});

module.exports = router;