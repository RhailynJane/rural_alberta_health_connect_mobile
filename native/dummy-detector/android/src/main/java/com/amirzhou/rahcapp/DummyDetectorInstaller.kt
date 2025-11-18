package com.amirzhou.rahcapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext

object DummyDetectorInstaller {
    init {
        try {
            System.loadLibrary("dummy-detector")
        } catch (_: UnsatisfiedLinkError) {
            // Library may not be present in some build variants; ignore to avoid hard crash
        }
    }

    @JvmStatic
    external fun install(runtimePtr: Long)

    @JvmStatic
    fun installJSI(reactContext: ReactContext) {
        val ptr = try {
            if (reactContext is ReactApplicationContext) {
                reactContext.javaScriptContextHolder?.get() ?: 0L
            } else 0L
        } catch (_: Throwable) {
            0L
        }
        if (ptr == 0L) return
        try {
            install(ptr)
        } catch (_: UnsatisfiedLinkError) {
            // Native symbol missing; likely no native lib in this build type
        }
    }
}
