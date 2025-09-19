# Symptom Assessment Flow - Complete Documentation

## Overview

The Symptom Assessment Flow is a multi-step process that guides users through evaluating their health symptoms, providing AI-powered recommendations, and connecting them with appropriate healthcare resources.

## Flow Architecture

### Assessment Sequence
1. **Dashboard** → Entry point with "Start Symptom Assessment" button
2. **Symptom Severity** → Rate discomfort level (1-10 scale)
3. **Symptom Duration** → Select when symptoms started
4. **Assessment Results** → AI-generated recommendations and emergency guidance

## Frontend Components

### 1. Dashboard (`app/dashboard.tsx`)
**Purpose**: Main entry point with symptom assessment initiation
**Key Features**:
- User welcome with personalized greeting
- Health status indicator
- Emergency contact options (911/811)
- Assessment initiation button

### 2. Symptom Severity (`app/ai-assess/symptom-severity.tsx`)
**Purpose**: Collect symptom intensity rating
**Features**:
- 10-point visual scale (1-10)
- Interactive touch points
- Severity classification (Mild/Moderate/Severe)
- Navigation controls

### 3. Symptom Duration (`app/ai-assess/symptom-duration.tsx`)
**Purpose**: Determine symptom timeline
**Features**:
- Multiple choice options
- Radio button selection
- Timeline-based categories
- Validation for required selection

### 4. Assessment Results (`app/ai-assess/assessment-results.tsx`)
**Purpose**: Display AI-generated health assessment
**Features**:
- Contextual symptom analysis
- Recommended actions
- Rural Alberta considerations
- Emergency indicators
- Call-to-action buttons

## Enhanced Backend Requirements

### Updated Database Schema

#### Assessments Collection (Enhanced)
```javascript
{
  _id: Id("assessments"),
  userId: Id<"users">,
  symptoms: {
    category: string,
    description: string,
    severity: number, // 1-10
    duration: string, // "today", "yesterday", etc.
    timestamp: number,
    // Image analysis data
    imageAnalysis: {
      hasImage: boolean,
      imageUrl: string, // Stored image reference
      detectedObjects: Array<{
        label: string,
        confidence: number,
        boundingBox: {x: number, y: number, width: number, height: number},
        symptomRelevance: number
      }>,
      analysisTimestamp: number
    }
  },
  assessment: {
    context: string,
    recommendations: string[],
    urgency: string, // "routine", "urgent", "emergency"
    generatedAt: number,
    visualConfirmation: boolean // Whether image supported assessment
  },
  // System fields
  createdAt: number,
  updatedAt: number
}
```

### Backend Functions for Image Processing

#### 1. Image Upload and Analysis Function
```javascript
// convex/image-analysis.ts
export const analyzeSymptomImage = mutation({
  args: {
    imageData: v.string(), // Base64 encoded image
    symptomContext: v.object({
      category: v.string(),
      description: v.string()
    })
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Process image with YOLO model
    const analysisResults = await processImageWithYOLO(args.imageData, args.symptomContext);
    
    // Store image in storage (implementation depends on storage solution)
    const imageUrl = await storeImage(args.imageData);
    
    return {
      imageUrl,
      analysis: analysisResults,
      timestamp: Date.now()
    };
  }
});
```

#### 2. YOLO Integration Function (Pseudocode)
```javascript
// Server-side YOLO processing
async function processImageWithYOLO(imageData, symptomContext) {
  try {
    // Load YOLO model (implementation depends on your framework)
    const model = await YOLO.load('./models/symptom-detection-weights');
    
    // Preprocess image
    const imageTensor = preprocessImage(imageData);
    
    // Run detection
    const predictions = await model.detect(imageTensor);
    
    // Filter and process results based on symptom context
    const relevantDetections = predictions.filter(pred => 
      isSymptomRelevant(pred.class, symptomContext)
    ).map(pred => ({
      label: pred.class,
      confidence: pred.score,
      boundingBox: pred.bbox,
      symptomRelevance: calculateSymptomRelevance(pred.class, symptomContext)
    }));
    
    return relevantDetections;
  } catch (error) {
    console.error("YOLO processing error:", error);
    return []; // Return empty array on error
  }
}
```

## YOLO Model Training Requirements

### Training Data Preparation

#### 1. Data Collection Strategy
- **Symptom-specific imagery**: Rash, swelling, discoloration, wounds, etc.
- **Diverse demographics**: Age, skin tones, lighting conditions
- **Multiple angles and severities**: Various presentations of each symptom
- **Ethical considerations**: Proper consent and anonymization

#### 2. Annotation Guidelines
```yaml
# YOLO annotation format for symptom detection
classes:
  - rash
  - swelling
  - bruising
  - cut
  - burn
  - blister
  - discoloration
  - deformity

annotation_rules:
  - Bounding boxes should tightly envisible symptoms
  - Include partial visibility cases
  - Multiple labels for complex presentations
  - Confidence scores for ambiguous cases
```

#### 3. Training Configuration
```python
# YOLO training configuration (YOLOv8 example)
model = YOLO('yolov8n.pt')  # Load pretrained model

# Training parameters
training_config = {
    'data': 'symptom_detection.yaml',
    'epochs': 100,
    'imgsz': 640,
    'batch': 16,
    'optimizer': 'auto',
    'lr0': 0.01,
    'lrf': 0.01,
    'weight_decay': 0.0005,
    'warmup_epochs': 3.0,
    'box': 7.5,
    'cls': 0.5,
    'dfl': 1.5,
    'close_mosaic': 10
}

# Start training
results = model.train(**training_config)
```

### 4. Model Evaluation Metrics
```python
# Evaluation criteria
evaluation_metrics = {
    'mAP@0.5': '>0.85',  # Mean Average Precision at IoU 0.5
    'mAP@0.5:0.95': '>0.65',
    'precision': '>0.9',
    'recall': '>0.8',
    'false_positive_rate': '<0.1'
}
```

## Enhanced AI Integration

### Multi-Modal Input for AI Analysis
```javascript
{
  symptoms: {
    category: "Skin Conditions",
    description: "Red, itchy rash on forearm",
    severity: 7,
    duration: "2-3_days",
    visualAnalysis: {
      detectedObjects: [
        {
          label: "rash",
          confidence: 0.92,
          areaCoverage: 0.15, // Percentage of visible area
          pattern: "cluster" // Distribution pattern
        }
      ]
    },
    userContext: {
      location: "Northern Alberta",
      ageRange: "25-34",
      skinTone: "medium" // Optional for better analysis
    }
  }
}
```

### Enhanced AI Output with Visual Confirmation
```javascript
{
  context: "Visual analysis confirms presence of rash with 92% confidence...",
  recommendations: [
    "Apply hydrocortisone cream twice daily",
    "Avoid scratching affected area",
    "Monitor for spreading or fever",
    "Seek medical attention if not improved in 3 days"
  ],
  urgency: "routine",
  visualConfidence: 0.92,
  differentialDiagnosis: [
    {condition: "Contact Dermatitis", confidence: 0.75},
    {condition: "Eczema", confidence: 0.60},
    {condition: "Allergic Reaction", confidence: 0.55}
  ]
}
```

## Frontend Integration for Image Capture

### Camera Component Implementation
```typescript
// Custom camera component with YOLO integration
const SymptomCamera = ({ onDetection, onCapture }) => {
  const [predictions, setPredictions] = useState([]);
  const cameraRef = useRef(null);
  
  // Real-time YOLO processing (optional, could be post-capture)
  const processFrame = async (frame) => {
    try {
      const results = await yoloModel.detect(frame);
      setPredictions(results);
      onDetection(results);
    } catch (error) {
      console.error("Frame processing error:", error);
    }
  };
  
  const captureImage = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true
      });
      onCapture(photo);
    }
  };
  
  return (
    <View style={styles.container}>
      <Camera 
        ref={cameraRef}
        style={styles.camera}
        onCameraReady={handleCameraReady}
      >
        {/* Overlay for detection boxes */}
        {predictions.map((pred, index) => (
          <View 
            key={index}
            style={[
              styles.detectionBox,
              {
                left: pred.bbox.x,
                top: pred.bbox.y,
                width: pred.bbox.width,
                height: pred.bbox.height
              }
            ]}
          >
            <Text style={styles.label}>
              {pred.label} ({Math.round(pred.confidence * 100)}%)
            </Text>
          </View>
        ))}
      </Camera>
      
      <Button title="Capture Image" onPress={captureImage} />
    </View>
  );
};
```

## Performance Optimization for Mobile

### 1. Model Size Considerations
- Use YOLOv8n (nano) or YOLOv8s (small) for mobile deployment
- Quantize model to FP16 or INT8 for faster inference
- Implement model pruning to remove unnecessary weights

### 2. On-Device vs Server-Side Processing
```typescript
// Decision logic for processing location
const shouldProcessOnDevice = () => {
  const deviceCapabilities = getDeviceCapabilities();
  const networkStatus = getNetworkStatus();
  
  return deviceCapabilities.gpuAvailable && 
         deviceCapabilities.memory > 2 && // GB
         networkStatus !== 'excellent'; // Prefer on-device if network poor
};

// Adaptive processing strategy
const processImage = async (imageData) => {
  if (shouldProcessOnDevice()) {
    return await processOnDevice(imageData);
  } else {
    return await processOnServer(imageData);
  }
};
```

### 3. Caching and Optimization
- Cache model weights locally
- Implement progressive loading of model components
- Use WebGL/GPU acceleration for browsers
- For React Native, use native modules for better performance

## Security and Privacy Enhancements

### Image Data Protection
```javascript
// Secure image handling protocol
const secureImageProcessing = {
  encryption: 'AES-256-GCM for stored images',
  transmission: 'TLS 1.3+ for all transfers',
  storage: 'Encrypted at rest with patient ID separation',
  retention: 'Automatic deletion after 30 days unless saved',
  anonymization: 'Automatic facial feature blurring',
  consent: 'Explicit user consent required for image analysis'
};
```

### Ethical AI Guidelines
```yaml
ethical_guidelines:
  - bias_mitigation: "Regular auditing for demographic bias"
  - transparency: "Clear explanation of AI limitations"
  - human_oversight: "Always provide option for human review"
  - data_minimization: "Collect only necessary image data"
  - user_control: "Allow users to delete images anytime"
```

## Testing and Validation

### YOLO Model Testing
```python
# Comprehensive model testing
def test_model_comprehensiveness():
    test_cases = [
        {'symptom': 'rash', 'variations': 15, 'minimum_accuracy': 0.85},
        {'symptom': 'swelling', 'variations': 12, 'minimum_accuracy': 0.80},
        {'symptom': 'bruising', 'variations': 10, 'minimum_accuracy': 0.88},
        # Add more symptom types
    ]
    
    for test_case in test_cases:
        results = run_comprehensive_test(test_case)
        assert results['accuracy'] >= test_case['minimum_accuracy']
```

### Integration Testing
```typescript
// End-to-end testing for image analysis flow
describe('Image Analysis Integration', () => {
  it('should successfully capture and analyze skin rash', async () => {
    // Mock image of rash
    const testImage = loadTestImage('rash.jpg');
    
    // Simulate user flow
    await user.uploadImage(testImage);
    await user.selectSymptomCategory('Skin Conditions');
    
    // Verify analysis results
    const results = await getAnalysisResults();
    expect(results.detectedObjects).toContain('rash');
    expect(results.confidence).toBeGreaterThan(0.8);
  });
});
```

## Deployment Considerations for YOLO

### Environment Variables (Enhanced)
```bash
# YOLO Model Configuration
YOLO_MODEL_PATH=./models/symptom-detection-v1
YOLO_CONFIDENCE_THRESHOLD=0.6
YOLO_IOU_THRESHOLD=0.5

# Image Processing
IMAGE_MAX_SIZE=2048
IMAGE_QUALITY=0.8
PROCESSING_TIMEOUT=30000

# Storage Configuration
IMAGE_STORAGE_BUCKET=symptom-images
IMAGE_RETENTION_DAYS=30
```

### Monitoring and Analytics for Image Analysis
```yaml
monitoring_metrics:
  - model_performance:
      - inference_time: "<1000ms"
      - accuracy: ">85%"
      - false_positive_rate: "<5%"
  
  - user_engagement:
      - image_capture_rate: "Percentage of assessments with images"
      - analysis_success_rate: "Successful processing percentage"
      - user_satisfaction: "Post-assessment feedback"
  
  - system_health:
      - processing_latency: "Time from capture to results"
      - error_rates: "By error type and frequency"
      - resource_utilization: "CPU/GPU/Memory usage"
```

This documentation provides comprehensive guidance for implementing image-based symptom analysis using YOLO, including model training requirements, integration strategies, performance considerations, and ethical guidelines for healthcare applications.