Configure EAS Build with eas.json

Copy

Learn how a project using EAS services is configured with eas.json.
eas.json is the configuration file for EAS CLI and services. It is generated when the eas build:configure command runs for the first time in your project and is located next to package.json at the root of your project. Configuration for EAS Build all belongs under the build key.

The default configuration for eas.json generated in a new project is shown below:


eas.json

Copy

{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
Build profiles

A build profile is a named group of configurations that describes the necessary parameters to perform a certain type of build.

The JSON object under the build key can contain multiple build profiles, and you can have custom build profile names. In the default configuration, there are three build profiles: development, preview, and production. However, these could have been named foo, bar, and baz.

To run a build with a specific profile, use the command as shown below with a <profile-name>:


Terminal

Copy
eas build --profile <profile-name>
If you omit the --profile flag, EAS CLI will default to using the profile with the name production (if it exists).

Platform-specific and common options

Inside each build profile, you can specify android and ios fields that contain platform-specific configuration for the build. Options that are available to both platforms can be provided on the platform-specific configuration object or the root of a profile.

Sharing configuration between profiles

Build profiles can be extended to other build profile properties using the extends option.

For example, in the preview profile you might have "extends": "production". This will make the preview profile inherit the configuration of the production profile.

You can keep chaining profile extensions up to the depth of 5 as long as you avoid making circular dependencies.

Common use cases

Developers using Expo tools usually end up having three different types of builds: development, preview, and production.

Development builds

By default, eas build:configure will create a development profile with "developmentClient": true. This indicates that this build depends on expo-dev-client. These builds include developer tools, and they are never submitted to an app store.

The development profile also defaults to "distribution": "internal". This will make it easy to distribute your app directly to physical Android and iOS devices.

You can also configure your development builds to run on the iOS Simulator. To do this, use the following configuration for the development profile:


eas.json

Copy

{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
    ... 
  }
  ... 
}
Note: For iOS, to create a build for internal distribution and another for the iOS Simulator, you can create a separate development profile for that build. You can give the profile a custom name. For example, development-simulator, and use the iOS Simulator specific configuration on that profile instead of on development. No such configuration is required to run an Android .apk on a device and an Android Emulator as the same .apk will run with both environments.
Preview builds

These builds don't include developer tools. They are intended to be installed by your team and other stakeholders, to test out the app in production-like circumstances. In this way, they are similar to production builds. However, they are different from production builds because they are either not signed for distribution on app stores (ad hoc or enterprise provisioning on iOS), or are packaged in a way that is not optimal for store deployment (Android .apk is recommended for preview, .aab is recommended for Google Play Store).

A minimal preview profile example:


eas.json

Copy

{
  "build": {
    "preview": {
      "distribution": "internal"
    }
    ... 
  }
  ... 
}
Similar to development builds, you can configure a preview build to run on the iOS Simulator or create a variant of your preview profile for that purpose. No such configuration is required to run an Android .apk on a device and an Android Emulator as the same .apk will run with both environments.

Production builds

These builds are submitted to an app store, for release to the general public or as part of a store-facilitated testing process such as TestFlight.

Production builds must be installed through their respective app stores. They cannot be installed directly on your Android Emulator or device, or iOS Simulator or device. The only exception to this is if you explicitly set "buildType": "apk" for Android on your build profile. However, it is recommended to use .aab when submitting to stores, as this is the default configuration.

A minimal production profile example:


eas.json

Copy

{
  "build": {
    "production": {}
    ... 
  }
  ... 
}
Installing multiple builds of the same app on a single device

It's common to have development and production builds installed simultaneously on the same device. See Install app variants on the same device.

Configuring build tools

Every build depends either implicitly or explicitly on a specific set of versions of related tools that are needed to carry out the build process. These include but are not limited to: Node.js, npm, Yarn, Ruby, Bundler, CocoaPods, Fastlane, Xcode, and Android NDK.

Selecting build tool versions

Versions for the most common build tools can be set on build profiles with fields corresponding to the names of the tools. For example node:


eas.json

Copy

{
  "build": {
    "production": {
      "node": "18.18.0"
    }
    ... 
  }
  ... 
}
It's common to share build tool configurations between profiles. Use extends for that:


eas.json

Copy

{
  "build": {
    "production": {
      "node": "18.18.0"
    },
    "preview": {
      "extends": "production",
      "distribution": "internal"
    },
    "development": {
      "extends": "production",
      "developmentClient": true,
      "distribution": "internal"
    }
    ... 
  }
  ... 
}
Selecting resource class

A resource class is the virtual machine resources configuration (CPU cores, RAM size) EAS Build provides to your jobs. By default, the resource class is set to medium, which is usually sufficient for both small and bigger projects. However, if your project requires a more powerful CPU or bigger memory, or if you want your builds to finish faster, you can switch to large workers.

For more details on resources provided to each class, see android.resourceClass and ios.resourceClass properties. To run your build on a worker of a specific resource class, configure this property in your build profile:


eas.json

Copy

{
  "build": {
    "production": {
      "android": {
        "resourceClass": "medium"
      },
      "ios": {
        "resourceClass": "large"
      },
    }
    ... 
  }
  ... 
}
Note: Running jobs on a large worker requires a paid EAS plan.
Selecting a base image

The base image for the build job controls the default versions for a variety of dependencies, such as Node.js, Yarn, and CocoaPods. You can override them using the specific named fields as described in the previous section using resourceClass. However, the image includes specific versions of tools that can't be explicitly set any other way, such as the operating system version and Xcode version.

If you are building an app with Expo, EAS Build will pick the appropriate image to use with a reasonable set of dependencies for the SDK version that you are building for. Otherwise, it is recommended to see the list of available images on Build server infrastructure.

Examples

Schema


eas.json

Copy

{
  "cli": {
    "version": "SEMVER_RANGE",
    "requireCommit": boolean,
    "appVersionSource": string,
    "promptToConfigurePushNotifications": boolean,
  },
  "build": {
    "BUILD_PROFILE_NAME_1": {
      ...COMMON_OPTIONS,
      "android": {
        ...COMMON_OPTIONS,
        ...ANDROID_OPTIONS
      },
      "ios": {
        ...COMMON_OPTIONS,
        ...IOS_OPTIONS
      }
    },
    "BUILD_PROFILE_NAME_2": {},
	... 
  }
}

Show More
You can specify common properties both in the platform-specific configuration object or at the profile's root. The platform-specific options take precedence over globally-defined ones.

A managed project with several profiles

A bare project with several profiles
Environment variables

You can configure environment variables on your build profiles using the "env" field. These environment variables will be used to evaluate app.config.js locally when you run eas build, and they will also be set on the EAS Build builder.


eas.json

Copy

{
  "build": {
    "production": {
      "node": "16.13.0",
      "env": {
        "API_URL": "https://company.com/api"
      }
    },
    "preview": {
      "extends": "production",
      "distribution": "internal",
      "env": {
        "API_URL": "https://staging.company.com/api"
      }
    }
    ... 
  }
  ... 
}

Show More
The Environment variables and secrets reference explains this topic in greater detail, and the Use EAS Update guide provides considerations when using this feature alongside expo-updates.



