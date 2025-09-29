Yesterday I got stuck. I was trying to test the model by directly testing the original model before transformation.But that doesn't make much sense because what we are actually using in our Edge devices is the TensorFlow Lite model.In the following two hours, I'm going to explore whether that package I shared previously worked with React Native. By React Native, I mean Expo because of our development. Develop environment is excellent. And for testing, I find this interesting library. This one is going to host a TensorFlow Lite model using FastAPI. I think that's a way-- I think that's brilliant for sprint one. If we are not able to integrate that model directly into our application, I think the better approach is to host it online and make API calls to that remote server. In that way we have We can use our convex backend to cause some convex actions directly. Once we validate that bottle works, we can migrate them to our edge devices. I may oversimplify this.Because that's going to make a technical debt we need to solve in the spring 2. In spring 2, if we go this route, we are going to solve two problems.

But I think testing that model right now online is a better approach before we even get started to do the integration part. If that integration doesn't work, I'll be wasting like eight hours of time or ten hours time down the pros of testing it online right now is it can fail—if it fails, it fails fast. I need to find another approach.

Maybe hosting a YOLO V8 model online directly. That way we don't need to transform into other formats. It saves us a lot of time.

And transforming a model into TensorFlow, there is a quantification process. The model loses its capabilities—it loses some capabilities and is less precise.

Anyways, I'm going to test it right now. Here's the link to both the library.

### RN - Fast TFLite

https://github.com/mrousavy/react-native-fast-tflite

### For Testing and hosting

https://github.com/robmarkcole/tensorflow-lite-rest-server

- yue sep 29, 10:20
