https://react-native-vision-camera.com/docs/guides

## Install package.

`npx expo install react-native-vision-camera`

## Set up permission implementing the plugin.

```typescript

{
  "name": "my app",
  "plugins": [
    [
      "react-native-vision-camera",
      {
        "cameraPermissionText": "$(PRODUCT_NAME) needs access to your Camera.",

        // optionally, if you want to record audio:
        "enableMicrophonePermission": true,
        "microphonePermissionText": "$(PRODUCT_NAME) needs access to your Microphone."
      }
    ]
  ]
}

```

## Criticl Ref - the plugin

https://github.com/mrousavy/vision-camera-resize-plugin
![alt text](./img/plugin-usage.png)

It's dependency:

> 🧵 A library to run JS functions ("Worklets") on separate

https://github.com/margelo/react-native-worklets-core
![alt text](./img/react-native-worklets-core.png)

## Lib for drawing BOX

https://github.com/Shopify/react-native-skia

https://shopify.github.io/react-native-skia/docs/getting-started/installation/

Usecases:
https://www.reddit.com/r/reactnative/comments/1cn9y0e/how_are_people_using_skia/

## Ref

### Tutorials

- Building a Camera App with React Native Vision Camera and Expo: A Step-by-Step Tutorial https://www.youtube.com/watch?v=xNaGYGDZ2JU

- VisionCamera: Drawing on the Camera feed with JavaScript and Skia – React Native Berlin May 2024 https://www.youtube.com/watch?v=6iCcTPxneuk

- (native module code) How to add Computer Vision to your Expo iOS App using React-Native Skia ( Golf Swing Tracer ) https://www.youtube.com/watch?v=a51ofzf2rDo&t=495s

