package com.movebetter.physio.ui.home

import android.annotation.SuppressLint
import android.net.Uri
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.firebase.auth.FirebaseAuth
import com.movebetter.physio.ui.theme.MidBlue
import com.movebetter.physio.ui.theme.Muted
import com.movebetter.physio.ui.theme.Navy
import com.movebetter.physio.ui.theme.SurfaceSoft
import com.movebetter.physio.ui.theme.White
import kotlinx.coroutines.delay
import org.json.JSONObject

// Default USB Reverse URL: Works directly over USB cable after running:
// adb reverse tcp:8000 tcp:8000
private const val DEFAULT_CLINIC_URL = "http://127.0.0.1:8000"

private class AndroidBridge(private val onLogoutCallback: () -> Unit) {
    @JavascriptInterface
    fun logout() {
        onLogoutCallback()
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun HomeScreen(
    fullName: String,
    phoneNumber: String,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("clinic_server_prefs", android.content.Context.MODE_PRIVATE) }

    val savedUrl = remember {
        val stored = prefs.getString("server_url", null)
        if (stored.isNullOrBlank() || stored == "http://10.0.2.2:8000") DEFAULT_CLINIC_URL else stored
    }

    var serverUrl by remember { mutableStateOf(savedUrl) }
    var urlInput by remember { mutableStateOf(savedUrl) }
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var filePathCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }

    val fileChooserLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        filePathCallback?.onReceiveValue(uris.toTypedArray())
        filePathCallback = null
    }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { }

    val currentUser = remember { FirebaseAuth.getInstance().currentUser }
    val uid = currentUser?.uid ?: "firebase-user"
    val userEmail = currentUser?.email?.takeIf { it.isNotBlank() } ?: phoneNumber
    val displayName = fullName.trim().ifBlank { userEmail.substringBefore("@").ifBlank { "Doctor" } }

    // 8-second timeout: prevents infinite spinner if server is stopped or IP is unreachable
    LaunchedEffect(serverUrl, isLoading, loadError) {
        if (isLoading && loadError == null) {
            delay(8000)
            if (isLoading && loadError == null) {
                webViewRef?.stopLoading()
                isLoading = false
                loadError = "Connection timed out (8s). Ensure FastAPI server is running on port 8000 and USB reverse / Wi-Fi IP is active."
            }
        }
    }

    BackHandler(enabled = webViewRef?.canGoBack() == true) {
        webViewRef?.goBack()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SurfaceSoft)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        if (loadError == null) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebView(ctx).apply {
                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            databaseEnabled = true
                            allowFileAccess = true
                            allowContentAccess = true
                            mediaPlaybackRequiresUserGesture = false
                            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                            useWideViewPort = true
                            loadWithOverviewMode = true
                            cacheMode = WebSettings.LOAD_NO_CACHE
                        }

                        addJavascriptInterface(AndroidBridge {
                            post { onLogout() }
                        }, "AndroidBridge")

                        webChromeClient = object : WebChromeClient() {
                            override fun onPermissionRequest(request: PermissionRequest?) {
                                micPermissionLauncher.launch(android.Manifest.permission.RECORD_AUDIO)
                                request?.grant(request.resources)
                            }

                            override fun onShowFileChooser(
                                webView: WebView?,
                                callback: ValueCallback<Array<Uri>>?,
                                fileChooserParams: FileChooserParams?
                            ): Boolean {
                                filePathCallback?.onReceiveValue(null)
                                filePathCallback = callback
                                fileChooserLauncher.launch("*/*")
                                return true
                            }
                        }

                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView?,
                                request: WebResourceRequest?
                            ): Boolean = false

                            override fun onReceivedError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                error: WebResourceError?
                            ) {
                                if (request?.isForMainFrame == true) {
                                    isLoading = false
                                    loadError = error?.description?.toString() ?: "Unable to connect to clinic server"
                                }
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                if (loadError != null) return

                                val resolvedEmail = if (userEmail.contains("@")) userEmail else "$uid@movebetter.local"
                                val userJson = JSONObject().apply {
                                    put("id", uid)
                                    put("phone", phoneNumber)
                                    put("full_name", displayName)
                                    put("email", resolvedEmail)
                                    put("role", "Admin")
                                }.toString()

                                val token = "firebase:$uid:$resolvedEmail"
                                val injectScript = """
                                    (function() {
                                        localStorage.setItem('mb_token', ${JSONObject.quote(token)});
                                        localStorage.setItem('mb_user', ${JSONObject.quote(userJson)});
                                        if (typeof checkSession === 'function') {
                                            checkSession();
                                        }
                                        var nameEl = document.getElementById('current-user-name');
                                        if (nameEl) nameEl.textContent = ${JSONObject.quote(displayName)};
                                    })();
                                """.trimIndent()

                                view?.evaluateJavascript(injectScript, null)
                                isLoading = false
                            }
                        }

                        webViewRef = this
                        loadUrl(serverUrl)
                    }
                }
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "Connect to Clinic Server",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Navy
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Logged in as $displayName ($userEmail).",
                    fontSize = 13.sp,
                    color = Muted,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    loadError ?: "",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(16.dp))
                OutlinedTextField(
                    value = urlInput,
                    onValueChange = { urlInput = it },
                    label = { Text("Server URL (USB: http://127.0.0.1:8000)") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = {
                        val cleaned = urlInput.trim().trimEnd('/')
                        if (cleaned.isNotBlank()) {
                            prefs.edit().putString("server_url", cleaned).apply()
                            serverUrl = cleaned
                            loadError = null
                            isLoading = true
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MidBlue)
                ) {
                    Text("Connect & Open Clinic", color = White, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(10.dp))
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Logout", color = Navy)
                }
            }
        }

        if (isLoading && loadError == null) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator(color = Navy)
                Spacer(Modifier.height(12.dp))
                Text("Connecting to $serverUrl...", color = Muted, fontSize = 13.sp)
            }
        }
    }
}