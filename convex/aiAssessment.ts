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

    console.log("Gemini API called with:", { 
      category, 
      severity, 
      description: description.substring(0, 100) + "...",
      symptomsCount: symptoms.length 
    });

    const systemPrompt = `You are a medical triage assistant for rural Alberta residents. Analyze symptoms and provide:
1. Brief symptom context based on severity (1-10 scale)
2. Urgency level assessment
3. Rural-specific recommendations
4. Warning signs to monitor

Severity Scale:
1-3: Mild symptoms
4-6: Moderate symptoms  
7-8: Severe symptoms
9-10: Critical symptoms

NEVER provide diagnoses. Focus on triage and rural access considerations.`;

    const userPrompt = `
SYMPTOM ASSESSMENT REQUEST:

Patient Information:
- Primary Complaint: ${description}
- Symptom Category: ${category}
- Severity Level: ${severity}/10 (${getSeverityDescription(severity)})
- Duration: ${duration}
- Specific Symptoms: ${symptoms.length > 0 ? symptoms.join(", ") : "Not specified"}
- Environmental Factors: ${environmentalFactors.length > 0 ? environmentalFactors.join(", ") : "None reported"}
- Medical Images: ${images && images.length > 0 ? `${images.length} photos provided` : "No images"}

Rural Context:
- Location: Rural Alberta
- Limited healthcare access
- Weather-dependent travel
- Health Link Alberta (811) available

Please provide a 3-4 sentence assessment focusing on urgency level and rural considerations.`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Gemini API key missing");
        return getFallbackAssessment(category, severity, duration);
      }

      // Use the correct Gemini API endpoint
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
          topP: 0.8,
          topK: 40,
        }
      };

      console.log("Sending request to Gemini API...");
      
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      const responseText = await resp.text();
      console.log("Gemini API response status:", resp.status);
      
      if (!resp.ok) {
        console.error("Gemini API error:", responseText);
        throw new Error(`API error: ${resp.status}`);
      }
      
      const data = JSON.parse(responseText);
      console.log("Gemini API response received");
      
      if (data.promptFeedback?.blockReason) {
        console.warn("Content blocked:", data.promptFeedback.blockReason);
        return getFallbackAssessment(category, severity, duration);
      }
      
      const context = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!context) {
        console.warn("No context in response:", data);
        return getFallbackAssessment(category, severity, duration);
      }
      
      console.log("Successfully generated context");
      return { context };
      
    } catch (error) {
      console.error("Gemini API error:", error);
      return getFallbackAssessment(category, severity, duration);
    }
  }
});

// Helper function to describe severity levels
function getSeverityDescription(severity: number): string {
  if (severity >= 9) return "Critical";
  if (severity >= 7) return "Severe";
  if (severity >= 4) return "Moderate";
  return "Mild";
}

// Enhanced fallback with better context
function getFallbackAssessment(category: string, severity: number, duration: string): { context: string } {
  
  const baseContext = `Based on your ${category.toLowerCase()} symptoms `;
  
  if (severity >= 9) {
    return {
      context: `${baseContext} with critical severity (${severity}/10), this requires IMMEDIATE emergency care. Call 911 or proceed to the nearest emergency department without delay. Monitor symptoms closely during travel.`
    };
  } else if (severity >= 7) {
    return {
      context: `${baseContext} with severe intensity (${severity}/10), urgent medical attention is recommended within 2-4 hours. Contact Health Link Alberta at 811 for guidance and prepare for potential travel to healthcare facilities.`
    };
  } else if (severity >= 4) {
    return {
      context: `${baseContext} of moderate severity (${severity}/10), schedule a clinic visit within 24 hours. Monitor for any changes and have a travel plan ready considering rural location challenges.`
    };
  } else {
    return {
      context: `${baseContext} with mild severity (${severity}/10), self-care may be appropriate but consult healthcare if symptoms persist. Remember that rural locations require advance planning for medical visits.`
    };
  }
}