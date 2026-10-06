"""Process-wide admission limits for a single-worker hackathon deployment."""

import asyncio
import os
import shutil
import time
from collections import deque
from pathlib import Path

from starlette.responses import JSONResponse


def positive_setting(name: str, default: int) -> int:
    value = int(os.getenv(name, str(default)))
    if value < 1:
        raise ValueError(f"{name} must be positive")
    return value


class DemoLimits:
    def __init__(self, app, output_directory):
        self.app = app
        self.output_directory = output_directory
        self.requests = deque()
        self.generations = deque()
        self.active = 0
        self.request_limit = positive_setting("API_REQUESTS_PER_MINUTE", 120)
        self.generation_limit = positive_setting("GENERATIONS_PER_HOUR", 60)
        self.concurrent_limit = positive_setting("MAX_CONCURRENT_JOBS", 2)
        self.storage_limit = positive_setting("MEDIA_STORAGE_MB", 1024) * 1024 * 1024
        self.storage_reserve = positive_setting("MEDIA_RESERVE_MB", 64) * 1024 * 1024

    @staticmethod
    def prune(queue, now, window):
        while queue and queue[0] <= now - window:
            queue.popleft()

    def storage_available(self):
        directory = Path(self.output_directory())
        directory.mkdir(parents=True, exist_ok=True)
        # Model weights are intentionally outside the generated-media budget.
        used = sum(p.stat().st_size for p in directory.iterdir() if p.is_file())
        references = directory / "references"
        if references.is_dir():
            used += sum(p.stat().st_size for p in references.iterdir() if p.is_file())
        return (
            used + self.active * self.storage_reserve <= self.storage_limit
            and shutil.disk_usage(directory).free >= self.active * self.storage_reserve
        )

    async def reject(self, scope, receive, send, status, code, message, retry=None):
        headers = {"Retry-After": str(retry)} if retry else None
        await JSONResponse({"detail": {"code": code, "message": message}}, status_code=status, headers=headers)(scope, receive, send)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/api/") or scope["method"] == "OPTIONS" or scope["path"] == "/api/health":
            return await self.app(scope, receive, send)
        now = time.monotonic()
        self.prune(self.requests, now, 60)
        if len(self.requests) >= self.request_limit:
            return await self.reject(scope, receive, send, 429, "request_limit", "The demo is receiving too many requests. Please try again in a minute.", 60)
        self.requests.append(now)
        path = scope["path"].rstrip("/")
        costly = scope["method"] == "POST" and path in {"/api/generate", "/api/voice-preview", "/api/fetch-transcript", "/api/speaker-reference"}
        generates = costly and path in {"/api/generate", "/api/voice-preview"}
        if costly and self.active >= self.concurrent_limit:
            return await self.reject(scope, receive, send, 429, "demo_busy", "The demo is busy creating audio. Please try again shortly.", 10)
        self.prune(self.generations, now, 3600)
        if generates and len(self.generations) >= self.generation_limit:
            retry = max(1, int(3600 - (now - self.generations[0])) + 1)
            return await self.reject(scope, receive, send, 429, "generation_quota", "The demo's hourly audio quota has been reached. Please try again later.", retry)
        if costly:
            self.active += 1
        try:
            if costly and path != "/api/fetch-transcript":
                try:
                    available = await asyncio.to_thread(self.storage_available)
                except OSError:
                    available = False
                if not available:
                    return await self.reject(scope, receive, send, 507, "storage_limit", "The demo's audio storage is full. Ask the organizer to free space.")
            if scope["method"] in {"POST", "PUT", "PATCH"}:
                limit = 5 * 1024 * 1024 if path == "/api/speaker-reference" else 1024 * 1024
                body = bytearray()
                deadline = time.monotonic() + 30
                try:
                    while True:
                        message = await asyncio.wait_for(receive(), max(0.001, deadline - time.monotonic()))
                        if message["type"] == "http.disconnect":
                            return
                        chunk = message.get("body", b"")
                        if len(body) + len(chunk) > limit:
                            return await self.reject(scope, receive, send, 413, "body_limit", "This request is too large.")
                        body.extend(chunk)
                        if not message.get("more_body", False):
                            break
                        if time.monotonic() >= deadline:
                            raise asyncio.TimeoutError
                except asyncio.TimeoutError:
                    return await self.reject(scope, receive, send, 408, "upload_timeout", "The upload took too long. Please try again.")
                original_receive = receive
                delivered = False

                async def replay():
                    nonlocal delivered
                    if delivered:
                        return await original_receive()
                    delivered = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}

                receive = replay
            if generates:
                # Recheck after body/storage awaits; another request may have used the last slot.
                now = time.monotonic()
                self.prune(self.generations, now, 3600)
                if len(self.generations) >= self.generation_limit:
                    return await self.reject(scope, receive, send, 429, "generation_quota", "The demo's hourly audio quota has been reached. Please try again later.", 3600)
                self.generations.append(now)
            await self.app(scope, receive, send)
        finally:
            if costly:
                self.active -= 1
