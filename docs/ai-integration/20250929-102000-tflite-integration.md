# TensorFlow Lite Integration for React Native

**Created**: 2025-09-29 10:20:00
**Branch**: N/A
**Related Commits**: N/A

---

Yesterday I got stuck. I was trying to test the model by directly testing the original model before transformation.But that doesn't make much sense because what we are actually using in our Edge devices is the TensorFlow Lite model.In the following two hours, I'm going to explore whether that package I shared previously worked with React Native. By React Native, I mean Expo because of our development. Develop environment is excellent. And for testing, I find this interesting library. This one is going to host a TensorFlow Lite model using FastAPI. I think that's a way-- I think that's brilliant for sprint one. If we are not able to integrate that model directly into our application, I think the better approach is to host it online and make API calls to that remote server. In that way we have We can use our convex backend to cause some convex actions directly. Once we validate that bottle works, we can migrate them to our edge devices. I may oversimplify this.Because that's going to make a technical debt we need to solve in the spring 2. In spring 2, if we go this route, we are going to solve two problems.

But I think testing that model right now online is a better approach before we even get started to do the integration part. If that integration doesn't work, I'll be wasting like eight hours of time or ten hours time down the pros of testing it online right now is it can fail—if it fails, it fails fast. I need to find another approach.

Maybe hosting a YOLO V8 model online directly. That way we don't need to transform into other formats. It saves us a lot of time.

And transforming a model into TensorFlow, there is a quantification process. The model loses its capabilities—it loses some capabilities and is less precise.

Anyways, I'm going to test it right now. Here's the link to both the library.

---

### RN - Fast TFLite

https://github.com/mrousavy/react-native-fast-tflite
<a href="https://github.com/mrousavy/react-native-fast-tflite">
<picture>

<source media="(prefers-color-scheme: dark)" srcset="./img/banner-dark.png" />
<source media="(prefers-color-scheme: light)" srcset="./img/banner-light.png" />
<img alt="Fast TFLite" src="./img/banner-light.png" />
</picture>
</a>

### For Testing and Hosting

The library enables us for fast testing so that we don't need to deploy a new dev deployment using EAS build. qw can just replace the model in the cloud and test them directly.

But if the fastTFLite library doesn't work on Expo, we don't need to do this testing in the first place. Because in that case, we may not using tflite.

https://github.com/robmarkcole/tensorflow-lite-rest-server

yue sep 29, 10:20

---

## Research 1

**GPT5**: https://chatgpt.com/share/68dabf78-16c4-8007-8f6f-ad8283774f41

**Gemini**: https://g.co/gemini/share/147739fc1569

### 1. Lib Issue discussion

This is a GitHub issue discussing the Axle compatibility. They talk about Metro bundle configurations.
![paraFlux inc. Image](https://hallowed-ptarmigan-685.convex.cloud/api/storage/35f853f5-0c12-41ff-92ec-330425a88953)

https://github.com/mrousavy/react-native-fast-tflite/issues/6?utm_source=chatgpt.com

### 2. Token-classification in Expo ReactNative

https://alfarruggia.medium.com/token-classification-in-react-62cc2cba1a37

This is an article about how to integrate machine learning models into an Axeful React Native application using the exact library we're talking about.

### 3. **Example** and **Tutorial**

https://blog.swmansion.com/on-device-ai-ml-in-react-native-137918d0331b

This tutorial is from Software mansion, they are the core contributors for React Native. This suggests our approach is validated by experts. It confirms the following four points:

- react-native-fast-tflite with Expo
- Real-time on-device inference
- .tflite model loading with metro configuration
- EAS workflow compatibility

Claude 4.1, Metis:

> The Critical Insight
>
> The tutorial shows production-ready implementation. Your burn classification model will work exactly like their segmentation model - just different input/output
> processing.
>
> Key Technical Notes from Tutorial
>
> 1. iOS simulator arm64 issues confirmed - you'll need real device testing
> 2. Metro configuration required - .tflite files need explicit asset registration
> 3. Prebuild step necessary - npx expo prebuild --platform ios
> 4. Real-time inference proven - performance will be adequate for your use case
>
> Afternoon Strategy Confirmed
>
> 2pm-4pm: Follow Software Mansion's exact pattern for your burn model
> 4pm-6pm: Integrate with camera and image preprocessing6pm-9:30pm: Build complete assessment flow
>
> The FastAPI Backup Plan
>
> Still valuable for testing model accuracy, but no longer necessary for technical risk mitigation. The integration path is proven.
>
> Strategic Call
>
> Execute the 30-minute validation immediately. Software Mansion has provided your implementation roadmap. This afternoon becomes execution, not experimentation.
>
> Your technical instincts were correct. On-device deployment is validated. Sprint 1 with working burn classification is achievable.
>
> Test the basic package import now. Confirm at your 12pm meeting that the integration path is proven. The tutorial shows production-ready implementation. Your burn classification model will work exactly like their segmentation model - just different input/output
> processing.
>
> Key Technical Notes from Tutorial
>
> 1. iOS simulator arm64 issues confirmed - you'll need real device testing
> 2. Metro configuration required - .tflite files need explicit asset registration
> 3. Prebuild step necessary - npx expo prebuild --platform ios
> 4. Real-time inference proven - performance will be adequate for your use case
>
> Afternoon Strategy Confirmed
>
> 2pm-4pm: Follow Software Mansion's exact pattern for your burn model
> 4pm-6pm: Integrate with camera and image preprocessing6pm-9:30pm: Build complete assessment flow
>
> The FastAPI Backup Plan
>
> Still valuable for testing model accuracy, but no longer necessary for technical risk mitigation. The integration path is proven.
>
> Strategic Call
>
> Execute the 30-minute validation immediately. Software Mansion has provided your implementation roadmap. This afternoon becomes execution, not experimentation.
>
> Your technical instincts were correct. On-device deployment is validated. Sprint 1 with working burn classification is achievable.
****>
> Test the basic package import now. Confirm at your 12pm meeting that the integration path is proven.


### 4. Another Example
https://www.reddit.com/r/reactnative/comments/14n96x7/running_a_tensorflow_object_detector_model_and/
![paraFlux inc. Image](https://hallowed-ptarmigan-685.convex.cloud/api/storage/d2e73bf9-3846-4e90-9ffe-8e63b06a157b)



## Config Metro bundler
Metro Bundler only recognizes certain file types, and by default, TFLite model files are not included.

https://docs.expo.dev/guides/customizing-metro/

```
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// example
config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db'
);

// What we need
config.resolver.assetExts.push('tflite');

module.exports = config;
```