"""Optional live desktop TTS. Quest builds should still play baked ogg files."""
from __future__ import annotations

import io
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent


class Handler(BaseHTTPRequestHandler):
    def _json(self, code: int, payload: dict) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if urlparse(self.path).path in ("/", "/health"):
            from engine import pick_device
            self._json(200, {"ok": True, "device": pick_device()})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if urlparse(self.path).path not in ("/speak", "/v1/audio/speech"):
            self._json(404, {"error": "not found"})
            return
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
        text = (body.get("text") or body.get("input") or "").strip()
        voice = (body.get("voice") or "mira-default").strip()
        if not text:
            self._json(400, {"error": "missing text"})
            return
        try:
            from engine import save_wav, synthesize
            import torchaudio as ta
            wav, sr = synthesize(text, voice)
            buf = io.BytesIO()
            ta.save(buf, wav, sr, format="wav")
            data = buf.getvalue()
        except Exception as e:
            self._json(500, {"error": str(e)})
            return
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:
        print("[%s] " % self.log_date_time_string() + (fmt % args))


def main() -> None:
    from engine import device_note, load_model, pick_device
    print(device_note(pick_device()))
    print("Loading Chatterbox (first run downloads weights)…")
    load_model()
    host, port = "127.0.0.1", 7861
    print(f"Live TTS: POST http://{host}:{port}/speak  JSON {{voice, text}}")
    print("Keep this on the laptop. The Quest build should play baked ogg files.")
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
