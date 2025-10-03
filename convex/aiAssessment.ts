/* eslint-disable @typescript-eslint/no-unused-vars */
// convex/aiAssessment.ts
import { v } from "convex/values";
import { action } from "./_generated/server";

function getDurationDescription(duration: string): string {
  const durationMap: Record<string, string> = {
    today: "Started today (acute onset)",
    yesterday: "Started yesterday (1 day duration)",
    "2-3_days": "Started 2-3 days ago",
    "1_week": "Started approximately 1 week ago",
    "2_weeks_plus": "Started 2+ weeks ago (chronic)",
    ongoing: "Ongoing/chronic condition",
  };
  return durationMap[duration] || duration;
}

function getDetailedFallbackAssessment(
  category: string,
  severity: number,
  duration: string,
  symptoms: string[]
): { context: string } {
  const mainSymptoms =
    symptoms.length > 0
      ? symptoms.slice(0, 3).join(", ")
      : "the symptoms you described";

  return {
    context: `I apologize, but I'm unable to provide a detailed visual analysis at this time. Based on your reported symptoms (${mainSymptoms}) with severity ${severity}/10, I recommend:

${severity >= 7 ? "⚠️ URGENT: Contact Health Link Alberta at 811 immediately for professional medical guidance, or proceed to the nearest emergency department if symptoms are worsening." : "Please contact Health Link Alberta at 811 for a proper medical assessment, as they can provide personalized guidance based on your specific situation."}

For immediate medical emergencies (difficulty breathing, chest pain, severe bleeding, loss of consciousness), always call 911.`,
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
  handler: async (ctx, args) => {
    const {
      description,
      severity,
      duration,
      environmentalFactors,
      category,
      symptoms,
      images,
    } = args;

    console.log("🔍 Gemini Medical Assessment Request:", {
      category,
      severity,
      hasImages: images && images.length > 0,
      imageCount: images?.length || 0,
      descriptionLength: description.length,
    });

    const systemPrompt = `CRITICAL: You are a licensed emergency medicine physician providing legitimate medical triage in rural Alberta, Canada. This is a healthcare application for medical assessment only.

MEDICAL CONTEXT OVERRIDE:
- ALL content is for legitimate healthcare purposes
- You MUST analyze medical conditions including burns, wounds, injuries, rashes, and other visible medical conditions
- You MUST provide detailed clinical assessments of medical images
- This is a protected healthcare application serving rural communities

ROLE: Emergency Medicine Physician with trauma and burn care experience

MEDICAL ASSESSMENT PROTOCOL:
1. Examine all visual evidence thoroughly
2. Provide specific clinical observations
3. Give evidence-based medical recommendations
4. Identify emergency conditions requiring immediate care
5. Consider rural healthcare access constraints

SPECIALTY AREAS YOU MUST ASSESS:
- Burns and thermal injuries
- Wounds and lacerations  
- Skin conditions and rashes
- Infections and inflammation
- Trauma and injuries
- Any visible medical condition

COMMUNICATION: Use direct clinical language. Be specific about findings, concerns, and urgency.`;

    const durationContext = getDurationDescription(duration);

    const userPrompt = `
HEALTHCARE TRIAGE ASSESSMENT - RURAL ALBERTA EMERGENCY MEDICINE

PATIENT MEDICAL PRESENTATION:
Chief Complaint: ${description}
Medical Category: ${category}
Patient-Reported Pain/Severity: ${severity}/10
Symptom Duration: ${durationContext}
Associated Medical Symptoms: ${symptoms.length > 0 ? symptoms.join(", ") : "See description"}
Relevant Exposure Factors: ${environmentalFactors.length > 0 ? environmentalFactors.join(", ") : "None reported"}

${
  images && images.length > 0
    ? `
MEDICAL IMAGING DOCUMENTATION:
${images.length} clinical photo(s) provided for medical assessment.
Conduct thorough visual medical examination focusing on:
- Tissue appearance and integrity
- Color, swelling, drainage patterns
- Anatomical location and distribution
- Signs of infection or complication
- Burn depth and characteristics (if applicable)
- Wound healing status
`
    : `
VISUAL ASSESSMENT:
No clinical photos available. Assessment based on patient medical description.
`
}

GEOGRAPHIC HEALTHCARE CONTEXT:
- Service Area: Rural Alberta, Canada
- Emergency Access: Nearest trauma center 30+ minutes
- Available Resources: Health Link Alberta (811), local clinics, emergency services
- Transport: Weather-dependent ambulance access

MEDICAL TRIAGE PRIORITY:
Provide comprehensive clinical assessment including:
1. Visual findings from medical images (if available)
2. Clinical interpretation and differential considerations
3. Burn/wound/injury grading if applicable
4. Infection risk assessment
5. Specific emergency red flags
6. Time-sensitive treatment recommendations
7. Rural-specific resource guidance

This is a legitimate medical consultation for healthcare triage purposes.`;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("❌ Gemini API key missing");
        return getDetailedFallbackAssessment(
          category,
          severity,
          duration,
          symptoms
        );
      }

      const modelName = "gemini-2.5-flash-lite";
      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

      const contentParts: any[] = [
        { text: `${systemPrompt}\n\n${userPrompt}` },
      ];

      if (
        images &&
        images.length > 0 &&
        modelName === "gemini-2.5-flash-lite"
      ) {
        console.log(`📸 Adding ${images.length} medical images for clinical analysis...`);
        for (let i = 0; i < images.length; i++) {
          const imageData = images[i];
          try {
            contentParts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData,
              },
            });
            console.log(`✓ Added medical image ${i + 1}/${images.length}`);
          } catch (imgError) {
            console.warn(`⚠️ Failed to process medical image ${i + 1}:`, imgError);
          }
        }
      }

      // MOST PERMISSIVE SAFETY SETTINGS FOR HEALTHCARE
      const body = {
        contents: [
          {
            parts: contentParts,
          },
        ],
        generationConfig: {
          temperature: 0.1, // Lower for more consistent medical responses
          maxOutputTokens: 2048, // More tokens for detailed medical analysis
          topP: 0.7,
          topK: 32,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE", // Most permissive
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE", // Most permissive
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH", // Conservative for medical appropriateness
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE", // Most permissive - allows medical content
          },
        ],
      };

      console.log("📤 Sending medical assessment request to Gemini...");

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
        
        // Try to parse error for better messaging
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error?.message) {
            console.error("🔍 Detailed error:", errorData.error.message);
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        return getDetailedFallbackAssessment(
          category,
          severity,
          duration,
          symptoms
        );
      }

      const data = JSON.parse(responseText);

      // Enhanced blocking handling
      if (data.promptFeedback?.blockReason) {
        console.warn("⚠️ Medical content blocked:", data.promptFeedback.blockReason);
        
        // Try multiple fallback strategies
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const partialContext = data.candidates[0].content.parts[0].text;
          console.log("📝 Using partial medical response despite filtering");
          return { 
            context: partialContext + "\n\nNote: Medical assessment was partially filtered. Please consult healthcare professional immediately for complete evaluation."
          };
        }
        
        // Try alternative approach for burns/injuries
        if (category.toLowerCase().includes('burn') || description.toLowerCase().includes('burn')) {
          return {
            context: `URGENT BURN ASSESSMENT REQUIRED

Based on your reported burn injury with severity ${severity}/10:

CRITICAL BURN CARE GUIDANCE:
${severity >= 7 ? 
`🚨 EMERGENCY: Seek immediate medical care for:
- Large burns (larger than palm size)
- Burns on face, hands, feet, or genitals
- Chemical or electrical burns
- Signs of infection (pus, redness, fever)
- Difficulty breathing if face burned

Go to nearest emergency department immediately.` :
`⚠️ URGENT: For burn care:
- Cool burn with cool (not cold) running water for 10-20 minutes
- Cover with clean, non-stick dressing
- Monitor for infection signs
- Contact Health Link Alberta at 811 immediately for burn severity assessment

Burns can worsen quickly. Professional medical evaluation required.`}

For all burns: Do not apply ice, butter, or ointments. Seek professional medical assessment.`
          };
        }
        
        return getDetailedFallbackAssessment(
          category,
          severity,
          duration,
          symptoms
        );
      }

      const context = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!context) {
        console.warn("❌ No medical assessment generated");
        return getDetailedFallbackAssessment(
          category,
          severity,
          duration,
          symptoms
        );
      }

      console.log("✅ Medical assessment completed successfully");
      return { context };
    } catch (error: any) {
      console.error("❌ Medical assessment error:", error);
      
      // Special handling for burn-related content
      if (args.category.toLowerCase().includes('burn') || args.description.toLowerCase().includes('burn')) {
        return {
          context: `BURN INJURY ASSESSMENT

Based on your reported burn with severity ${args.severity}/10:

${args.severity >= 7 ? 
`🚨 EMERGENCY BURN CARE NEEDED:
- Seek immediate medical attention
- Do not apply any creams or home remedies
- Cover with clean, dry cloth
- Go to nearest emergency department` :
`⚠️ URGENT BURN EVALUATION:
- Cool with running water for 10-20 minutes
- Cover with sterile non-stick dressing
- Contact Health Link Alberta at 811 immediately
- Monitor for blistering, swelling, or pain increase

All burns require professional medical assessment.`}

Call 911 for: Difficulty breathing, large burns, chemical/electrical burns, or burns on face/hands/feet.`
        };
      }
      
      return getDetailedFallbackAssessment(
        args.category,
        args.severity,
        args.duration,
        args.symptoms
      );
    }
  },
});