require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    console.log('Testing Gemini API...\n');

    const userPrompt = 'healthy vegan breakfast'; // Test input

const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash-exp',
  // The simple user input is fine here
  contents: userPrompt, 
  config: {
    // 1. System Instruction: Simplified to focus on persona and quantity.
    // The JSON part is now handled by the responseSchema below.
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
// which you can safely parse:
const data = JSON.parse(response.text);

    // console.log('Response:', response.text);
    console.log('Parsed Data:', data);
    console.log('\n✅ Gemini API is working correctly!');
  } catch (error) {
    console.error('❌ Error testing Gemini API:', error.message);
  }
}

main();
