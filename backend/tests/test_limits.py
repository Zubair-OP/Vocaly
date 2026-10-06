import asyncio
import tempfile
import unittest
from pathlib import Path

import httpx
from starlette.responses import JSONResponse

from limits import DemoLimits


class LimitTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.calls = 0

        async def endpoint(scope, receive, send):
            self.calls += 1
            await JSONResponse({"ok": True})(scope, receive, send)

        self.limits = DemoLimits(endpoint, lambda: self.directory.name)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.limits), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()
        self.directory.cleanup()

    async def test_request_rate_rejects_without_calling_endpoint_and_expires(self):
        self.limits.request_limit = 1
        self.assertEqual((await self.client.get("/api/outputs")).status_code, 200)
        denied = await self.client.get("/api/outputs")
        self.assertEqual(denied.status_code, 429)
        self.assertEqual(denied.headers["Retry-After"], "60")
        self.assertEqual(self.calls, 1)
        self.limits.requests[0] -= 61
        self.assertEqual((await self.client.get("/api/outputs")).status_code, 200)

    async def test_hourly_quota_includes_previews(self):
        self.limits.generation_limit = 1
        self.assertEqual((await self.client.post("/api/voice-preview", json={})).status_code, 200)
        self.assertEqual((await self.client.post("/api/generate", json={})).status_code, 429)
        self.assertEqual(self.calls, 1)

    async def test_chunked_oversize_body_is_rejected(self):
        async def chunks():
            yield b"a" * (600 * 1024)
            yield b"a" * (600 * 1024)
        response = await self.client.post("/api/outputs", content=chunks())
        self.assertEqual(response.status_code, 413)
        self.assertEqual(self.calls, 0)

    async def test_storage_admission_does_not_delete_existing_files(self):
        path = Path(self.directory.name, "existing.mp3")
        path.write_bytes(b"audio")
        self.limits.storage_limit = 5
        response = await self.client.post("/api/generate", json={})
        self.assertEqual(response.status_code, 507)
        self.assertEqual(path.read_bytes(), b"audio")
        self.assertEqual(self.limits.active, 0)
        self.assertEqual(self.calls, 0)

    async def test_concurrent_work_is_rejected_and_slot_released(self):
        started, finish = asyncio.Event(), asyncio.Event()
        async def slow(scope, receive, send):
            started.set()
            await finish.wait()
            await JSONResponse({"ok": True})(scope, receive, send)
        self.limits.app = slow
        self.limits.concurrent_limit = 1
        first = asyncio.create_task(self.client.post("/api/fetch-transcript", json={}))
        try:
            await asyncio.wait_for(started.wait(), 2)
            self.assertEqual((await self.client.post("/api/fetch-transcript", json={})).status_code, 429)
        finally:
            finish.set()
            await first
        self.assertEqual(self.limits.active, 0)

    async def test_slots_release_after_endpoint_error(self):
        async def failing(scope, receive, send):
            raise RuntimeError("test failure")
        self.limits.app = failing
        with self.assertRaises(RuntimeError):
            await self.client.post("/api/fetch-transcript", json={})
        self.assertEqual(self.limits.active, 0)

    async def test_health_remains_available_when_rate_limited(self):
        self.limits.request_limit = 1
        await self.client.get("/api/outputs")
        self.assertEqual((await self.client.get("/api/health")).status_code, 200)
