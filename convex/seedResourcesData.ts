import { mutation } from "./_generated/server";

/**
 * Seed Resources Data - Run this mutation once to populate the resources table
 * 
 * To execute:
 * 1. Open Convex Dashboard
 * 2. Go to Functions
 * 3. Find "seedResourcesData" mutation
 * 4. Click "Run" (no arguments needed)
 */

export default mutation({
  handler: async (ctx) => {
    // Clear existing resources first
    const existing = await ctx.db.query("resources").collect();
    for (const resource of existing) {
      await ctx.db.delete(resource._id);
    }

    // Seed data with all 16 resources
    const resources = [
      {
        title: "Burns & Fire Safety",
        subtitle: "Emergency • 5-8 mins",
        icon: "local-fire-department",
        iconColor: "#FF6B35",
        bgGradient: ['#FF6B35', '#FF8F5C'],
        category: 'burns-heat',
        importance: 'high',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**First-Degree Burns (Superficial)**
• Affects only the outer layer of skin (epidermis)
• Symptoms: Redness, pain, mild swelling
• Treatment: Cool water for 10-15 minutes, aloe vera gel, pain relievers
• Heals in 3-7 days without scarring

**Second-Degree Burns (Partial Thickness)**
• Affects epidermis and part of dermis
• Symptoms: Red, blistered skin, severe pain, swelling
• Treatment: Cool water, don't break blisters, sterile gauze, seek medical care
• May require antibiotics and specialized dressing
• Heals in 2-3 weeks, may scar

**Third-Degree Burns (Full Thickness)**
• Destroys all skin layers, may affect muscle/bone
• Symptoms: White/charred skin, little to no pain (nerve damage)
• Treatment: CALL 911 IMMEDIATELY
• Cover with clean cloth, elevate if possible
• Do NOT remove stuck clothing
• Requires hospitalization and skin grafts

**General Burn Care**
⚠️ Never apply ice, butter, or oils
⚠️ Seek immediate care for burns on face, hands, feet, or genitals
⚠️ Watch for signs of infection: increased pain, pus, fever`,
      },
      {
        title: "Trauma & Injuries",
        subtitle: "Emergency • 6-10 mins",
        icon: "healing",
        iconColor: "#E63946",
        bgGradient: ['#E63946', '#EF5A6F'],
        category: 'trauma-injuries',
        importance: 'high',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Cuts & Lacerations**
• Stop bleeding: Apply direct pressure for 10 minutes
• Clean wound with clean water
• Apply antibiotic ointment
• Cover with sterile bandage
• Seek medical care if: Deep, won't stop bleeding, or shows signs of infection

**Fractures (Broken Bones)**
• Symptoms: Severe pain, swelling, deformity, inability to move
• Do NOT try to realign
• Immobilize the area
• Apply ice (wrapped in cloth)
• Seek immediate medical attention

**Sprains & Strains**
• RICE method: Rest, Ice, Compression, Elevation
• Ice for 15-20 minutes every 2-3 hours
• Use compression bandage
• Elevate above heart level
• See doctor if severe pain or no improvement in 48 hours

**Head Injuries**
⚠️ CALL 911 if: Loss of consciousness, confusion, vomiting, severe headache
• Keep person still and calm
• Monitor for changes in consciousness
• Apply ice to reduce swelling
• Do NOT give medication without medical advice

**Bleeding Control**
• Apply direct pressure with clean cloth
• Elevate injured area above heart
• Apply pressure to pressure points if needed
• Use tourniquet ONLY as last resort for life-threatening bleeding`,
      },
      {
        title: "Third-Degree Burns",
        subtitle: "Emergency • 5-7 mins",
        icon: "local-fire-department",
        iconColor: "#B91C1C",
        bgGradient: ['#B91C1C', '#DC2626'],
        category: 'burns-heat',
        importance: 'critical',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**What Are Third-Degree Burns?**
Third-degree burns, also called full-thickness burns, are the most serious type of burn injury. They injure all layers of the skin as well as the fatty tissue beneath them. These burns severely affect the skin's ability to grow back naturally.

**Identifying Third-Degree Burns**
• All skin layers are destroyed
• May extend into fatty tissue, muscle, or bone
• Nerves are destroyed (may feel less painful than second-degree burns)
• Appearance: White, cherry red, or black coloring
• Skin does not change colour when pressed (does not blanch)
• Texture: Dry, hard, leathery-looking
• Blisters may develop but skin is mostly dry

**Common Causes**
• Steam exposure
• Hot oil and grease
• Chemical burns
• Electrical currents
• Hot liquids (scalding)
• Prolonged flame exposure
• Contact with extremely hot objects

**Immediate Action Required**
⚠️ CALL 911 IMMEDIATELY - This is a medical emergency
• Remove person from burn source
• Do NOT remove clothing stuck to burn
• Cover burn with clean, cool, moist cloth or bandage
• Elevate burned area if possible
• Keep person warm to prevent shock
• Monitor breathing and consciousness

**What NOT To Do**
⚠️ Never apply ice, butter, oils, or ointments
⚠️ Do NOT break blisters
⚠️ Do NOT try to remove stuck clothing or debris
⚠️ Do NOT immerse large burns in cold water (can cause shock)
⚠️ Do NOT give anything by mouth if severe burns

**Medical Treatment Required**
Third-degree burns ALWAYS require professional medical care:
• Emergency room evaluation
• Possible hospitalization
• Wound cleaning and debridement
• IV fluids and pain management
• Antibiotics to prevent infection
• Skin grafts for large burns
• Possible surgery and reconstructive procedures

**Major Concerns**
**Infection Risk**
• Destroyed skin barrier allows bacteria entry
• High risk of life-threatening infection
• Requires close medical monitoring
• May need isolation precautions

**Healing Process**
• Small burns: Skin heals by shrinking and scarring
• Large burns: Require skin grafts and surgery
• Extended recovery time (weeks to months)
• Physical therapy may be needed
• Psychological support recommended

**Long-Term Care**
• Scar management and treatment
• Range of motion exercises
• Pressure garments to reduce scarring
• Regular follow-up appointments
• Possible additional surgeries

**Prevention**
• Use caution with hot liquids and cooking
• Keep electrical systems properly maintained
• Store chemicals safely and use proper protection
• Install and maintain smoke detectors
• Have fire extinguishers accessible
• Practice fire escape plans

**When to Seek Emergency Care**
⚠️ All third-degree burns require immediate medical attention
⚠️ Burns larger than 3 inches (7.6 cm)
⚠️ Burns on face, hands, feet, joints, or genitals
⚠️ Burns that circle arms or legs
⚠️ Chemical or electrical burns
⚠️ Difficulty breathing or signs of shock`,
      },
      {
        title: "Infections & Wound Care",
        subtitle: "Education • 4-6 mins",
        icon: "coronavirus",
        iconColor: "#F77F00",
        bgGradient: ['#F77F00', '#FB9131'],
        category: 'infections',
        importance: 'medium',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Signs of Infection**
• Increased redness, warmth, swelling
• Pus or cloudy drainage
• Red streaks from wound
• Fever (over 100.4°F / 38°C)
• Increased pain
• Foul odor

**Wound Care**
• Wash hands thoroughly before and after
• Clean wound with clean water or saline
• Apply antibiotic ointment
• Cover with sterile bandage
• Change dressing daily or if wet/dirty
• Monitor for infection signs

**Common Infections**
**Cellulitis**
• Bacterial skin infection
• Symptoms: Red, swollen, warm, tender skin
• Requires antibiotics - see doctor

**Abscess**
• Pus-filled pocket under skin
• Symptoms: Painful, swollen lump, may be warm
• May require drainage by doctor

**Sepsis Warning Signs** ⚠️
• High or very low temperature
• Fast heart rate
• Rapid breathing
• Confusion
• Extreme pain
• CALL 911 - Life-threatening emergency

**Prevention**
• Keep wounds clean and dry
• Complete full course of antibiotics if prescribed
• Maintain good hygiene
• Keep tetanus vaccination current`,
      },
      {
        title: "Skin Conditions & Rashes",
        subtitle: "Education • 4-6 mins",
        icon: "spa",
        iconColor: "#06A77D",
        bgGradient: ['#06A77D', '#10B981'],
        category: 'skin-rash',
        importance: 'medium',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Common Rashes**

**Contact Dermatitis**
• Caused by allergens or irritants
• Symptoms: Red, itchy, may have blisters
• Treatment: Avoid trigger, cool compress, hydrocortisone cream
• See doctor if severe or spreading

**Eczema (Atopic Dermatitis)**
• Chronic inflammatory condition
• Symptoms: Dry, itchy, red patches
• Treatment: Moisturize regularly, avoid triggers, prescribed creams

**Hives (Urticaria)**
• Allergic reaction
• Symptoms: Raised, itchy welts
• Treatment: Antihistamines, avoid trigger
• ⚠️ Seek emergency care if difficulty breathing

**Heat Rash**
• Blocked sweat glands
• Symptoms: Small red bumps, itchy
• Treatment: Cool environment, loose clothing, calamine lotion

**Fungal Infections**
**Athlete's Foot**
• Itchy, peeling skin between toes
• Treatment: Antifungal cream, keep feet dry

**Ringworm**
• Circular, red, scaly patches
• Treatment: Antifungal cream, avoid sharing items

**When to See a Doctor**
⚠️ Rash with fever
⚠️ Sudden widespread rash
⚠️ Painful or blistering
⚠️ Signs of infection
⚠️ Doesn't improve with home treatment`,
      },
      {
        title: "Cold Weather Injuries",
        subtitle: "Prevention • 5-7 mins",
        icon: "ac-unit",
        iconColor: "#118AB2",
        bgGradient: ['#118AB2', '#0EA5E9'],
        category: 'cold-frostbite',
        importance: 'high',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Hypothermia**
• Body temperature drops below 95°F (35°C)
• Symptoms:
  - Shivering (stops in severe cases)
  - Confusion, slurred speech
  - Drowsiness
  - Weak pulse, slow breathing
• Treatment:
  - CALL 911 immediately
  - Move to warm location
  - Remove wet clothing
  - Warm gradually with blankets
  - Give warm (not hot) beverages if conscious
  - ⚠️ DO NOT use direct heat or hot water

**Frostbite**
• Freezing of skin and underlying tissues
• Most common: Fingers, toes, nose, ears, cheeks

**Stages:**
**Frostnip (mild)**
• Pale or red skin
• Numbness, tingling
• Treatment: Rewarm gently

**Superficial Frostbite**
• White or grayish-yellow skin
• Skin feels hard but tissue underneath is soft
• May form blisters after rewarming

**Deep Frostbite**
• White or bluish skin
• Complete numbness
• Skin and underlying tissue are hard
• ⚠️ MEDICAL EMERGENCY

**First Aid for Frostbite**
• Get to warm place
• Remove wet clothing
• Don't walk on frostbitten feet
• Immerse in warm (not hot) water (98-105°F / 37-40°C)
• Don't rub or massage
• Wrap in sterile dressing (separate affected digits)
• SEEK MEDICAL ATTENTION

**Prevention**
• Dress in layers
• Cover exposed skin
• Stay dry
• Avoid alcohol (causes heat loss)
• Watch for warning signs
• Limit time outdoors in extreme cold`,
      },
      {
        title: "Essential First Aid",
        subtitle: "Emergency • 8-10 mins",
        icon: "medical-services",
        iconColor: "#DC2626",
        bgGradient: ['#DC2626', '#EF4444'],
        category: 'emergency-prevention',
        importance: 'critical',
        readTime: 'By SafeSpace Mental Health Team',
        content: `**Emergency Numbers**
• 911 - Emergency Services
• 811 - Health Link Alberta (24/7 health advice)

**CPR Basics** (Call 911 first)
• Check responsiveness
• Call for help
• 30 chest compressions (2 inches deep, 100-120/min)
• 2 rescue breaths
• Continue until help arrives or person responds

**Choking (Heimlich Maneuver)**
**For Conscious Adult/Child:**
• Stand behind person
• Make fist above navel
• Grasp with other hand
• Quick upward thrusts
• Continue until object dislodged

**For Infant:**
• 5 back blows between shoulder blades
• 5 chest thrusts
• Alternate until object dislodged

**Allergic Reactions**
**Mild:** Antihistamines, monitor
**Severe (Anaphylaxis):**
• Use EpiPen if available
• CALL 911 immediately
• Signs: Difficulty breathing, swelling, dizziness

**Shock**
• Symptoms: Pale, cold skin, rapid pulse, confusion
• Lay person down, elevate legs
• Keep warm
• CALL 911

**Basic First Aid Kit**
□ Bandages (various sizes)
□ Sterile gauze pads
□ Adhesive tape
□ Antiseptic wipes
□ Antibiotic ointment
□ Scissors, tweezers
□ Thermometer
□ Pain relievers
□ Hydrocortisone cream
□ Instant cold packs
□ CPR face shield
□ Emergency contact list

**Remember:**
⚠️ Always call 911 for life-threatening emergencies
⚠️ When in doubt, seek professional medical help
⚠️ Take a certified first aid course for proper training`,
      },
      {
        title: "First-Degree Burn Home Care",
        subtitle: "Education • 3-5 mins",
        icon: "spa",
        iconColor: "#10B981",
        bgGradient: ['#10B981', '#34D399'],
        category: 'burns-heat',
        importance: 'medium',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Home Treatment for First-Degree Burns and Sunburns**
While there is no evidence-based research to support the safety and effectiveness of all home treatments, these measures may help relieve burn symptoms.

**Cooling Methods**
• Soak a facecloth in water to make a cool compress
• Apply cool (not ice) water to the affected area
• Continue cooling until pain subsides

**Soothing Baths**
• Add a handful of oatmeal (ground to a powder) to your bath
• Try an oatmeal bath product, such as Aveeno
• Soak for 15-20 minutes for relief

**Skin Care**
• Use a moisturizer or light powder where skin rubs
• Apply calamine lotion for itching
• Keep skin clean and dry
• Avoid tight clothing on burned areas

**Natural Remedies**
• Cut a raw potato and spread the juice on burned skin
• Use chamomile diluted in warm water
• Brew chamomile tea and sponge on burned skin
• Try aloe vera lotion or gel
• Add 2-3 drops of lavender essential oil to 1 teaspoon vegetable oil

**Important Precautions**
⚠️ Avoid breaking open any blisters
⚠️ Watch for signs of skin infection
⚠️ If symptoms worsen, seek medical attention
⚠️ Do not apply ice directly to burns

**Signs of Infection**
• Increased redness or swelling
• Pus or discharge
• Fever
• Increased pain
• Red streaks from the burn`,
      },
      {
        title: "Child Safety: Preventing Burns",
        subtitle: "Prevention • 8-10 mins",
        icon: "child-care",
        iconColor: "#F59E0B",
        bgGradient: ['#F59E0B', '#FBBF24'],
        category: 'emergency-prevention',
        importance: 'high',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Burns Can Happen in Any Home**
Heat, electricity, friction, and chemicals can all cause burns. Protect your child by being aware of these hazards.

**Heat Burns (Thermal Burns)**
Caused by fire, steam, hot objects, or hot liquids. Tap water is a leading cause of non-fatal burns.

**Kitchen Safety**
• Keep children away from kitchen appliances
• Install scald-resistant faucets (max 49°C / 120°F)
• Use kitchen range dial protectors
• Cook on back burner with handles turned away
• Be careful not to spill hot beverages around children

**Home Safety**
• Use screens to block fireplaces and heaters
• Keep children away from irons and heating appliances
• Keep portable and wall heaters out of reach
• Store flammable garage items safely

**Outdoor Safety**
• Keep children away from barbecue grills
• Maintain safe distance from campfires
• Enjoy fireworks from a distance
⚠️ Children should not use firecrackers or sparklers

**Electrical Burns**
Caused by contact with electrical sources or lightning.

**Electrical Safety Measures**
• Place plug covers on all outlets
• Unplug electrical items in child's reach
• Use extra caution near water sources
• Don't let children play with plug-in toys
• Take children indoors during electrical storms
• Don't overload outlets with extension cords
• Replace worn electrical equipment
• Check wires for loose or frayed areas

**Friction Burns**
Caused by contact with hard surfaces (pavement, carpets, gym floors).

**Prevention**
• Avoid dragging children across carpet
• Provide safety equipment (knee pads, elbow pads)
• Use protective gear for skating and scooters

**Chemical Burns**
⚠️ Keep Poison Centre number: 1-844-POISON-X (1-844-764-7669)

**Keep Out of Reach**
• Toilet cleaners
• Battery acid
• Bleach
• Lime products
• Plaster and mortar
• Oven and drain cleaners
• Fertilizers
• Sparkler sparks

**Battery Safety**
• Ensure batteries are in protective casings
• Use casings that require adult assistance to open
• Keep spare batteries locked away`,
      },
      {
        title: "Acid Burns",
        subtitle: "Emergency • 6-8 mins",
        icon: "science",
        iconColor: "#DC2626",
        bgGradient: ['#DC2626', '#EF4444'],
        category: 'burns-heat',
        importance: 'critical',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**What Are Acid Burns?**
Acid products can cause serious injury. Damage depends on the type, strength, and length of contact.

**Common Acid Products**
• Toilet cleaners
• Battery acid
• Bleach
• Industrial crystal etching chemicals
• Gas additives

**Immediate Action**
⚠️ Call Poison Control Centre: 1-844-POISON-X (1-844-764-7669)
• Have the chemical container ready
• Read the contents label to staff
• Get specific treatment instructions

**Chemical Burns Rinsed with Water**

**Standard Treatment:**
• Immediately rinse with large amount of cool water
• Rinsing within 1 minute reduces complication risk
• Flush the area for at least 20 minutes
• Do NOT use hard spray (can damage tissue)
• Have person remove chemical if able
• Put on gloves before helping remove chemicals
• Remove contaminated clothing and jewelry while flushing
• If burning sensation continues, flush 10-15 more minutes

**Hydrofluoric Acid**
⚠️ Special treatment required
• Flush with large amount of water
• Treated with calcium gluconate
• NEED IMMEDIATE MEDICAL CARE

**Chemical Burns NOT Rinsed with Water**

**Carbolic Acid or Phenol**
• Does not mix with water
• Use alcohol first to flush
• Then flush with water
⚠️ Do NOT flush eye with alcohol

**Sulfuric Acid**
• Flush with mild, soapy solution for minor burns
• Note: Feels hot when water is added
• Better to flush than leave acid on skin

**Metal Compounds**
• Cover with mineral oil
• Do not rinse with water

**Chemical Burns to the Eye**
⚠️ IMMEDIATE ACTION REQUIRED
• Flush substance out with large amounts of water
• Reduces chance of serious eye damage
• Continue flushing while getting medical help
• See Eye Injury section for detailed instructions

**After Treatment**
• Seek medical evaluation
• Take chemical container with you
• Monitor for signs of infection
• Follow up as directed`,
      },
      {
        title: "Alkali Burns",
        subtitle: "Emergency • 6-8 mins",
        icon: "science",
        iconColor: "#7C3AED",
        bgGradient: ['#7C3AED', '#8B5CF6'],
        category: 'burns-heat',
        importance: 'critical',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**What Are Alkali Burns?**
Alkaline chemicals can cause serious damage very quickly and penetrate deeper tissue layers.

**Common Alkaline Products**
• Lime products
• Plaster and mortar
• Oven cleaners
• Drain cleaners
• Dishwasher powders
• Fertilizers
• Sparkler sparks

**Why Alkali Burns Are Serious**
• Can penetrate and damage deeper tissue layers
• Cause serious damage in very short time
• Damage depends on type, strength, and contact duration

**Immediate Action**
⚠️ Call Poison Control Centre: 1-844-POISON-X (1-844-764-7669)
• Have the chemical container ready
• Read the contents label to staff
• Get specific treatment instructions

**Chemical Burns Rinsed with Water**

**Standard Treatment:**
• Immediately rinse with large amount of cool water
• Rinsing within 1 minute reduces complication risk
• Flush the area for at least 20 minutes
• Do NOT use hard spray (can damage tissue)
• Have person remove chemical if able
• Put on gloves before helping
• Remove contaminated clothing and jewelry while flushing
• If burning sensation continues, flush 10-15 more minutes

**Chemical Burns NOT Rinsed with Water**

**Dry Powders (such as dry lime)**
• Brush away powder first
• Adding water to powder can create burning liquid
• After brushing away, flush with water for 20 minutes

**Metal Compounds**
• Cover with mineral oil
• Do not rinse with water

**Chemical Burns to the Eye**
⚠️ IMMEDIATE ACTION REQUIRED
• Flush substance out with large amounts of water
• This is the most important first aid
• Reduces chance of serious eye damage
• Continue flushing while getting medical help

**Important Notes**
⚠️ Most chemical burns require water flushing
⚠️ Some chemicals need special treatment
⚠️ Always contact Poison Control for guidance
⚠️ Treat correctly to avoid further complications

**After Treatment**
• Seek immediate medical evaluation
• Take chemical container with you
• Monitor for signs of infection
• Follow up as directed
• Watch for delayed symptoms`,
      },
      {
        title: "Chili Pepper Burns",
        subtitle: "Education • 2-3 mins",
        icon: "local-dining",
        iconColor: "#EF4444",
        bgGradient: ['#EF4444', '#F87171'],
        category: 'burns-heat',
        importance: 'medium',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**What Are Chili Pepper Burns?**
Caused by an irritating substance found in the skin of chili peppers.

**Symptoms**
• Feels like a sunburn
• Throbbing and prickling sensation
• Very intense, hot pain
• Skin may be red and irritated
• Burning sensation can be severe

**Best Treatment**

**Step 1: Wash the Area**
• Use soap and water
• Wash thoroughly
• Remove as much pepper oil as possible

**Step 2: Apply Vegetable Oil**
• Put large amount of vegetable oil on affected area
• Leave oil on for at least 1 hour
• Oil helps dissolve the capsaicin (burning compound)

**For Hands:**
• Dip hands in vegetable oil
• Keep hands submerged for the full hour
• Can use a bowl or container

**Why Oil Works**
• Capsaicin is oil-soluble, not water-soluble
• Water alone won't remove the burning compound
• Oil dissolves and removes the irritant

**Additional Tips**
• Avoid touching face, especially eyes
• Wash hands multiple times after handling peppers
• Consider wearing gloves when handling hot peppers
• Keep affected area away from heat
• Don't use hot water (increases burning sensation)

**Prevention**
• Wear gloves when cutting hot peppers
• Wash hands immediately after handling peppers
• Don't touch face while handling peppers
• Use utensils instead of bare hands
• Be aware of pepper oils on surfaces

**When to Seek Medical Care**
• If burn is in or near eyes
• If swelling occurs
• If breathing becomes difficult
• If symptoms don't improve after treatment
• If skin shows signs of severe reaction

**What NOT To Do**
⚠️ Don't rinse with water only (won't remove oil)
⚠️ Don't apply ice directly
⚠️ Don't rub or scratch the area`,
      },
      {
        title: "First Aid for Chemical Burns",
        subtitle: "Emergency • 5-7 mins",
        icon: "medical-services",
        iconColor: "#DC2626",
        bgGradient: ['#DC2626', '#EF4444'],
        category: 'burns-heat',
        importance: 'critical',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**If Chemical Swallowed**
⚠️ Call Poison Control Centre immediately: 1-844-POISON-X (1-844-764-7669)
• Have chemical container ready
• Read content label to staff
• Get specific treatment instructions
• Chemical may cause burning in throat and esophagus

**Important Note**
Treat burns correctly to avoid further complications.

**Chemical Burns Rinsed with Water**

**If Powder or Dry Chemical Present:**
• Brush as much off as possible BEFORE flushing
• Use gloved hand or cloth
• Don't wet powder first

**Flushing Procedure:**
• Flush area for at least 20 minutes
• Put on gloves to protect yourself
• Have person remove chemical if able
• Use cool running water
• Do NOT use hard spray (damages burned area)
• Remove contaminated clothing and jewelry while flushing
• Continue removing items with chemical on them

**Extended Flushing:**
• If burning sensation continues after 20 minutes
• Flush area again for 10-15 more minutes
• Keep water flowing gently over affected area

**Special Case: Hydrofluoric Acid**
⚠️ REQUIRES IMMEDIATE MEDICAL CARE
• Flush with large amount of water
• Needs treatment with calcium gluconate
• Call 911 immediately

**Chemical Burns to the Eye**
⚠️ CRITICAL: Immediate flushing is essential
• Most important first aid step
• Flush substance out with large amounts of water
• Reduces chance of serious eye damage
• Continue flushing while getting help
• See Eye Injury section for detailed instructions
• Call Poison Control Centre for guidance

**After Flushing**
• Pat area dry gently
• Do not rub or apply pressure
• Cover with clean, dry cloth
• Seek medical evaluation if needed

**Going to the Doctor**
• Take chemical container with you
• Note time of exposure
• Describe first aid given
• List symptoms experienced

**Important Reminders**
⚠️ Time is critical - flush immediately
⚠️ Don't wait to call for help
⚠️ Continue flushing while waiting for emergency services
⚠️ Remove contaminated clothing carefully
⚠️ Protect yourself when helping others

**Prevention**
• Store chemicals safely
• Use proper protective equipment
• Read product labels
• Keep Poison Control number accessible
• Know location of emergency eyewash stations`,
      },
      {
        title: "Burns to the Eye",
        subtitle: "Emergency • 5-7 mins",
        icon: "visibility",
        iconColor: "#DC2626",
        bgGradient: ['#DC2626', '#EF4444'],
        category: 'burns-heat',
        importance: 'critical',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Common Eye Irritants**
Most substances that make eyes burn won't cause serious problems if flushed immediately.

**Mild Irritants:**
• Soaps
• Shampoos
• Perfumes
**Treatment:** Flush with water
**Recovery:** Slight pain and irritation should go away quickly

**Chemical Burns to the Eye**
Can happen from solids, liquids, or chemical fumes.

**Acid Substances:**
• Bleach
• Battery acid
• Can damage the eye

**Alkali Substances:**
• Oven cleansers
• Fertilizers
• Can damage the eye

**Important Note:**
• Many substances won't cause damage if flushed quickly
• May take 24 hours to determine severity
• Chemical fumes and vapors can also irritate eyes

**Heat Burns to the Eye**
Caused by hot air, steam, flames, or flash fires.

**Common Causes:**
• Blasts of hot air or steam
• Bursts of flames from stoves
• Flash fires from explosives
• Can burn face and eyes simultaneously

**Light Burns to the Eye**
High-intensity light can burn unprotected eyes.

**Sources:**
• Welder's equipment (torch or arc)
• Bright sunlight (especially reflected off snow or water)
• Tanning booth lights
• Sunlamps
• Can cause temporary blindness
• May take up to 24 hours to know severity

**Prevention:**
• Wear UV filtering sunglasses
• Use welding masks when welding
• Protect eyes near bright light sources

**Signs of Eye Infection**
After any eye burn, watch for:
• Pain in the eye
• Blurred vision
• Decreased vision
• Redness and swelling
• Discharge or pus
• Sensitivity to light

**When to Seek Immediate Care**
⚠️ Chemical exposure to eye
⚠️ Heat burn affecting eye or eyelid
⚠️ Exposure to high-intensity light
⚠️ Vision changes
⚠️ Severe pain
⚠️ Inability to open eye
⚠️ Signs of infection developing

**First Aid for Eye Burns**
• Flush immediately with large amounts of water
• Remove contact lenses if possible
• Continue flushing for at least 30 minutes
• Don't rub or apply pressure
• Wear dark glasses after flushing
• Do NOT bandage the eye
• Seek medical attention promptly`,
      },
      {
        title: "Second-Degree Burn Home Care",
        subtitle: "Education • 7-9 mins",
        icon: "local-hospital",
        iconColor: "#F59E0B",
        bgGradient: ['#F59E0B', '#FBBF24'],
        category: 'burns-heat',
        importance: 'high',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Home Treatment for Second-Degree Burns**
For many second-degree burns, home treatment is sufficient for healing and preventing complications.

**Step 1: Rinse the Burn**
• Rinse with cool water until pain stops
• Usually stops pain in 15-30 minutes
• Cool water lowers skin temperature
• Stops burn from becoming more serious

**Rinsing Methods:**
• Place limbs in basin of cool water
• Apply cool compresses to face or body burns
⚠️ Do NOT use ice or ice water (causes tissue damage)

**Immediate Actions:**
• Remove jewelry, rings, or tight clothing
• Do this before swelling occurs
• Items can become too tight as skin swells

**Step 2: Clean the Burn**
• Wash hands before cleaning burn
• Do NOT touch burn with dirty hands
• Open blisters can easily become infected
⚠️ Do NOT break blisters
• Gently wash with mild soap and water daily
• Some burned skin may come off during washing
• Pat area dry with clean cloth or gauze
⚠️ Do NOT use pain-relief skin sprays (traps heat)

**Step 3: Apply Ointment**
• Keep burn moist at all times
• Use petroleum jelly or antibiotic cream
• Options: Bacitracin or triple antibiotic ointment
• Apply to non-stick dressing first
• Place dressing ointment-side down on burn

**Important Note:**
• Using antibiotic cream longer than 1 week may cause rash
• Switch to petroleum jelly after a week
• Pre-coated gauze pads also available

**Step 4: Bandage the Burn**
• Use gauze or tape to keep dressing in place
• Wrap loosely to avoid pressure on burned skin
⚠️ Do NOT circle hand, arm, or leg with tape (causes swelling)
• Apply clean bandage when wet or soiled
• Helps prevent infection

**Removing Stuck Bandages:**
• Soak in warm water
• Makes removal easier and less painful

**Daily Care Routine**
• Wash burn daily with mild soap and water
• Continue until healed
• Some dressings shouldn't be changed daily
• Follow package instructions

**Pain Management**
• Take over-the-counter pain medicine as needed:
  - Acetaminophen (Tylenol)
  - Ibuprofen (Advil, Motrin)
  - Naproxen (Aleve)
• Read and follow label instructions
⚠️ Do NOT use aspirin (can worsen bleeding)

**Reduce Swelling**
• If burn is on leg or arm
• Keep limb raised for first 24-48 hours
• Elevate above heart level when possible

**Maintain Movement**
• Move burned limb normally
• Prevents skin from healing too tightly
• Tight healing can limit movement
• Gentle exercise promotes proper healing

**Available Products**
• Many non-prescription burn dressings available
• Follow package instructions carefully
• Ask pharmacist for recommendations

**When to See a Doctor**
⚠️ Burn shows signs of infection
⚠️ Pain increases significantly
⚠️ Burn doesn't improve with home treatment
⚠️ Blisters are very large
⚠️ Burn is on face, hands, feet, genitals, or major joint`,
      },
      {
        title: "Eye Injury: Chemical Burns",
        subtitle: "Emergency • 4-6 mins",
        icon: "remove-red-eye",
        iconColor: "#DC2626",
        bgGradient: ['#DC2626', '#EF4444'],
        category: 'burns-heat',
        importance: 'critical',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Chemical Burns to the Eye**
Can be caused by alkaline, acid, metals, or hydrocarbons (such as gas).

**Immediate Action**

**If Wearing Contacts:**
• Remove contacts before flushing
• If can't remove, flush with contact in place
• Don't delay flushing to remove contacts

**Workplace Safety:**
• Many workplaces have eye wash stations
• Know where they are located
• Know how to use them properly

**Step 1: Flush the Eye Immediately**
⚠️ This is the MOST IMPORTANT step
• Flush with large amount of water right away
• Quickly diluting chemical reduces eye damage risk
• This is the first thing a doctor would do

**Flushing Methods:**

**Sink or Dishpan Method:**
• Fill with water
• Put face in water
• Open and close eyelids repeatedly
• Forces water to all parts of eye

**Running Water Method:**
• Use faucet, kitchen sink sprayer, or shower
• Flush gently with running water
• May need to open and close eyelids with fingers
• Move eye in all directions during flushing
• Ensures all areas are rinsed

**Step 2: Call Poison Control**
• Phone: 1-844-POISON-X or 1-844-764-7669
• Call while continuing to flush
• Get specific treatment information
• Have chemical container ready
• Read content label to staff

**Step 3: Continue Flushing**
• Flush for 30 minutes minimum
• OR until eye stops hurting
• Whichever takes longer
• Pull lower and upper eyelids forward
• Ensures chemical caught in eyelids is rinsed away

**Step 4: If Severe Pain Continues**
• Call 911 or emergency services
• Keep flushing until help arrives
• Don't stop flushing

**After Flushing**
• Wear dark glasses
• Protects from light sensitivity
⚠️ Do NOT bandage eye
⚠️ Do NOT put pressure on eye
• Keeping eye closed may reduce pain

**Important Reminders**
⚠️ Flush immediately - don't delay
⚠️ Time is critical for preventing damage
⚠️ Use large amounts of water
⚠️ Flush thoroughly and completely
⚠️ Seek medical attention after flushing

**After Care**
• See eye doctor or emergency room
• Bring chemical container with you
• Describe what happened
• Note how long chemical was in contact
• List all first aid given

**Prevention**
• Wear safety goggles when using chemicals
• Read labels before using products
• Know location of emergency eyewash stations
• Keep Poison Control number accessible
• Store chemicals safely and properly`,
      },
      {
        title: "Major Burns: Care Instructions",
        subtitle: "Education • 10-12 mins",
        icon: "local-hospital",
        iconColor: "#DC2626",
        bgGradient: ['#DC2626', '#EF4444'],
        category: 'burns-heat',
        importance: 'critical',
        readTime: 'By Rural Alberta Health Connect Team',
        content: `**Understanding Major Burns**
Burns injure skin and can affect muscles, nerves, lungs, and eyes.

**What to Expect**
• Burns may become infected easily
• Pain may worsen in first few weeks
• Skin color, texture, and feel will change
• New skin and scar tissue will form
• Burned area may feel tight and hard while healing
• Important to continue moving area during healing
• Prevents loss of motion and function

**Healing Timeline**
• Complete healing: Few months to up to a year
• Recovery can be painful and challenging
• Follow all care instructions carefully

**Home Care Instructions**

**Follow Doctor's Orders**
• Follow all instructions carefully
• May need special bandages
• May require compression garment for deep burns
• Attend all follow-up appointments

**Keep Burn Clean and Dry**
• Wash burn daily with mild soap and water
• Gently pat dry after washing and rinsing
• Don't rub or scrub

**Protect Your Burn**
When going out in cold or sun:

**For Hands or Arms:**
• Wear long sleeves
• Protect from sun and cold exposure

**For Face:**
• Wear a hat
• Use sun protection

**For Feet:**
• Wear shoes and socks
• Protect from injury

**Medications**

**If Prescribed Antibiotics:**
• Take as directed
⚠️ Complete full course even if feeling better
• Prevents infection complications

**Pain Management:**
• Take over-the-counter pain medicine as needed:
  - Acetaminophen (Tylenol)
  - Ibuprofen (Advil, Motrin)
  - Naproxen (Aleve)
• Read and follow label instructions
⚠️ Do NOT use aspirin (worsens bleeding)
⚠️ Don't take two pain medicines at once unless directed
⚠️ Many contain acetaminophen - too much can be harmful

**Managing Itching**
⚠️ Do NOT scratch your burn
• Talk to doctor about itch relief options
• May recommend specific creams or lotions

**Hydration and Nutrition**

**Drink Plenty of Fluids:**
• Important for healing
• If you have kidney, heart, or liver disease
• Talk to doctor before increasing fluids

**Eat Healthy Diet:**
• Ensure enough calories
• Get adequate protein for healing
• Ask doctor about extra vitamins
• May need natural health products

**Lifestyle Factors**

**Do NOT Smoke:**
• Smoking slows healing
• Delays tissue repair
• If you need help quitting:
  - Talk to doctor
  - Ask about stop-smoking programs
  - Discuss medications
  - Increases chances of quitting successfully

**When to Call for Help**

⚠️ Call Doctor or Nurse Advice Line (811) NOW if:

**Signs of Infection:**
• Increased pain, swelling, warmth, or redness
• Red streaks leading from burn
• Pus draining from burn
• Fever

**Movement Problems:**
• Cannot move burned area
• Area feels numb
• Loss of sensation

**Follow-Up Care**
• Make and attend all appointments
• Call if having problems
• Know your test results
• Keep list of medicines you take
• Follow-up care is key to treatment and safety

**Contact Doctor If:**
• Not getting better as expected
• New symptoms develop
• Concerns about healing process

**Emergency Contact**
• Health Link: 811 (24/7 nurse advice)
• Emergency: 911
• Have medical information ready when calling`,
      },
    ];

    // Insert all resources
    const insertedIds = [];
    for (const resource of resources) {
      const id = await ctx.db.insert("resources", {
        ...resource,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      insertedIds.push(id);
    }

    return {
      success: true,
      message: `Successfully seeded ${insertedIds.length} resources`,
      count: insertedIds.length,
      resourceIds: insertedIds,
    };
  },
});
