// convex/aiAssessment.ts
import { v } from "convex/values";
import fetch from "node-fetch";
import { mutation } from "./_generated/server";

export const generateContextWithGemini = mutation({
  args: {
    description: v.string(),
    severity: v.number(),
    duration: v.string(),
    environmentalFactors: v.array(v.string()),
    category: v.string(),
    symptoms: v.array(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { description, severity, duration, environmentalFactors, category, symptoms, images } = args;

    const systemPrompt = `You are a medical triage assistant for rural Alberta residents. Provide:
1. Symptom context based on category (${category})
2. Rural healthcare considerations
3. Recommended next steps
4. Warning signs to watch for

DO NOT provide definitive diagnoses. Focus on triage and rural access considerations.`;

    const userPrompt = `
PATIENT SYMPTOMS:
- Description: ${description}
- Category: ${category}
- Severity: ${severity}/10
- Duration: ${duration}
- Symptoms: ${symptoms.join(", ")}
- Environmental Factors: ${environmentalFactors.join(", ")}
- Images: ${images && images.length > 0 ? "Provided for assessment" : "None"}

RURAL CONTEXT:
- Patient is in rural Alberta
- Limited healthcare access
- Weather-dependent travel
- Potential distance to facilities

Please provide a 3-4 sentence assessment focusing on urgency and rural considerations.`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
      
      const body = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        }
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      const data = await resp.json();
      const context = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                     "Unable to generate assessment. Please consult healthcare provider.";
      
      return { context };
    } catch (error) {
      console.error("Gemini API error:", error);
      return { 
        context: "Assessment service temporarily unavailable. Based on your symptoms, consider contacting Health Link Alberta at 811 for guidance." 
      };
    }
  }
});