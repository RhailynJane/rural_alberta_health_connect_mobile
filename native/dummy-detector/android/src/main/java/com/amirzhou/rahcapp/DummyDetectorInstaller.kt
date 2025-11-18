package com.amirzhou.rahcapp

import com.facebook.react.bridge.ReactApplicationContext

object DummyDetectorInstaller {
    init {
        System.loadLibrary("dummy-detector")
    }

    @JvmStatic
    external fun install(runtimePtr: Long)

    @JvmStatic
    fun installJSI(reactContext: ReactApplicationContext) {
        val ptr = reactContext.javaScriptContextHolder.get()
        install(ptr)
    }
}
