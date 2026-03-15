"""
tika_service.py
---------------
Extracts plain text from any file (PDF, Word, Excel, images via OCR,
HTML, CSV, EPUB, …) by sending the raw bytes to an Apache Tika server.

The Tika server is started via Docker:
    docker compose up -d tika
It listens on http://localhost:9998 by default.

Environment variable
--------------------
TIKA_URL : base URL of the Tika server  (default: http://localhost:9998)
"""

from __future__ import annotations

import os
import requests

TIKA_URL = os.getenv("TIKA_URL", "http://localhost:9998").rstrip("/")

# Tika /tika endpoint returns plain text extraction
_TIKA_ENDPOINT = f"{TIKA_URL}/tika"

# Conservative timeout: allow up to 5 minutes for very large or image-heavy files
_TIMEOUT_SECONDS = 300


def extract_text(file_bytes: bytes, content_type: str = "application/octet-stream") -> str:
    """
    Send *file_bytes* to Apache Tika and return the extracted plain text.

    Parameters
    ----------
    file_bytes   : raw bytes of the uploaded file
    content_type : MIME type hint (e.g. 'application/pdf').  Pass
                   'application/octet-stream' when unknown; Tika will
                   auto-detect the format.

    Returns
    -------
    str
        Extracted plain text.  May be empty if the file has no text layer
        (e.g. a purely graphical image without OCR-able content).

    Raises
    ------
    RuntimeError
        If the Tika server is unreachable or returns an error status.
    """
    try:
        response = requests.put(
            _TIKA_ENDPOINT,
            data=file_bytes,
            headers={
                "Content-Type": content_type,
                "Accept": "text/plain",
                "X-Tika-OCRLanguage": "eng",
            },
            timeout=_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.text
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Cannot reach the Apache Tika server. "
            "Make sure it is running: docker compose up -d tika"
        )
    except requests.exceptions.Timeout:
        raise RuntimeError(
            "The Tika server timed out while processing the file. "
            "The file may be too large or complex."
        )
    except requests.exceptions.HTTPError as exc:
        raise RuntimeError(f"Tika server error: {exc.response.status_code} — {exc.response.text[:200]}")


def is_tika_available() -> bool:
    """Return True if the Tika server is reachable."""
    try:
        resp = requests.get(f"{TIKA_URL}/tika", timeout=5)
        return resp.status_code < 500
    except requests.exceptions.RequestException:
        return False
