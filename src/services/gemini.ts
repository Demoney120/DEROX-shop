import { GoogleGenAI } from "@google/genai";
import { User, Product } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

export const getGeminiModel = (modelName: string = "gemini-3.1-pro-preview") => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment.");
  }
  const ai = new GoogleGenAI({ apiKey });
  return ai;
};

export const generateProductDescription = async (title: string, category: string) => {
  const ai = getGeminiModel();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a compelling, SEO-optimized product description and 5 relevant tags for a product titled "${title}" in the category "${category}". Return the result as JSON with keys "description" and "tags".`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const getPersonalizedRecommendations = async (user: User, availableProducts: Product[]) => {
  const ai = getGeminiModel();
  const productContext = availableProducts.map(p => ({
    id: p.id,
    title: p.title,
    category: p.category,
    tags: p.tags
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `The user is a ${user.role} with a trust score of ${user.trustScore}. Based on these available products: ${JSON.stringify(productContext)}, return a JSON array of up to 4 product IDs that this user might be interested in. Return only the array of IDs.`,
    config: { responseMimeType: "application/json" }
  });
  
  try {
    const recommendedIds = JSON.parse(response.text || "[]");
    return recommendedIds as string[];
  } catch (e) {
    console.error("Failed to parse recommendations", e);
    return [];
  }
};

export const resolveDispute = async (orderId: string, reason: string) => {
  const ai = getGeminiModel();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `As an AI dispute resolution assistant, analyze this dispute for order ${orderId}: "${reason}". Provide a fair recommendation for resolution. Return as a JSON object with a "recommendation" field.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const searchProductsConversational = async (query: string, availableProducts: Product[]) => {
  const ai = getGeminiModel();
  const productContext = availableProducts.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    tags: p.tags
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `The user is searching for: "${query}". Based on these available products: ${JSON.stringify(productContext)}, return a JSON array of product IDs that best match the user's intent. If no matches, return an empty array.`,
    config: { responseMimeType: "application/json" }
  });
  
  try {
    const matchedIds = JSON.parse(response.text || "[]");
    return matchedIds as string[];
  } catch (e) {
    console.error("Failed to parse search results", e);
    return [];
  }
};
