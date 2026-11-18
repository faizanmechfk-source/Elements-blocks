package com.ysftech.elementblocks

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class AndroidGameBridge(
    private val gameStorage: GameStorage,
    private val gameSettings: GameSettings,
    private val soundManager: SoundManager,
    private val appVersion: String,
    private val onExitRequested: () -> Unit
) {
    @JavascriptInterface
    fun saveJson(key: String, json: String) {
        gameStorage.saveData(key, json)
    }

    @JavascriptInterface
    fun loadJson(key: String): String {
        return gameStorage.loadData(key)
    }

    @JavascriptInterface
    fun removeJson(key: String) {
        gameStorage.removeData(key)
    }

    @JavascriptInterface
    fun clearAllStorage() {
        gameStorage.clearAll()
    }

    @JavascriptInterface
    fun getSettingsJson(): String {
        return gameSettings.toJsonString()
    }

    @JavascriptInterface
    fun updateSettingsJson(json: String) {
        gameSettings.updateFromJson(json)
    }

    @JavascriptInterface
    fun vibrate(type: String) {
        soundManager.triggerVibration(type)
    }

    @JavascriptInterface
    fun getAppVersion(): String {
        return appVersion
    }

    @JavascriptInterface
    fun exitApp() {
        onExitRequested()
    }
}

object GameWebViewFactory {
    const val ENTRY_URL = "file:///android_asset/index.html"

    @SuppressLint("SetJavaScriptEnabled")
    fun create(
        context: Context,
        bridge: AndroidGameBridge,
        onErrorOccurred: (String) -> Unit
    ): WebView {
        return WebView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#060D2A"))
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            isHapticFeedbackEnabled = true
            setLayerType(View.LAYER_TYPE_HARDWARE, null)

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                @Suppress("DEPRECATION")
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = false
                @Suppress("DEPRECATION")
                allowFileAccessFromFileURLs = false
                @Suppress("DEPRECATION")
                allowUniversalAccessFromFileURLs = false
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                useWideViewPort = true
                loadWithOverviewMode = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_NO_CACHE
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }

            addJavascriptInterface(bridge, "AndroidBridge")

            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString() ?: return true
                    return !url.startsWith("file:///android_asset/")
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        onErrorOccurred(
                            error?.description?.toString() ?: "Unable to load game engine."
                        )
                    }
                }
            }

            loadUrl(ENTRY_URL)
        }
    }
}
