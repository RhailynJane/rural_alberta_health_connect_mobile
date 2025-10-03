// convex/aiAssessment.ts
import { v } from "convex/values";
import { action } from "./_generated/server";

function getDurationDescription(duration: string): string {
  const durationMap: Record<string, string> = {
    "today": "Started today (acute onset)",
    "yesterday": "Started yesterday (1 day duration)",
    "2-3_days": "Started 2-3 days ago",
    "1_week": "Started approximately 1 week ago",
    "2_weeks_plus": "Started 2+ weeks ago (chronic)",
    "ongoing": "Ongoing/chronic condition"
  };
  return durationMap[duration] || duration;
}

function getDetailedFallbackAssessment(
  category: string, 
  severity: number, 
  duration: string, 
  symptoms: string[]
): { context: string } {
  const mainSymptoms = symptoms.length > 0 ? symptoms.slice(0, 3).join(", ") : "the symptoms you described";
  
  return {
    context: `I apologize, but I'm unable to provide a detailed visual analysis at this time. Based on your reported symptoms (${mainSymptoms}) with severity ${severity}/10, I recommend:

${severity >= 7 ? "⚠️ URGENT: Contact Health Link Alberta at 811 immediately for professional medical guidance, or proceed to the nearest emergency department if symptoms are worsening." : "Please contact Health Link Alberta at 811 for a proper medical assessment, as they can provide personalized guidance based on your specific situation."}

For immediate medical emergencies (difficulty breathing, chest pain, severe bleeding, loss of consciousness), always call 911.`
  };
}

export const generateContextWithGemini = action({
  args: {
    description: v.string(),
    severity: v.number(),
    duration: v.string(),
    environmentalFactors: v.array(v.string()),
    category: v.string(),
    symptoms: v.array(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async(ctx, args) => {
    const { description, severity, duration, environmentalFactors, category, symptoms, images } = args;

    console.log("🔍 Gemini Medical Assessment Request:", { 
      category, 
      severity, 
      hasImages: images && images.length > 0,
      imageCount: images?.length || 0,
      descriptionLength: description.length
    });

    const systemPrompt = `You are an experienced emergency medicine triage nurse with 15+ years of experience in rural healthcare settings. Your role is to analyze patient presentations and provide clinical triage assessments.

ANALYSIS APPROACH:
When images are provided:
1. Carefully examine visible features: color, texture, size, borders, distribution patterns
2. Compare to typical clinical presentations for the reported condition
3. Note any concerning features: infection signs (redness, warmth, purulent drainage), tissue damage, abnormal coloration, asymmetry
4. Cross-reference visual findings with patient's description and reported severity
5. Identify inconsistencies or additional concerns not mentioned by patient

Clinical Triage Framework:
- Severity 9-10: Life-threatening emergency - immediate 911
- Severity 7-8: Urgent care needed within 4-6 hours
- Severity 4-6: Evaluation needed within 24-48 hours  
- Severity 1-3: Self-care with monitoring appropriate

ASSESSMENT STRUCTURE:
Start with: "Based on my analysis of your [photos and/or description]..."

Then provide:
1. **Visual Examination Findings** (if images): "In the photos, I observe [specific details about color, size, texture, borders, etc.]"
2. **Clinical Interpretation**: What these findings suggest clinically
3. **Severity Assessment**: Does your observation match their reported severity? Any red flags?
4. **Triage Recommendation**: Specific timeframe and care setting with rationale
5. **Warning Signs**: Specific changes that would require escalation
6. **Immediate Care Advice**: What to do right now

Communicate like a clinical professional: direct, specific, evidence-based, but compassionate. Avoid medical jargon without explanation. If you see concerning features in photos, clearly state what you observe and why it concerns you.`;

    const durationContext = getDurationDescription(duration);
    
    const userPrompt = `
PATIENT TRIAGE ASSESSMENT

CHIEF COMPLAINT & HISTORY:
${description}

SYMPTOM CATEGORY: ${category}
PATIENT-REPORTED SEVERITY: ${severity}/10
SYMPTOM DURATION: ${durationContext}
ASSOCIATED SYMPTOMS: ${symptoms.length > 0 ? symptoms.join(", ") : "See description"}
ENVIRONMENTAL/EXPOSURE FACTORS: ${environmentalFactors.length > 0 ? environmentalFactors.join(", ") : "None reported"}

${images && images.length > 0 ? `
CLINICAL PHOTOS AVAILABLE: ${images.length} image(s) provided
Please perform a thorough visual examination and describe:
- Visible appearance (color, texture, size, shape, borders)
- Distribution pattern and affected area extent
- Signs of infection, inflammation, or tissue damage
- Comparison to typical presentations
- Any concerning features requiring immediate attention
` : `
NO VISUAL DOCUMENTATION PROVIDED
Assessment based on patient description only. Recommend documentation with photos if condition is visible.`}

CLINICAL CONTEXT:
- Setting: Rural Alberta healthcare system
- Access considerations: Nearest hospital 30+ minutes, weather-dependent transport
- Available resources: Health Link Alberta (811), local clinics, emergency services

Provide your clinical triage assessment as an experienced emergency medicine nurse would.`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("❌ Gemini API key missing");
        return getDetailedFallbackAssessment(category, severity, duration, symptoms);
      }

      const modelName = images && images.length > 0 ? "gemini-1.5-pro-latest" : "gemini-pro";
      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
      
      const contentParts: any[] = [
        { text: `${systemPrompt}\n\n${userPrompt}` }
      ];

      if (images && images.length > 0 && modelName === "gemini-1.5-pro-latest") {
        console.log(`📸 Adding ${images.length} images for visual analysis...`);
        for (let i = 0; i < images.length; i++) {
          const imageData = images[i];
          try {
            contentParts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData
              }
            });
            console.log(`✓ Added image ${i + 1}/${images.length}`);
          } catch (imgError) {
            console.warn(`⚠️ Failed to process image ${i + 1}:`, imgError);
          }
        }
      }
      
      const body = {
        contents: [{
          parts: contentParts
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_MEDICAL",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      };

      console.log("📤 Sending clinical assessment request to Gemini...");
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      const responseText = await response.text();
      console.log("📥 Gemini response status:", response.status);
      
      if (!response.ok) {
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
        console.warn("❌ No assessment generated");
        return getDetailedFallbackAssessment(category, severity, duration, symptoms);
      }
      
      console.log("✅ Clinical assessment completed successfully");
      return { context };
      
    } catch (error) {
      console.error("❌ Assessment error:", error);
      return getDetailedFallbackAssessment(category, severity, duration, symptoms);
    }
  }
});