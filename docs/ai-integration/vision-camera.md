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
