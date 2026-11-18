package com.ysftech.elementblocks

import android.graphics.Color
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : ComponentActivity() {

    private var gameWebView: WebView? = null
    private var loadError by mutableStateOf<String?>(null)

    private lateinit var gameStorage: GameStorage
    private lateinit var gameSettings: GameSettings
    private lateinit var soundManager: SoundManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT)
        )
        configureImmersiveFullscreen()

        gameStorage = GameStorage(applicationContext)
        gameSettings = GameSettings(applicationContext)
        soundManager = SoundManager(applicationContext, gameSettings)

        val versionName = try {
            packageManager.getPackageInfo(packageName, 0).versionName ?: "1.0.0"
        } catch (_: Exception) {
            "1.0.0"
        }

        val bridge = AndroidGameBridge(
            gameStorage = gameStorage,
            gameSettings = gameSettings,
            soundManager = soundManager,
            appVersion = versionName,
            onExitRequested = { runOnUiThread { finish() } }
        )

        setContent {
            MaterialTheme {
                BackHandler {
                    val webView = gameWebView
                    if (webView != null && loadError == null) {
                        webView.evaluateJavascript(
                            "if (window.onAndroidBack) { window.onAndroidBack(); } else { 'FALLBACK'; }"
                        ) { result ->
                            if (result == "\"FALLBACK\"") {
                                finish()
                            }
                        }
                    } else {
                        finish()
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(ComposeColor(0xFF060D2A))
                        .windowInsetsPadding(WindowInsets.safeDrawing)
                ) {
                    val errorMsg = loadError
                    if (errorMsg != null) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "Element Blocks",
                                color = ComposeColor(0xFF00E5FF),
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Offline engine interrupted: $errorMsg",
                                color = ComposeColor(0xFFB8C7E0),
                                fontSize = 15.sp,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = {
                                    loadError = null
                                    gameWebView?.loadUrl(GameWebViewFactory.ENTRY_URL)
                                },
                                modifier = Modifier.testTag("retry_webview_button"),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = ComposeColor(0xFF2979FF)
                                )
                            ) {
                                Text("Reload Game", color = ComposeColor.White)
                            }
                        }
                    } else {
                        AndroidView(
                            modifier = Modifier
                                .fillMaxSize()
                                .testTag("element_blocks_webview"),
                            factory = { ctx ->
                                GameWebViewFactory.create(
                                    context = ctx,
                                    bridge = bridge,
                                    onErrorOccurred = { err ->
                                        runOnUiThread { loadError = err }
                                    }
                                ).also { created ->
                                    gameWebView = created
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    private fun configureImmersiveFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            configureImmersiveFullscreen()
        }
    }

    override fun onPause() {
        super.onPause()
        gameWebView?.let { wv ->
            wv.evaluateJavascript("window.onAppPause && window.onAppPause();", null)
            wv.onPause()
        }
    }

    override fun onResume() {
        super.onResume()
        gameWebView?.let { wv ->
            wv.onResume()
            wv.evaluateJavascript("window.onAppResume && window.onAppResume();", null)
        }
    }

    override fun onDestroy() {
        gameWebView?.let { wv ->
            wv.stopLoading()
            wv.destroy()
        }
        gameWebView = null
        super.onDestroy()
    }
}
