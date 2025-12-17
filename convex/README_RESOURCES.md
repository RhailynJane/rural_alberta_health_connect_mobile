# Health Resources Management

This document explains how to manage health resources/articles in the Convex database.

## Overview

Health resources are now stored in Convex instead of being hardcoded in the component. This provides:
- ✅ Easy content updates without app deployment
- ✅ Dynamic content management
- ✅ Scalability for adding new articles
- ✅ Ability to update content from admin panel

## Database Schema

Resources table includes:
- `title`: Article title
- `subtitle`: Short description with reading time
- `icon`: Material Icon name
- `iconColor`: Hex color for the icon
- `bgGradient`: Array of 2 gradient colors
- `category`: Category slug (burns-heat, trauma-injuries, etc.)
- `importance`: critical | high | medium
- `readTime`: Author/source attribution
- `content`: Full article content in markdown-style format
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

## Available Categories

1. `burns-heat` - Burns & Heat
2. `trauma-injuries` - Trauma & Injuries
3. `infections` - Infections
4. `skin-rash` - Skin & Rash
5. `cold-frostbite` - Cold & Frostbite
6. `emergency-prevention` - Emergency & Prevention
7. `favorites` - User's favorited articles (filtered in app)

## Seeding Resources

### Method 1: Via Convex Dashboard (Recommended)

1. Copy all resource data from the original `app/resources/index.tsx` file
2. Format it as JSON array (remove TypeScript types)
3. Open Convex Dashboard: https://dashboard.convex.dev
4. Navigate to your project
5. Go to **Functions** tab
6. Find `resources:seedResources` mutation
7. Click **"Run Function"**
8. Paste the JSON in this format:

```json
{
  "resources": [
    {
      "title": "Burns & Fire Safety",
      "subtitle": "Emergency • 5-8 mins",
      "icon": "local-fire-department",
      "iconColor": "#FF6B35",
      "bgGradient": ["#FF6B35", "#FF8F5C"],
      "category": "burns-heat",
      "importance": "high",
      "readTime": "By Rural Alberta Health Connect Team",
      "content": "**First-Degree Burns...**"
    }
  ]
}
```

9. Click **"Run"**
10. Verify success message with count of inserted resources

### Method 2: Via Convex CLI

```bash
# Prepare your data in a JSON file
npx convex run resources:seedResources --args @seed-data.json
```

### Method 3: Programmatically (for large datasets)

Create a script that calls the mutation:

```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

await client.mutation(api.resources.seedResources, {
  resources: [ /* your data */ ]
});
```

## Managing Resources

### Query All Resources
```typescript
const resources = useQuery(api.resources.getAllResources);
```

### Query by Category
```typescript
const burnResources = useQuery(api.resources.getResourcesByCategory, {
  category: "burns-heat"
});
```

### Add Single Resource
```typescript
const addResource = useMutation(api.resources.addResource);

await addResource({
  title: "New Health Topic",
  subtitle: "Education • 5 mins",
  icon: "local-hospital",
  iconColor: "#10B981",
  bgGradient: ["#10B981", "#34D399"],
  category: "infections",
  importance: "medium",
  readTime: "By Health Team",
  content: "Full article content..."
});
```

### Update Resource
```typescript
const updateResource = useMutation(api.resources.updateResource);

await updateResource({
  id: resourceId,
  title: "Updated Title",
  content: "Updated content..."
});
```

### Delete Resource
```typescript
const deleteResource = useMutation(api.resources.deleteResource);

await deleteResource({ id: resourceId });
```

## Content Formatting Guide

### Section Headers
Use double asterisks:
```
**Section Title**
```

### Bullet Points
Use bullet or square characters:
```
• Point one
• Point two
```

### Warnings
Use warning emoji:
```
⚠️ Important warning message
```

### Paragraphs
Separate with blank lines for proper spacing.

## Migrating Existing Data

1. All 16 existing resources from the hardcoded array need to be copied
2. Remove the `id` field (Convex will generate `_id`)
3. Convert `bgGradient` from readonly tuple to regular array
4. Keep all content formatting intact
5. Run the seed mutation

## Testing

After seeding:
1. Open the app
2. Navigate to Resources/Health Library
3. Verify all articles load
4. Test filtering by categories
5. Test favorites functionality
6. Test article detail view

## Troubleshooting

**Resources not loading:**
- Check Convex dashboard for data
- Verify convex deployment is running
- Check browser console for errors

**Formatting issues:**
- Verify content uses proper markdown syntax
- Check for escaped characters
- Test with a single resource first

**Performance issues:**
- Resources are cached by Convex
- Consider pagination for 100+ articles
- Use category filtering for better UX
