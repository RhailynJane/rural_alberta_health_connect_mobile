# Code: Speech-to-Text Implementation

---

## 1. Voice Recognition Setup

```typescript
// app/components/SpeechToTextButton.tsx
import Voice from '@react-native-voice/voice';

Voice.onSpeechResults = (event) => {
  if (event.value && event.value.length > 0) {
    const spokenText = event.value[0];
    // Append to existing text
    const newText = currentText
      ? `${currentText} ${spokenText}`
      : spokenText;
    onTextReceived(newText);
  }
};
```

**What this does:**
- Captures speech results
- Appends to existing text (not replace)
- Sends to parent component

---

## 2. Start/Stop Listening

```typescript
const startListening = async () => {
  if (isListening) {
    await Voice.stop();
    setIsListening(false);
    return;
  }

  await Voice.start('en-US');
};
```

**What this does:**
- Toggles listening on/off with single button
- Uses English (US) language model
- Simple, intuitive UX

---

## 3. Visual Feedback

```typescript
<TouchableOpacity onPress={startListening}>
  <Ionicons
    name={isListening ? 'mic' : 'mic-outline'}
    color={isListening ? '#DC3545' : COLORS.primary}
  />
  <Text>
    {isListening
      ? 'Listening... Tap to stop'
      : 'Tap microphone to speak'
    }
  </Text>
</TouchableOpacity>
```

**What this does:**
- Icon changes color when listening (red)
- Text updates to show status
- User always knows what's happening

---

## Usage in Any Screen

```typescript
<SpeechToTextButton
  onTextReceived={(text) => setSymptoms(text)}
  currentText={symptoms}
  placeholder="Tap microphone to speak"
/>
```

**That's it!** Reusable component works anywhere.

