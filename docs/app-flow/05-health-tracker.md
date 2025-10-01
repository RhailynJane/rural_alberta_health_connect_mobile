# Health Tracker Documentation

## Overview
The Health Tracker module allows users to log, monitor, and analyze their health symptoms and wellness data over time. This system is designed specifically for rural healthcare contexts where users may need to track symptoms between medical appointments.

## Module Structure

```
tracker/
├── index.tsx              # Main tracker dashboard
├── add-health-entry.tsx   # Entry creation form
├── daily-log.tsx          # Today's entries view
└── history.tsx            # Historical data and trends
```

---

## 1. Main Tracker Dashboard (`/tracker`)

### Purpose
Central hub providing overview of tracking functionality with navigation to key features.

### Frontend Implementation
```tsx
// app/tracker/index.tsx
export default function Tracker() {
  const handleAddLogEntry = () => {
    router.push("/tracker/add-health-entry");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader title="Health Tracker" height={120} showLogo={true} />
        
        {/* Medical Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text>Medical Disclaimer</Text>
          <Text>This tracker is for personal monitoring only.</Text>
        </View>
        
        {/* Navigation Cards */}
        <TouchableOpacity onPress={navigateToDailyLog}>
          <Text>Daily Log</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={navigateToHistory}>
          <Text>History</Text>
        </TouchableOpacity>
      </CurvedBackground>
    </SafeAreaView>
  );
}
```

### Features
- **Medical Disclaimer**: Prominent warning about app limitations
- **Navigation Cards**: Quick access to Daily Log and History
- **Floating Add Button**: Primary action for creating new entries
- **Consistent Layout**: Uses CurvedHeader and BottomNavigation

### UI Components
| Component | Purpose | Style Notes |
|-----------|---------|-------------|
| Disclaimer Box | Legal compliance | Yellow background `#FFF3CD`, amber border |
| Navigation Cards | Feature access | Light gray `#F8F9FA`, blue title text |
| Add Button | Entry creation | Green `#28A745`, fixed position |

---

## 2. Add Health Entry Form (`/tracker/add-health-entry`)

### Purpose
Comprehensive form for logging health symptoms, severity, and contextual information.

### Form Fields

#### Date & Time Selection
```tsx
// Date picker implementation
<TouchableOpacity onPress={() => setShowDatePicker(true)}>
  <Text>{formatDate(selectedDate)}</Text>
</TouchableOpacity>

{showDatePicker && (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    display={Platform.OS === "ios" ? "spinner" : "default"}
    onChange={handleDateChange}
    maximumDate={new Date()} // Prevent future dates
  />
)}
```

#### Form Structure
| Field | Type | Validation | Purpose |
|-------|------|------------|---------|
| `selectedDate` | Date | ≤ today | Entry date |
| `selectedTime` | Time | None | Entry time |
| `symptoms` | Text (multiline) | None | Symptom description |
| `severity` | Dropdown (1-10) | Required | Pain/severity scale |
| `notes` | Text (multiline) | None | Additional context |

### Data Model
```typescript
interface HealthEntry {
  id: string;
  userId: string;
  date: string;        // YYYY-MM-DD format
  time: string;        // HH:MM AM/PM format
  symptoms: string;    // Free text description
  severity: string;    // "1" through "10"
  notes?: string;      // Optional additional details
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

### Form Validation
- **Date Validation**: Cannot select future dates
- **Required Fields**: Symptoms and severity must be provided
- **Severity Scale**: Dropdown with values 1-10 for consistency
- **Cross-Platform**: Different picker displays for iOS/Android

### Save Operation
```tsx
const handleSaveEntry = () => {
  const entry = {
    date: formatDate(selectedDate),
    time: formatTime(selectedTime),
    symptoms,
    severity,
    notes,
  };
  
  // API call to save entry
  console.log("Saving entry:", entry);
  router.back();
};
```

---

## 3. Daily Log View (`/tracker/daily-log`)

### Purpose
Display all health entries for the current day with quick access to add new entries.

### Current Implementation
```tsx
export default function DailyLog() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader title="Health Tracker" height={120} showLogo={true} />
        
        <View style={styles.contentSection}>
          <Text>Daily Log</Text>
          
          <View style={styles.entriesContainer}>
            <Text>No entries for today</Text>
          </View>
        </View>
        
        {/* Add Entry Button */}
        <TouchableOpacity onPress={handleAddLogEntry}>
          <Text>Add Log Entry</Text>
        </TouchableOpacity>
      </CurvedBackground>
    </SafeAreaView>
  );
}
```

### Expected Data Structure
```typescript
interface DailyLogData {
  date: string;           // YYYY-MM-DD
  entries: HealthEntry[]; // Array of today's entries
  summary: {
    totalEntries: number;
    averageSeverity: number;
    mostCommonSymptoms: string[];
  };
}
```

### Backend Integration Points
- **GET `/api/entries/daily?date=YYYY-MM-DD`**: Fetch today's entries
- **Real-time Updates**: Consider WebSocket updates for new entries
- **Timezone Handling**: Server should respect user's timezone

---

## 4. History & Analytics (`/tracker/history`)

### Purpose
Comprehensive view of historical health data with filtering, trends, and analytics.

### Key Features

#### Date Range Selection
```tsx
// Quick range buttons
const handleRangeSelection = (range: "today" | "7d" | "30d" | "custom") => {
  setSelectedRange(range);
  const today = new Date();
  
  switch (range) {
    case "today":
      setStartDate(today);
      setEndDate(today);
      break;
    case "7d":
      setStartDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
      setEndDate(today);
      break;
    // ... other cases
  }
};
```

#### Health Statistics
```tsx
// Sample stats display
<View style={styles.statsContainer}>
  <View style={styles.statItem}>
    <Ionicons name="stats-chart" size={24} color="#2A7DE1" />
    <Text>8.5/10</Text>
    <Text>Health Score</Text>
  </View>
  <View style={styles.statItem}>
    <Text>{filteredEntries.length}</Text>
    <Text>Total Entries</Text>
  </View>
</View>
```

#### Entry List with Severity Indicators
```tsx
// Entry rendering with color-coded severity
{filteredEntries.map((entry) => (
  <View key={entry.id} style={styles.entryItem}>
    <View style={[
      styles.severityBadge,
      entry.severity === "Mild" && { backgroundColor: "#E8F5E8" },
      entry.severity === "Moderate" && { backgroundColor: "#FFF3CD" },
      entry.severity === "Severe" && { backgroundColor: "#F8D7DA" },
    ]}>
      <Text>{entry.severity}</Text>
    </View>
    <Text>{entry.description}</Text>
  </View>
))}
```

### Sample Data Structure
```typescript
interface HistoryData {
  entries: HealthEntry[];
  analytics: {
    healthScore: number;        // 0-10 calculated score
    totalEntries: number;
    dateRange: {
      start: string;
      end: string;
    };
    trends: {
      symptomFrequency: {
        symptom: string;
        count: number;
        changePercent: number;  // vs previous period
      }[];
      severityTrend: "improving" | "stable" | "worsening";
      averageSeverity: number;
    };
  };
}
```

---

## Backend Database Schema (Convex)

### Health Entries Table
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  healthEntries: defineTable({
    userId: v.id("users"),
    date: v.string(),           // YYYY-MM-DD
    time: v.string(),           // HH:MM AM/PM  
    symptoms: v.string(),
    severity: v.number(),       // 1-10 as number for calculations
    notes: v.optional(v.string()),
    createdAt: v.number(),      // Unix timestamp
    updatedAt: v.number(),      // Unix timestamp
  })
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"])
  .index("by_user_date_range", ["userId", "createdAt"]),
  
  users: defineTable({
    email: v.string(),
    name: v.string(),
    timezone: v.optional(v.string()), // For date handling
  })
  .index("by_email", ["email"]),
});
```

### API Functions (Convex)

#### Create Health Entry
```typescript
// convex/healthEntries.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createEntry = mutation({
  args: {
    date: v.string(),
    time: v.string(),
    symptoms: v.string(),
    severity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const now = Date.now();
    
    return await ctx.db.insert("healthEntries", {
      userId: user._id,
      date: args.date,
      time: args.time,
      symptoms: args.symptoms,
      severity: args.severity,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

#### Get Daily Entries
```typescript
export const getDailyEntries = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) return [];
    
    return await ctx.db
      .query("healthEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", args.date))
      .order("desc")
      .collect();
  },
});
```

#### Get Entries by Date Range
```typescript
export const getEntriesByRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) return [];
    
    // Convert dates to timestamps for range query
    const startTimestamp = new Date(args.startDate).getTime();
    const endTimestamp = new Date(args.endDate + " 23:59:59").getTime();
    
    return await ctx.db
      .query("healthEntries")
      .withIndex("by_user_date_range", (q) => 
        q.eq("userId", user._id)
         .gte("createdAt", startTimestamp)
         .lte("createdAt", endTimestamp)
      )
      .order("desc")
      .collect();
  },
});
```

#### Calculate Health Analytics
```typescript
export const getHealthAnalytics = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await getEntriesByRange(ctx, args);
    
    if (entries.length === 0) {
      return {
        healthScore: 0,
        totalEntries: 0,
        averageSeverity: 0,
        trends: {
          symptomFrequency: [],
          severityTrend: "stable" as const,
        },
      };
    }
    
    // Calculate average severity
    const totalSeverity = entries.reduce((sum, entry) => sum + entry.severity, 0);
    const averageSeverity = totalSeverity / entries.length;
    
    // Calculate health score (inverse of severity, normalized to 10)
    const healthScore = Math.round((10 - averageSeverity) * 10) / 10;
    
    // Analyze symptom frequency
    const symptomCounts = new Map<string, number>();
    entries.forEach(entry => {
      const symptoms = entry.symptoms.toLowerCase().split(/[,;]/).map(s => s.trim());
      symptoms.forEach(symptom => {
        if (symptom.length > 2) { // Filter out short words
          symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
        }
      });
    });
    
    const symptomFrequency = Array.from(symptomCounts.entries())
      .map(([symptom, count]) => ({ symptom, count, changePercent: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 symptoms
    
    return {
      healthScore,
      totalEntries: entries.length,
      averageSeverity,
      trends: {
        symptomFrequency,
        severityTrend: "stable" as const, // Would need historical comparison
      },
    };
  },
});
```

---

## Frontend Integration with Convex

### Setup Convex Queries
```tsx
// app/tracker/daily-log.tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function DailyLog() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const entries = useQuery(api.healthEntries.getDailyEntries, { date: today });
  
  if (entries === undefined) return <Text>Loading...</Text>;
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader title="Daily Log" height={120} showLogo={true} />
        
        <View style={styles.entriesContainer}>
          {entries.length === 0 ? (
            <Text>No entries for today</Text>
          ) : (
            entries.map(entry => (
              <HealthEntryItem key={entry._id} entry={entry} />
            ))
          )}
        </View>
      </CurvedBackground>
    </SafeAreaView>
  );
}
```

### Create Entry with Mutation
```tsx
// app/tracker/add-health-entry.tsx
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AddHealthEntry() {
  const createEntry = useMutation(api.healthEntries.createEntry);
  
  const handleSaveEntry = async () => {
    try {
      await createEntry({
        date: formatDate(selectedDate),
        time: formatTime(selectedTime),
        symptoms,
        severity: parseInt(severity),
        notes: notes || undefined,
      });
      
      router.back();
    } catch (error) {
      console.error("Failed to save entry:", error);
      Alert.alert("Error", "Failed to save health entry");
    }
  };
  
  // ... rest of component
}
```

---

## Medical & Legal Considerations

### Medical Disclaimer Implementation
```tsx
// Consistent disclaimer across all tracker screens
const MedicalDisclaimer = () => (
  <View style={styles.disclaimerContainer}>
    <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
    <Text style={styles.disclaimerText}>
      This tracker is for personal monitoring only.
    </Text>
    <Text style={styles.disclaimerText}>
      Seek immediate medical attention for severe symptoms or emergencies.
    </Text>
  </View>
);
```

### Data Privacy Considerations
- **Local Storage**: Consider offline-first approach for sensitive health data
- **Encryption**: Encrypt health entries at rest and in transit
- **Data Retention**: Implement user-controlled data deletion
- **HIPAA Considerations**: While not a covered entity, follow privacy best practices

### Emergency Indicators
- **High Severity Alerts**: Consider warnings for severity 8+ entries
- **Symptom Pattern Recognition**: Alert for concerning symptom combinations
- **Emergency Contact Integration**: Link to emergency module for severe symptoms

---


This health tracker system provides a comprehensive foundation for personal health monitoring while maintaining medical compliance and user privacy standards appropriate for rural healthcare contexts.