"""
serve-h5.py — dist-h5 静态服务（8091，禁缓存版）
背景：python -m http.server 无 Cache-Control，浏览器缓存旧 index.html 导致
      "改了代码页面没变"的假象（js 已版本化，但 index.html 本身被缓存）。
用法：python scripts/serve-h5.py [port]
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8091
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist-h5")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    print(f"[serve-h5] http://localhost:{PORT} -> {ROOT} (no-cache)")
    http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
