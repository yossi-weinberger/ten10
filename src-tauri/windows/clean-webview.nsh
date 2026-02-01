!macro NSIS_HOOK_PREINSTALL
  ; Clean WebView2 cache to prevent stale Service Workers/assets from old versions
  ; This ensures the new app version loads fresh content.
  ; Data (SQLite DB) is stored in the parent folder, so it is safe.
  RMDir /r "$LOCALAPPDATA\com.ten10.dev\EBWebView"
!macroend
