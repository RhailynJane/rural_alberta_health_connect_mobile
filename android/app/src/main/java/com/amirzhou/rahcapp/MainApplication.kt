package com.amirzhou.rahcapp

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import com.facebook.react.bridge.ReactApplicationContext
import com.amirzhou.rahcapp.DummyDetectorInstaller

class MainApplication : Application(), ReactApplication {

  // Defer creation of ReactNativeHost until after we can tweak feature flags
  private val _reactNativeHost: ReactNativeHost by lazy {
    ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
          PackageList(this).packages.apply {
            // Manually add packages that cannot be autolinked here.
          }

        override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
    )
  }

  override val reactNativeHost: ReactNativeHost
    get() = _reactNativeHost

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    // Disable Bridgeless architecture explicitly to avoid missing libreact_featureflagsjni.so until environment is aligned
    ReactNativeFeatureFlags.enableBridgelessArchitecture(false)
    // Defer JSI installation until after React context is fully initialized
    reactNativeHost.reactInstanceManager.addReactInstanceEventListener(
      object : com.facebook.react.ReactInstanceEventListener {
        override fun onReactContextInitialized(context: com.facebook.react.bridge.ReactContext) {
          DummyDetectorInstaller.installJSI(context)
        }
      }
    )
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
