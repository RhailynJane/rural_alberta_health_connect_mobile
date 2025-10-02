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

    console.log("🔍 Gemini Assessment Request:", { 
      category, 
      severity, 
      symptoms: symptoms.length > 0 ? symptoms : ["Not specified"]
    });

    // Enhanced system prompt with specific medical context
    const systemPrompt = `You are a medical triage assistant specializing in rural healthcare. Provide SPECIFIC, actionable assessments.

CRITICAL RULES:
1. BE SPECIFIC about symptoms and implications
2. Provide CONCRETE timeframes for medical care
3. Include RURAL-SPECIFIC considerations
4. List SPECIFIC warning signs to monitor
5. NEVER say "contact healthcare provider" - be specific about WHO to contact
6. Consider WEATHER and TRAVEL constraints

SEVERITY SCALE:
1-3: MILD - Self-care with monitoring
4-6: MODERATE - Clinic visit within 24-48 hours
7-8: SEVERE - Urgent care within 4-6 hours
9-10: CRITICAL - Emergency care IMMEDIATELY

RESPONSE STRUCTURE:
- Specific symptom assessment
- Concrete urgency level with timeframe
- Rural-specific action steps
- Specific warning signs to watch for`;

    // Enhanced user prompt with more context
    const userPrompt = `
MEDICAL TRIAGE ASSESSMENT - RURAL ALBERTA

PATIENT PRESENTATION:
- Primary Symptoms: ${description}
- Medical Category: ${category}
- Severity Level: ${severity}/10 (${getSeverityLevel(severity)})
- Duration: ${duration}
- Specific Symptoms Reported: ${symptoms.length > 0 ? symptoms.join(", ") : "Based on description"}
- Environmental Exposure: ${environmentalFactors.length > 0 ? environmentalFactors.join(", ") : "None specified"}
- Medical Photos: ${images && images.length > 0 ? "Available for assessment" : "Not provided"}

RURAL CONTEXT:
- Location: Rural Alberta (limited immediate healthcare)
- Travel Considerations: Weather-dependent, potential delays
- Resources: Health Link Alberta (811), local clinics, emergency services

REQUIRED OUTPUT:
Provide a SPECIFIC assessment with:
1. Symptom interpretation based on category
2. Exact urgency level and timeframe
3. Concrete rural-specific actions
4. Specific monitoring instructions`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("❌ Gemini API key missing");
        return getDetailedFallbackAssessment(category, severity, duration, symptoms);
      }

      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
      
      const body = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower for more consistent medical responses
          maxOutputTokens: 600,
          topP: 0.8,
          topK: 40,
        }
      };

      console.log("📤 Sending request to Gemini API...");
      
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      const responseText = await resp.text();
      console.log("📥 Gemini API response status:", resp.status);
      
      if (!resp.ok) {
        console.error("❌ Gemini API error:", responseText);
        return getDetailedFallbackAssessment(category, severity, duration, symptoms);
      }
      
      const data = JSON.parse(responseText);
      
      if (data.promptFeedback?.blockReason) {
        console.warn("⚠️ Content blocked:", data.promptFeedback.blockReason);
        return getDetailedFallbackAssessment(category, severity, duration, symptoms);
      }
      
      const context = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!context) {
        console.warn("❌ No context in response");
        return getDetailedFallbackAssessment(category, severity, duration, symptoms);
      }
      
      console.log("✅ Successfully generated detailed context");
      return { context };
      
    } catch (error) {
      console.error("❌ Gemini API error:", error);
      return getDetailedFallbackAssessment(category, severity, duration, symptoms);
    }
  }
});

// Helper function for severity levels
function getSeverityLevel(severity: number): string {
  if (severity >= 9) return "CRITICAL - Emergency";
  if (severity >= 7) return "SEVERE - Urgent";
  if (severity >= 4) return "MODERATE - Prompt Care";
  return "MILD - Self-care";
}

// MUCH more detailed fallback assessments
function getDetailedFallbackAssessment(category: string, severity: number, duration: string, symptoms: string[]): { context: string } {
  const severityLevel = getSeverityLevel(severity);
  const mainSymptoms = symptoms.length > 0 ? symptoms.slice(0, 3).join(", ") : "reported symptoms";

  // Category-specific assessments
  const categoryAssessments = {
    "Cold Weather Injuries": getColdWeatherAssessment(severity, mainSymptoms, duration),
    "Burns & Heat Injuries": getBurnAssessment(severity, mainSymptoms, duration),
    "Trauma & Injuries": getTraumaAssessment(severity, mainSymptoms, duration),
    "Rash & Skin Conditions": getRashAssessment(severity, mainSymptoms, duration),
    "Infections": getInfectionAssessment(severity, mainSymptoms, duration),
    "General Symptoms": getGeneralAssessment(severity, mainSymptoms, duration)
  };

  return {
    context: categoryAssessments[category as keyof typeof categoryAssessments] || 
             getGeneralAssessment(severity, mainSymptoms, duration)
  };
}

// Specific assessment functions
function getColdWeatherAssessment(severity: number, symptoms: string, duration: string): string {
  if (severity >= 9) {
    return `CRITICAL: Your cold injury symptoms (${symptoms}) with ${severity}/10 severity indicate potential tissue damage. This requires IMMEDIATE emergency care - do not delay. Call 911 and begin gentle rewarming while awaiting transport. Do not rub affected areas or use direct heat.`;
  } else if (severity >= 7) {
    return `SEVERE: Your cold exposure symptoms (${symptoms}) at ${severity}/10 severity suggest significant tissue involvement. Seek URGENT care within 2-4 hours. Contact Health Link Alberta (811) for specific rewarming instructions. Monitor for color changes to blue/black.`;
  } else if (severity >= 4) {
    return `MODERATE: Your cold-related symptoms (${symptoms}) at ${severity}/10 severity require medical evaluation within 24 hours. Gradual rewarming and protection from further cold exposure are essential. Watch for increased pain or color changes.`;
  } else {
    return `MILD: Your cold exposure symptoms (${symptoms}) at ${severity}/10 severity can be managed with self-care. Warm the area gradually, avoid further exposure, and monitor for worsening. Seek care if numbness persists or skin changes color.`;
  }
}

function getBurnAssessment(severity: number, symptoms: string, duration: string): string {
  if (severity >= 9) {
    return `CRITICAL: Your burn symptoms (${symptoms}) at ${severity}/10 severity indicate deep tissue involvement. This is a medical emergency - call 911 immediately. Do not apply creams or break blisters. Cover with clean, dry cloth.`;
  } else if (severity >= 7) {
    return `SEVERE: Your burn injury (${symptoms}) at ${severity}/10 severity requires urgent medical care within 4 hours. Contact Health Link Alberta (811) for specific wound care instructions. Monitor for signs of infection like increased redness or pus.`;
  } else if (severity >= 4) {
    return `MODERATE: Your burn symptoms (${symptoms}) at ${severity}/10 severity need medical evaluation within 24 hours. Keep the area clean and covered. Watch for infection signs and avoid popping any blisters.`;
  } else {
    return `MILD: Your minor burn (${symptoms}) at ${severity}/10 severity can be managed with cool compresses and over-the-counter pain relief. Protect from further injury and monitor for healing. Seek care if pain increases or redness spreads.`;
  }
}

function getTraumaAssessment(severity: number, symptoms: string, duration: string): string {
  if (severity >= 9) {
    return `CRITICAL: Your traumatic injury (${symptoms}) at ${severity}/10 severity indicates potential serious damage. This is an emergency - call 911 immediately. Do not move if spinal injury is suspected. Control bleeding with direct pressure.`;
  } else if (severity >= 7) {
    return `SEVERE: Your injury (${symptoms}) at ${severity}/10 severity requires urgent medical evaluation within 4-6 hours. Immobilize the area and apply ice. Watch for signs of internal bleeding like dizziness or swelling.`;
  } else if (severity >= 4) {
    return `MODERATE: Your injury (${symptoms}) at ${severity}/10 severity should be assessed within 24 hours. Rest, ice, compression, and elevation are recommended. Monitor for increased swelling or inability to use the affected area.`;
  } else {
    return `MILD: Your minor injury (${symptoms}) at ${severity}/10 severity can be managed with self-care. Use RICE protocol (rest, ice, compression, elevation). Seek care if pain worsens or function doesn't improve in 48 hours.`;
  }
}

function getRashAssessment(severity: number, symptoms: string, duration: string): string {
  if (severity >= 7) {
    return `SEVERE: Your skin condition (${symptoms}) at ${severity}/10 severity with extensive involvement requires medical evaluation within 24 hours. Avoid scratching and keep the area clean and dry. Watch for signs of infection like pus or fever.`;
  } else if (severity >= 4) {
    return `MODERATE: Your rash/skin symptoms (${symptoms}) at ${severity}/10 severity should be evaluated within 48 hours. Use gentle, fragrance-free products and avoid known irritants. Monitor for spreading or worsening.`;
  } else {
    return `MILD: Your skin symptoms (${symptoms}) at ${severity}/10 severity may respond to self-care with gentle cleansing and moisturizing. If condition persists beyond 3 days or worsens, seek medical advice.`;
  }
}

function getInfectionAssessment(severity: number, symptoms: string, duration: string): string {
  if (severity >= 9) {
    return `CRITICAL: Your infection symptoms (${symptoms}) at ${severity}/10 severity with systemic involvement indicate a medical emergency. Call 911 immediately if experiencing fever with confusion, difficulty breathing, or severe pain.`;
  } else if (severity >= 7) {
    return `SEVERE: Your infection (${symptoms}) at ${severity}/10 severity requires urgent medical care within 4-6 hours. Contact Health Link Alberta (811) for guidance. Watch for red streaks spreading from the area or high fever.`;
  } else if (severity >= 4) {
    return `MODERATE: Your infection symptoms (${symptoms}) at ${severity}/10 severity need medical evaluation within 24 hours. Keep the area clean and monitor for spreading redness, increased swelling, or fever.`;
  } else {
    return `MILD: Your minor infection symptoms (${symptoms}) at ${severity}/10 severity may be managed with careful monitoring. Practice good hygiene and watch for worsening signs. Seek care if symptoms progress.`;
  }
}

function getGeneralAssessment(severity: number, symptoms: string, duration: string): string {
  if (severity >= 9) {
    return `CRITICAL: Your symptoms (${symptoms}) at ${severity}/10 severity indicate a potential medical emergency. Seek immediate care - call 911 or proceed to nearest emergency department. Do not delay due to rural location concerns.`;
  } else if (severity >= 7) {
    return `SEVERE: Your symptoms (${symptoms}) at ${severity}/10 severity require urgent medical attention within 4-6 hours. Contact Health Link Alberta (811) for specific guidance. Have a travel plan ready considering weather conditions.`;
  } else if (severity >= 4) {
    return `MODERATE: Your symptoms (${symptoms}) at ${severity}/10 severity should be evaluated within 24-48 hours. Schedule a clinic visit and monitor for any worsening. Keep emergency contacts accessible.`;
  } else {
    return `MILD: Your symptoms (${symptoms}) at ${severity}/10 severity may be managed with self-care and monitoring. If symptoms persist beyond 3 days or worsen, contact healthcare services. Remember rural access may require advance planning.`;
  }
}