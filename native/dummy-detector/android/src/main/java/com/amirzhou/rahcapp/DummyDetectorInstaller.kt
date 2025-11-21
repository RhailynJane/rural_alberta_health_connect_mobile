package com.amirzhou.rahcapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext

object DummyDetectorInstaller {
    init {
        try {
            System.loadLibrary("dummy-detector")
        } catch (e: UnsatisfiedLinkError) {
            android.util.Log.w("DummyDetector", "native lib missing: ${e.message}")
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
        if (ptr == 0L) {
            android.util.Log.w("DummyDetector", "JSI runtime pointer unavailable; skipping install")
            return
        }
        try {
            install(ptr)
            android.util.Log.i("DummyDetector", "JSI detector installed (ptr=$ptr)")
        } catch (e: UnsatisfiedLinkError) {
            android.util.Log.w("DummyDetector", "native symbol missing: ${e.message}")
        } catch (e: Throwable) {
            android.util.Log.e("DummyDetector", "install failed: ${e.message}", e)
        }
    }
}
