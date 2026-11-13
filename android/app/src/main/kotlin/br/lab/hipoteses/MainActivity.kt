package br.lab.hipoteses

import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import java.io.ByteArrayInputStream
import java.io.IOException

/** Casca Android: exibe o app web (assets/www) num WebView, sem rede. Modelo, 3D e exportação rodam em JavaScript. */
class MainActivity : Activity() {
    private lateinit var web: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
        }
        web.addJavascriptInterface(Ponte(this), "AndroidBridge")
        web.webChromeClient = WebChromeClient()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val u = request.url
                if (u.host != HOST) return null
                var path = u.path ?: "/"
                if (path == "/") path = "/index.html"
                return try {
                    WebResourceResponse(mime(path), "utf-8", assets.open("www$path"))
                } catch (e: IOException) {
                    WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == HOST) return false
                startActivity(Intent(Intent.ACTION_VIEW, request.url))
                return true
            }
        }
        web.loadUrl("https://$HOST/index.html")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    companion object {
        const val HOST = "appassets.lab.local"
        fun mime(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
            "html" -> "text/html"
            "js", "mjs" -> "text/javascript"
            "css" -> "text/css"
            "json" -> "application/json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "wasm" -> "application/wasm"
            else -> "application/octet-stream"
        }
    }
}

/** Ponte JS → Android para salvar PDF/JSON/vídeo/ZIP na pasta Downloads (downloads por blob: não funcionam no WebView). */
class Ponte(private val ctx: Context) {
    @JavascriptInterface
    fun salvar(nome: String, mime: String, base64: String): String {
        return try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            val cv = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, nome)
                put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val r = ctx.contentResolver
            val uri = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv) ?: return "erro: sem destino"
            r.openOutputStream(uri)?.use { it.write(bytes) }
            cv.clear(); cv.put(MediaStore.Downloads.IS_PENDING, 0); r.update(uri, cv, null, null)
            (ctx as Activity).runOnUiThread { Toast.makeText(ctx, "Salvo em Downloads: $nome", Toast.LENGTH_LONG).show() }
            "ok"
        } catch (e: Exception) {
            "erro: ${e.message}"
        }
    }
}
