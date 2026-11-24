package com.loopec.campus;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (uri == null) return;

        String scheme = uri.getScheme();
        String host = uri.getHost();
        String path = uri.getPath();
        String query = uri.getQuery();

        if ("loopec".equalsIgnoreCase(scheme)) {
            // Converts custom scheme loopec://auth/session-sync?query -> https://loopec-2w2s.vercel.app/auth/session-sync?query
            String fullPath = (host != null && !host.isEmpty() ? "/" + host : "") + (path != null ? path : "");
            String targetUrl = "https://loopec-2w2s.vercel.app" + fullPath + (query != null && !query.isEmpty() ? "?" + query : "");
            loadTargetUrl(targetUrl);
        } else if ("https".equalsIgnoreCase(scheme) && host != null && (host.contains("loopec") || host.contains("vercel.app"))) {
            loadTargetUrl(uri.toString());
        }
    }

    private void loadTargetUrl(final String url) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().loadUrl(url);
                }
            });
        }
    }
}
