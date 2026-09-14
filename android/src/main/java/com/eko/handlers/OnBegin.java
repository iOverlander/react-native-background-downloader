package com.eko.handlers;

import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;

import com.eko.interfaces.BeginCallback;
import com.eko.RNBGDTaskConfig;

import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class OnBegin implements Callable<OnBeginState> {
  private final RNBGDTaskConfig config;
  private final BeginCallback callback;

  public OnBegin(RNBGDTaskConfig config, BeginCallback callback) {
    this.config = config;
    this.callback = callback;
  }

  @Override
  public OnBeginState call() throws Exception {
    HttpURLConnection urlConnection = null;
    try {
      urlConnection = getConnection(config.url);
      Map<String, List<String>> urlHeaders = urlConnection.getHeaderFields();
      WritableMap headers = getHeaders(urlConnection, urlHeaders);
      urlConnection.getInputStream().close();

      long bytesExpected = getContentLength(headers);
      callback.onBegin(config.id, headers, bytesExpected);
      return new OnBeginState(config.id, headers, bytesExpected);
    } catch (Exception e) {
      throw new Exception(e);
    } finally {
      if (urlConnection != null) {
        urlConnection.disconnect();
      }
    }
  }

  private HttpURLConnection getConnection(String urlString) throws Exception {
    URL url = new URL(urlString);
    HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
    // Requests only the first byte from the server.
    // Prevents memory leaks for invalid connections and, unlike HEAD, works
    // with pre-signed urls, which are only valid for the method they signed.
    urlConnection.setRequestMethod("GET");
    urlConnection.setRequestProperty("Range", "bytes=0-0");

    // Set timeout values to prevent downloads from staying in PENDING state
    // when URLs are slow to respond (e.g., taking 2-6 minutes)
    urlConnection.setConnectTimeout(30000); // 30 seconds to establish connection
    urlConnection.setReadTimeout(60000);    // 60 seconds to read initial response

    // 200 and 206 codes are successful http codes.
    int httpStatusCode = urlConnection.getResponseCode();
    if (httpStatusCode != HttpURLConnection.HTTP_OK && httpStatusCode != HttpURLConnection.HTTP_PARTIAL) {
      throw new Exception("HTTP response not valid: " + httpStatusCode);
    }

    return urlConnection;
  }

  private WritableMap getHeaders(URLConnection urlConnection, Map<String, List<String>> urlHeaders) {
    WritableMap headers = Arguments.createMap();

    Set<String> keys = urlHeaders.keySet();
    for (String key : keys) {
      String val = urlConnection.getHeaderField(key);
      headers.putString(key, val);
    }

    return headers;
  }

  private long getContentLength(WritableMap headersMap) {
    String contentRangeString = getHeaderValue(headersMap, "Content-Range");

    if (contentRangeString != null) {
      int totalIndex = contentRangeString.lastIndexOf('/');
      if (totalIndex != -1) {
        try {
          return Long.parseLong(contentRangeString.substring(totalIndex + 1).trim());
        } catch (NumberFormatException e) {
          // Falls back to Content-Length below.
        }
      }
    }

    String contentLengthString = getHeaderValue(headersMap, "Content-Length");

    if (contentLengthString != null) {
      try {
        return Long.parseLong(contentLengthString);
      } catch (NumberFormatException e) {
        return 0;
      }
    }

    return 0;
  }

  private String getHeaderValue(WritableMap headersMap, String name) {
    ReadableMapKeySetIterator iterator = headersMap.keySetIterator();

    while (iterator.hasNextKey()) {
      String key = iterator.nextKey();
      if (key != null && key.equalsIgnoreCase(name)) {
        return headersMap.getString(key);
      }
    }

    return null;
  }
}
