import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import BottomNavigation from "../components/bottomNavigation";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { useSideMenu } from "../components/SideMenuProvider";
import { FONTS } from "../constants/constants";

type CategoryType = 'all' | 'emergency' | 'injuries' | 'conditions' | 'prevention';

interface ResourceItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  bgGradient: readonly [string, string];
  category: CategoryType;
  importance: 'critical' | 'high' | 'medium';
  readTime: string;
  content: string;
}

export default function Resources() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { open } = useSideMenu();

  const categories = [
    { id: 'all' as CategoryType, label: 'All', iconSource: require('../../assets/images/resources-icon.png'), color: '#6366F1' },
    { id: 'emergency' as CategoryType, label: 'Emergency', iconSource: require('../../assets/images/emergency-icon.png'), color: '#DC2626' },
    { id: 'injuries' as CategoryType, label: 'Injuries', iconSource: require('../../assets/images/tracker-icon.png'), color: '#EA580C' },
    { id: 'conditions' as CategoryType, label: 'Conditions', iconSource: require('../../assets/images/assess-icon.png'), color: '#059669' },
    { id: 'prevention' as CategoryType, label: 'Prevention', iconSource: require('../../assets/images/home-icon.png'), color: '#0891B2' },
  ];

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  const resources: ResourceItem[] = [
    {
      id: "burns",
      title: "Burns & Fire Safety",
      subtitle: "Emergency • 5-8 mins",
      icon: "local-fire-department",
      iconColor: "#FF6B35",
      bgGradient: ['#FF6B35', '#FF8F5C'] as const,
      category: 'injuries',
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
      id: "trauma",
      title: "Trauma & Injuries",
      subtitle: "Emergency • 6-10 mins",
      icon: "healing",
      iconColor: "#E63946",
      bgGradient: ['#E63946', '#EF5A6F'],
      category: 'injuries',
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
      id: "infections",
      title: "Infections & Wound Care",
      subtitle: "Education • 4-6 mins",
      icon: "coronavirus",
      iconColor: "#F77F00",
      bgGradient: ['#F77F00', '#FB9131'] as const,
      category: 'conditions',
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
      id: "skin-rash",
      title: "Skin Conditions & Rashes",
      subtitle: "Education • 4-6 mins",
      icon: "spa",
      iconColor: "#06A77D",
      bgGradient: ['#06A77D', '#10B981'],
      category: 'conditions',
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
      id: "cold-frostbite",
      title: "Cold Weather Injuries",
      subtitle: "Prevention • 5-7 mins",
      icon: "ac-unit",
      iconColor: "#118AB2",
      bgGradient: ['#118AB2', '#0EA5E9'] as const,
      category: 'prevention',
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
      id: "first-aid",
      title: "Essential First Aid",
      subtitle: "Emergency • 8-10 mins",
      icon: "medical-services",
      iconColor: "#DC2626",
      bgGradient: ['#DC2626', '#EF4444'] as const,
      category: 'emergency',
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
  ];

  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter(r => r.category === selectedCategory);

  if (selectedResource) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.detailContainer}>
          {/* Hero Image Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={selectedResource.bgGradient}
              style={styles.heroGradient}
            >
              <View style={styles.heroTopBar}>
                <TouchableOpacity 
                  style={styles.heroButton}
                  onPress={() => setSelectedResource(null)}
                >
                  <Icon name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.heroButton}
                  onPress={() => toggleFavorite(selectedResource.id)}
                >
                  <Icon 
                    name={favorites.has(selectedResource.id) ? "favorite" : "favorite-border"} 
                    size={24} 
                    color="#FFF" 
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.heroIconContainer}>
                <Icon name={selectedResource.icon} size={120} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </View>

          {/* Content Card */}
          <View style={styles.detailContentWrapper}>
            <ScrollView 
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentSection}>
                <Text style={[styles.detailTitle, { fontFamily: FONTS.BarlowSemiCondensedBold }]}>
                  {selectedResource.title}
                </Text>
                <Text style={[styles.detailSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {selectedResource.subtitle}
                </Text>
                
                <View style={styles.metaRow}>
                  <View style={[styles.metaBadge, { backgroundColor: '#F0F9FF' }]}>
                    <Icon name="schedule" size={14} color="#0284C7" />
                    <Text style={[styles.metaText, { fontFamily: FONTS.BarlowSemiCondensed, color: '#0284C7' }]}>
                      {selectedResource.readTime}
                    </Text>
                  </View>
                  <View style={[styles.metaBadge, { backgroundColor: selectedResource.importance === 'critical' ? '#FEE2E2' : selectedResource.importance === 'high' ? '#FEF3C7' : '#E0F2FE' }]}>
                    <Icon name="priority-high" size={14} color={selectedResource.importance === 'critical' ? '#DC2626' : selectedResource.importance === 'high' ? '#F59E0B' : '#0284C7'} />
                    <Text style={[styles.metaText, { fontFamily: FONTS.BarlowSemiCondensed, color: selectedResource.importance === 'critical' ? '#DC2626' : selectedResource.importance === 'high' ? '#F59E0B' : '#0284C7' }]}>
                      {selectedResource.importance.charAt(0).toUpperCase() + selectedResource.importance.slice(1)}
                    </Text>
                  </View>
                </View>
                {selectedResource.content.split('\n').map((line, index) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <Text key={index} style={[styles.contentBold, { fontFamily: FONTS.BarlowSemiCondensedBold }]}>
                        {line.replace(/\*\*/g, '')}
                      </Text>
                    );
                  } else if (line.startsWith('⚠️')) {
                    return (
                      <View key={index} style={styles.warningBox}>
                        <Icon name="warning" size={20} color="#DC2626" />
                        <Text style={[styles.contentWarning, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          {line.replace('⚠️', '').trim()}
                        </Text>
                      </View>
                    );
                  } else if (line.startsWith('•') || line.startsWith('□')) {
                    return (
                      <Text key={index} style={[styles.contentBullet, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {line}
                      </Text>
                    );
                  } else if (line.trim() === '') {
                    return <View key={index} style={{ height: 8 }} />;
                  } else {
                    return (
                      <Text key={index} style={[styles.contentText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {line}
                      </Text>
                    );
                  }
                })}

                <View style={styles.infoFooter}>
                  <Icon name="info-outline" size={18} color="#0284C7" />
                  <Text style={[styles.infoFooterText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Always consult healthcare professionals for proper diagnosis and treatment
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <CurvedBackground style={{ flex: 1 }}>
        <CurvedHeader
          title="Health Library"
          onMenuPress={open}
          backgroundColor="transparent"
          textColor="#1A1A1A"
          showLogo
          showNotificationBell
        />
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Categories Section */}
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesHeader}>
              <Text style={[styles.categoriesTitle, { fontFamily: FONTS.BarlowSemiCondensedBold }]}>Categories</Text>
              <TouchableOpacity onPress={() => setSelectedCategory('all')}>
                <Text style={[styles.viewAllText, { fontFamily: FONTS.BarlowSemiCondensed }]}>All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => setSelectedCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIconContainer, { backgroundColor: category.color }]}>
                    <Image 
                      source={category.iconSource} 
                      style={styles.categoryIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.categoryCardLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* All Resources Section */}
          <View style={styles.allResourcesSection}>
            <Text style={[styles.allResourcesTitle, { fontFamily: FONTS.BarlowSemiCondensedBold }]}>All Resources</Text>
          </View>

          {/* Resources List */}
          {filteredResources.map((resource) => (
            <TouchableOpacity
              key={resource.id}
              style={styles.resourceCard}
              onPress={() => setSelectedResource(resource)}
              activeOpacity={0.7}
            >
              <View style={[styles.resourceIconCircle, { backgroundColor: resource.iconColor + '20' }]}>
                <Icon name={resource.icon} size={28} color={resource.iconColor} />
              </View>
              <View style={styles.resourceContent}>
                <Text style={[styles.resourceTitle, { fontFamily: FONTS.BarlowSemiCondensedBold }]}>
                  {resource.title}
                </Text>
                <Text style={[styles.resourceSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {resource.subtitle}
                </Text>
                <Text style={[styles.resourceAuthor, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {resource.readTime}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <BottomNavigation />
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  greeting: {
    fontSize: 26,
    color: '#1A1A1A',
  },
  subGreeting: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoriesSection: {
    paddingVertical: 12,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoriesTitle: {
    fontSize: 18,
    color: '#1A1A1A',
  },
  viewAllText: {
    fontSize: 14,
    color: '#10B981',
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    tintColor: '#FFF',
  },
  categoryCardLabel: {
    fontSize: 13,
    color: '#333',
  },
  allResourcesSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  allResourcesTitle: {
    fontSize: 18,
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  resourceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceContent: {
    flex: 1,
    gap: 4,
  },
  resourceTitle: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  resourceSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  resourceAuthor: {
    fontSize: 12,
    color: '#999',
  },
  featuredCard: {
    height: 180,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  featuredCardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  featuredIconLarge: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  featuredCardContent: {
    gap: 6,
  },
  featuredCardTitle: {
    fontSize: 22,
    color: '#FFF',
  },
  featuredCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  readTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  readTimeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  smallCard: {
    width: 160,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  smallCardGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  smallFavoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCardIcon: {
    alignItems: 'center',
  },
  smallCardTitle: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 20,
  },
  smallReadTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallReadTimeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCardContent: {
    flex: 1,
    gap: 4,
  },
  listCardTitle: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  listCardSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  listCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  listReadTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listReadTimeText: {
    fontSize: 12,
    color: '#999',
  },
  listFavoriteButton: {
    padding: 8,
  },
  emergencyFooter: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  emergencyTextContainer: {
    flex: 1,
    gap: 4,
  },
  emergencyFooterTitle: {
    fontSize: 17,
    color: '#FFF',
  },
  emergencyFooterText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 18,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  heroSection: {
    height: 300,
  },
  heroGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContentWrapper: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 24,
    paddingBottom: 32,
    flex: 1,
  },
  detailScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contentSection: {
    gap: 12,
  },
  detailTitle: {
    fontSize: 26,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  detailSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 13,
  },
  contentText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
  contentBold: {
    fontSize: 17,
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    alignItems: 'flex-start',
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  contentWarning: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  contentBullet: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    paddingLeft: 12,
  },
  infoFooter: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  infoFooterText: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },
});
