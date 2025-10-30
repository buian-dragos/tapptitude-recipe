const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY in environment variables');
}

// The client gets the API key from the environment variable
const ai = new GoogleGenAI({ apiKey });

module.exports = ai;
