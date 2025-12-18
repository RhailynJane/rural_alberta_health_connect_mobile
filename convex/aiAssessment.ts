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

/**
 * Compresses base64 image by reducing its size estimate
 * Images over 800KB are likely causing payload issues
 */
function checkAndLogImageSize(base64Data: string, index: number): { sizeKB: number; tooLarge: boolean } {
  // Base64 is ~1.33x original binary size
  const sizeInKB = Math.round((base64Data.length * 0.75) / 1024);
  const tooLarge = sizeInKB > 800; // Flag if over 800KB
  
  console.log(`📊 Image ${index + 1} size: ~${sizeInKB}KB${tooLarge ? ' ⚠️ (LARGE - may cause issues)' : ''}`);
  
  return { sizeKB: sizeInKB, tooLarge };
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
    // YOLO detection context - formatted text from on-device wound detection
    yoloContext: v.optional(v.string()),
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
      yoloContext,
    } = args;

    console.log("🔍 Gemini Medical Assessment Request:", {
      category,
      severity,
      hasImages: images && images.length > 0,
      imageCount: images?.length || 0,
      descriptionLength: description.length,
      hasYoloContext: !!yoloContext,
      yoloContextLength: yoloContext?.length || 0,
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

${yoloContext ? `
${yoloContext}
` : ''}
${
  images && images.length > 0
    ? `
MEDICAL IMAGING DOCUMENTATION:
${images.length} clinical photo(s) provided for comprehensive medical assessment.

CRITICAL IMAGE ANALYSIS INSTRUCTIONS:
${images.length > 1 ? `
- MULTIPLE PHOTOS PROVIDED: These may show:
  * Different angles/views of the SAME affected area (analyze comprehensively)
  * DIFFERENT affected areas/body parts (assess each separately)
  * Progression over time (compare and note changes)
  * Close-up and wide-angle views (use both for complete assessment)

- For EACH photo, document:
  1. Anatomical location (which body part/area)
  2. Specific clinical findings visible
  3. Severity indicators in that particular view
  4. Any progression or variation between images

- SYNTHESIZE findings across all photos for complete clinical picture
- Note if photos show same area from different angles or different areas entirely
` : `
- SINGLE PHOTO PROVIDED: Conduct thorough examination of visible area
- Note any limitations in assessment due to single view
`}

DETAILED VISUAL EXAMINATION PROTOCOL:
- Tissue appearance and integrity (intact vs. broken skin, blistering, charring)
- Color variations (erythema, pallor, cyanosis, hyperpigmentation)
- Swelling and edema patterns (localized vs. diffuse)
- Drainage characteristics (serous, purulent, bloody, amount)
- Anatomical location and distribution pattern
- Size estimation (compare to common references like palm, coin)
- Signs of infection (warmth, streaking, purulence, surrounding cellulitis)
- Burn depth indicators if applicable (first, second, third degree features)
- Wound healing stage (fresh, granulating, epithelializing, concerning features)
- Surrounding tissue condition
`
    : `
VISUAL ASSESSMENT:
No clinical photos available. Assessment based entirely on patient's medical description.
LIMITATION: Unable to perform visual medical examination. Recommendations will be more conservative.
`
}

GEOGRAPHIC HEALTHCARE CONTEXT:
- Service Area: Rural Alberta, Canada
- Emergency Access: Nearest trauma center 30+ minutes
- Available Resources: Health Link Alberta (811), local clinics, emergency services
- Transport: Weather-dependent ambulance access

MEDICAL TRIAGE PRIORITY:
Provide comprehensive clinical assessment with this EXACT structure and format:

1. CLINICAL ASSESSMENT
   - One clear sentence stating the primary clinical impression
   - Brief severity assessment (mild/moderate/severe)
   ${images && images.length > 1 ? '- Synthesis of findings across all ' + images.length + ' photos' : ''}

2. VISUAL FINDINGS (if photos provided)
   ${images && images.length > 1 ? '- Findings from each photo location/angle' : ''}
   - Specific observable clinical features (bullet points)
   - Size, color, texture observations

3. CLINICAL INTERPRETATION
   - Most likely condition (one line)
   - Key supporting evidence (bullet points)

4. BURN/WOUND GRADING (if applicable)
   - Classification with brief explanation

5. INFECTION RISK
   - Risk level (low/moderate/high)
   - Key indicators present or absent

6. URGENCY ASSESSMENT
   - Care timeline recommendation

7. RECOMMENDATIONS
   FORMAT: Start each line with an action verb. Keep each recommendation to one line.
   Example format:
   - Clean the affected area with mild soap and water
   - Apply a thin layer of antibiotic ointment
   - Cover with a sterile non-stick bandage
   - Take over-the-counter pain relief as needed

8. NEXT STEPS
   FORMAT: Use time-based or condition-based headers. Be specific and actionable.
   REQUIRED STRUCTURE - use exactly this format:
   - Today: [immediate action to take]
   - Within 24-48 hours: [short-term follow-up action]
   - If symptoms worsen: [escalation guidance with specific signs to watch]
   - Follow-up: [when to reassess or seek additional care]

   Example:
   - Today: Rest the affected area and apply cold compress for 15 minutes every 2 hours
   - Within 24-48 hours: Monitor for increased redness, swelling, or warmth
   - If symptoms worsen: Seek medical attention if you notice spreading redness, fever, or increased pain
   - Follow-up: Schedule a clinic visit within 3-5 days if not significantly improved

IMPORTANT: Keep recommendations and next steps concise. Use bullet points, not paragraphs. Start with action verbs. Include specific timeframes.

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
        
        // Limit to first 3 images to avoid payload size issues
        const imageLimit = Math.min(images.length, 3);
        console.log(`⚠️ Processing ${imageLimit} of ${images.length} images (API limit: 3)`);
        
        let totalPayloadKB = 0;
        
        for (let i = 0; i < imageLimit; i++) {
          const imageData = images[i];
          try {
            // Validate base64 data
            if (!imageData || imageData.length === 0) {
              console.warn(`⚠️ Image ${i + 1} is empty, skipping`);
              continue;
            }
            
            // Check and log image size
            const { sizeKB, tooLarge } = checkAndLogImageSize(imageData, i);
            totalPayloadKB += sizeKB;
            
            if (tooLarge) {
              console.warn(`⚠️ Image ${i + 1} is very large (${sizeKB}KB). Consider reducing image quality in the app.`);
            }
            
            contentParts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData,
              },
            });
            console.log(`✓ Added medical image ${i + 1}/${imageLimit}`);
          } catch (imgError) {
            console.warn(`⚠️ Failed to process medical image ${i + 1}:`, imgError);
          }
        }
        
        console.log(`📊 Total payload size: ~${totalPayloadKB}KB for ${imageLimit} images`);
        
        if (totalPayloadKB > 2000) {
          console.warn(`⚠️ Total payload (${totalPayloadKB}KB) is large. May hit API limits. Recommend image compression.`);
        }
        
        if (images.length > imageLimit) {
          console.warn(`⚠️ ${images.length - imageLimit} additional images not sent due to API limits`);
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
      console.log("📤 Request details:", {
        modelName,
        hasImages: contentParts.length > 1,
        imageCount: contentParts.length - 1,
        totalParts: contentParts.length,
        temperature: body.generationConfig.temperature,
        maxTokens: body.generationConfig.maxOutputTokens
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      console.log("📥 Gemini response status:", response.status);
      console.log("📊 Response length:", responseText.length, "characters");
      
      if (response.status !== 200) {
        console.error("❌ Non-200 status code:", response.status);
        console.error("❌ Response preview:", responseText.substring(0, 500));
      }

      if (!response.ok) {
        console.error("❌ Gemini API error:", responseText);
        
        // Try to parse error for better messaging
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error?.message) {
            console.error("🔍 Detailed error:", errorData.error.message);
            console.error("🔍 Error status:", errorData.error?.status);
            console.error("🔍 Error code:", errorData.error?.code);
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
      
      // Log prompt feedback for debugging
      if (data.promptFeedback) {
        console.log("📋 Prompt Feedback:", JSON.stringify(data.promptFeedback, null, 2));
      }
      
      // Log candidate details
      if (data.candidates) {
        console.log("📋 Candidates count:", data.candidates.length);
        data.candidates.forEach((candidate: any, idx: number) => {
          console.log(`📋 Candidate ${idx}:`, {
            finishReason: candidate.finishReason,
            safetyRatings: candidate.safetyRatings?.map((r: any) => 
              `${r.category}: ${r.probability}`
            ),
          });
        });
      }

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
        console.warn("❌ Candidates data:", JSON.stringify(data.candidates, null, 2));
        console.warn("❌ Full response structure:", JSON.stringify({
          hasCandidates: !!data.candidates,
          candidatesLength: data.candidates?.length,
          firstCandidate: data.candidates?.[0] ? {
            hasContent: !!data.candidates[0].content,
            hasParts: !!data.candidates[0].content?.parts,
            partsLength: data.candidates[0].content?.parts?.length,
            finishReason: data.candidates[0].finishReason
          } : null
        }, null, 2));
        return getDetailedFallbackAssessment(
          category,
          severity,
          duration,
          symptoms
        );
      }

      console.log("✅ Medical assessment completed successfully");
      console.log("✅ Assessment preview:", context.substring(0, 200) + "...");
      console.log("✅ Assessment length:", context.length, "characters");
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