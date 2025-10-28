
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Product, ShoppingProduct } from '../types';
import { withRetry } from './geminiService'; // Using the existing retry mechanism

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini with the googleSearch tool to find and extract details for a diverse set of
 * plausible, actual shopping products based on a recommended product from the skincare analysis.
 * This provides more realistic and varied product recommendations.
 */
export const searchProducts = async (product: Product): Promise<ShoppingProduct[]> => {
    console.log(`Searching for diverse product options for: ${product.name} by ${product.brand}`);

    const prompt = `
        You are an expert personal shopping assistant for skincare. Your task is to find 2-3 diverse, real-world product options that match the following recommended product.

        Recommended Product:
        - Name: "${product.name}"
        - Brand: "${product.brand}"
        - Type: "${product.type}"
        - Reason: "${product.reason}"

        Search online for actual products that fit this description. Provide a variety in your results, such as a budget-friendly option, a best-seller, or one from a different reputable brand if applicable.

        For each product you find, extract the following details.

        CRITICAL: Your entire output must be a single, valid JSON array of objects, and NOTHING else. Do not wrap it in markdown code fences (\`\`\`json) or add any explanatory text. Each object in the array must have the following structure:
        {
          "name": "The full product name.",
          "brand": "The product's brand name.",
          "type": "${product.type}",
          "reason": "A brief, one-sentence summary of why this specific product is a good option.",
          "shoppingUrl": "The direct URL to the product's shopping page on a reputable retailer's website.",
          "imageUrl": "A direct, publicly accessible, high-quality URL to a clear image of the product. Must be a real image URL, not a data URI or a search result page.",
          "price": "The product's price, formatted as a string (e.g., \\"$25.00\\").",
          "rating": "The average user rating, as a number between 3.5 and 5.0.",
          "reviewCount": "The total number of reviews, as an integer.",
          "merchant": "The name of the online retailer (e.g., \\"Sephora\\", \\"Ulta Beauty\\", \\"Target\\")."
        }
    `;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    }));

    try {
        // Find the JSON array within the model's response text.
        const rawText = response.text;
        const jsonStart = rawText.indexOf('[');
        const jsonEnd = rawText.lastIndexOf(']');

        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
            throw new Error("Valid JSON array not found in the model's response.");
        }

        const jsonText = rawText.substring(jsonStart, jsonEnd + 1);
        const generatedProducts = JSON.parse(jsonText) as ShoppingProduct[];

        // Validate and clean up the results
        return generatedProducts.filter(p => p.name && p.shoppingUrl && p.price).map(p => ({
            ...p,
            // Add placeholder if image is missing or invalid
            imageUrl: (p.imageUrl && p.imageUrl.startsWith('http')) ? p.imageUrl : `https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/200/200`,
            type: product.type // Ensure type from original recommendation is preserved.
        }));

    } catch (e) {
        console.error("Failed to parse Gemini response for product search:", e);
        console.error("Original model response text:", response.text);
        throw new Error("Could not find product options from AI search. The model returned an invalid format.");
    }
};
