# ExecuTorch Implementation Plan

## What This Adds

On-device AI models for chat and vision capabilities.

## Required Packages

- `react-native-executorch`
- `expo-dev-client`

## Setup Requirements

### Metro Configuration

Create `metro.config.js` to handle AI model files:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("pte", "bin");
module.exports = config;
```

### Development Client

Must build custom development client (cannot use Expo Go).

## Implementation Examples

### Chat Assistant

```typescript
import { useLLM, LLAMA3_2_1B_QLORA } from "react-native-executorch";

const llm = useLLM({
  model: LLAMA3_2_1B_QLORA,
  systemPrompt:
    "You are a healthcare assistant providing general health information.",
});

// Send message
await llm.generate([{ role: "user", content: "I have a headache" }]);

// Get response
console.log(llm.response);
```

### Vision Model

```typescript
import {
  useVisionModel,
  MOBILEVITVIT_IMAGENET1K,
} from "react-native-executorch";

const vision = useVisionModel({
  model: MOBILEVITVIT_IMAGENET1K,
});

// Analyze image
const result = await vision.classify(imageUri);
console.log(result.predictions);
```

## Testing & Deployment

### EAS Build Configuration

- Configure for custom native modules
- Test release builds on real devices only
- iOS simulator release builds not supported
