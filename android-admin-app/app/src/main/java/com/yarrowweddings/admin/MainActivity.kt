package com.yarrowweddings.admin

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var errorView: View
    private lateinit var errorText: TextView

    private val adminUrl = "https://yarrowweddings.com/admin"
    private val allowedHost = "yarrowweddings.com"

    private var isLoading = true

    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen before super.onCreate
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { isLoading }

        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        setupWebView()
        loadAdminPanel()
    }

    private fun initViews() {
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        errorView = findViewById(R.id.errorView)
        errorText = findViewById(R.id.errorText)

        swipeRefresh.setColorSchemeColors(
            getColor(R.color.primary),
            getColor(R.color.primary_dark)
        )

        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        findViewById<View>(R.id.retryButton).setOnClickListener {
            hideError()
            loadAdminPanel()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "${userAgentString} YarrowAdminApp/1.0"
        }

        // Enable cookies for authentication
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = AdminWebViewClient()
        webView.webChromeClient = AdminChromeClient()
    }

    private fun loadAdminPanel() {
        progressBar.visibility = View.VISIBLE
        webView.loadUrl(adminUrl)
    }

    private fun showError(message: String) {
        errorView.visibility = View.VISIBLE
        webView.visibility = View.GONE
        errorText.text = message
        progressBar.visibility = View.GONE
        swipeRefresh.isRefreshing = false
    }

    private fun hideError() {
        errorView.visibility = View.GONE
        webView.visibility = View.VISIBLE
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    private inner class AdminWebViewClient : WebViewClient() {

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url
            
            // Allow navigation within our domain
            if (url.host?.contains(allowedHost) == true) {
                return false
            }

            // Open external links in browser
            try {
                startActivity(Intent(Intent.ACTION_VIEW, url))
            } catch (e: Exception) {
                // No browser available
            }
            return true
        }

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            super.onPageStarted(view, url, favicon)
            progressBar.visibility = View.VISIBLE
        }

        override fun onPageFinished(view: WebView?, url: String?) {
            super.onPageFinished(view, url)
            isLoading = false
            progressBar.visibility = View.GONE
            swipeRefresh.isRefreshing = false
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            super.onReceivedError(view, request, error)
            if (request?.isForMainFrame == true) {
                val errorMessage = when (error?.errorCode) {
                    ERROR_HOST_LOOKUP -> "Unable to connect. Please check your internet connection."
                    ERROR_CONNECT -> "Connection failed. Server may be unavailable."
                    ERROR_TIMEOUT -> "Connection timed out. Please try again."
                    else -> "Something went wrong. Please try again."
                }
                showError(errorMessage)
            }
        }

        override fun onReceivedHttpError(
            view: WebView?,
            request: WebResourceRequest?,
            errorResponse: WebResourceResponse?
        ) {
            super.onReceivedHttpError(view, request, errorResponse)
            if (request?.isForMainFrame == true && errorResponse?.statusCode in 400..599) {
                // Let the page handle HTTP errors (like 401 for login redirect)
            }
        }
    }

    private inner class AdminChromeClient : WebChromeClient() {
        override fun onProgressChanged(view: WebView?, newProgress: Int) {
            super.onProgressChanged(view, newProgress)
            progressBar.progress = newProgress
        }
    }
}
