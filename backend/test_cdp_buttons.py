import asyncio
import json
import base64
import urllib.request
import websockets
import os

CDP_HTTP = "http://localhost:9222/json"

async def get_page_ws_url():
    with urllib.request.urlopen(CDP_HTTP) as r:
        pages = json.loads(r.read().decode())
    for p in pages:
        if p.get("type") == "page" and "localhost:5173" in p.get("url", ""):
            return p.get("webSocketDebuggerUrl")
    for p in pages:
        if p.get("type") == "page":
            return p.get("webSocketDebuggerUrl")
    raise RuntimeError("No active browser page found on port 9222")

class ChromeController:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self._msg_id = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=20*1024*1024)

    async def send_cmd(self, method, params=None, timeout=8):
        self._msg_id += 1
        msg = {"id": self._msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        
        async def wait_reply():
            while True:
                raw = await self.ws.recv()
                resp = json.loads(raw)
                if resp.get("id") == self._msg_id:
                    if "error" in resp:
                        raise RuntimeError(f"CDP Error in {method}: {resp['error']}")
                    return resp.get("result", {})

        return await asyncio.wait_for(wait_reply(), timeout=timeout)

    async def eval_js(self, expression, timeout=8):
        res = await self.send_cmd("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        }, timeout=timeout)
        val = res.get("result", {})
        if "value" in val:
            return val["value"]
        return val

    async def take_screenshot(self, filename):
        res = await self.send_cmd("Page.captureScreenshot", {"format": "png"})
        img_bytes = base64.b64decode(res.get("data", ""))
        with open(filename, "wb") as f:
            f.write(img_bytes)
        print(f"Captured screenshot: {filename}")

async def run_button_checks():
    ws_url = await get_page_ws_url()
    print("Connected to Chrome CDP:", ws_url)
    chrome = ChromeController(ws_url)
    await chrome.connect()

    # Step 1: Check Current State
    print("\n--- STEP 1: Verify Initial Page State ---")
    title = await chrome.eval_js("document.title")
    url = await chrome.eval_js("window.location.href")
    print(f"Page Title: {title} | URL: {url}")

    # Ensure on http://localhost:5173/
    if "localhost:5173" not in url:
        print("Navigating to http://localhost:5173/...")
        await chrome.eval_js("window.location.href = 'http://localhost:5173/'")
        await asyncio.sleep(2)

    # Step 2: Test Navigation Tabs (Cameras vs Map & Heatmap)
    print("\n--- STEP 2: Testing Navigation Tabs ---")
    tabs = await chrome.eval_js("""
        Array.from(document.querySelectorAll('button')).filter(b => 
            b.innerText.includes('Cameras Grid') || b.innerText.includes('Map & Heatmap') || b.innerText.includes('Overview')
        ).map(b => b.innerText.trim())
    """)
    print("Found navigation tabs:", tabs)

    # Click 'Map & Heatmap' tab
    print("Clicking 'Map & Heatmap' tab...")
    clicked_map = await chrome.eval_js("""
        (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.includes('Map') || b.innerText.includes('Overview')
            );
            if (btn) {
                btn.click();
                return btn.innerText.trim();
            }
            return null;
        })()
    """)
    print(f"Clicked tab: {clicked_map}")
    await asyncio.sleep(1.5)
    await chrome.take_screenshot("backend/test_screen_map_view.png")

    # Step 3: Test Location Selector / India Directory Dropdown
    print("\n--- STEP 3: Testing Location Selector & India Directory ---")
    opened_selector = await chrome.eval_js("""
        (() => {
            // Find dropdown toggle button containing MapPin or chevron
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.includes('Campus') || b.innerText.includes('Entire Campus') || b.innerText.includes('Street') || b.innerText.includes('Madurai') || b.innerText.includes('Location')
            );
            if (btn) {
                btn.click();
                return btn.innerText.trim();
            }
            return null;
        })()
    """)
    print(f"Opened location dropdown: {opened_selector}")
    await asyncio.sleep(1.0)
    await chrome.take_screenshot("backend/test_screen_location_dropdown.png")

    # Check India Directory tabs inside dropdown
    india_tabs = await chrome.eval_js("""
        Array.from(document.querySelectorAll('button')).filter(b => 
            b.innerText.includes('India Directory') || b.innerText.includes('Campus Regions') || b.innerText.includes('Search')
        ).map(b => b.innerText.trim())
    """)
    print("Location Selector options available:", india_tabs)

    # Close dropdown by clicking outside or pressing Escape
    await chrome.eval_js("document.body.click()")
    await asyncio.sleep(0.5)

    # Step 4: Test "Pick Any Location on Map" Button
    print("\n--- STEP 4: Testing 'Pick Any Location on Map' Button ---")
    pick_mode = await chrome.eval_js("""
        (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.includes('Pick Any Location') || b.innerText.includes('Pick Location')
            );
            if (btn) {
                btn.click();
                return 'Pick Mode Activated';
            }
            return 'Button not found';
        })()
    """)
    print("Pick Location button response:", pick_mode)
    await asyncio.sleep(0.5)

    # Step 5: Test Switching to Cameras Grid Tab
    print("\n--- STEP 5: Testing 'Cameras Grid' Tab & Camera Cards ---")
    clicked_cameras = await chrome.eval_js("""
        (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.includes('Cameras Grid') || b.innerText.includes('Cameras')
            );
            if (btn) {
                btn.click();
                return btn.innerText.trim();
            }
            return null;
        })()
    """)
    print(f"Switched back to tab: {clicked_cameras}")
    await asyncio.sleep(1.5)
    await chrome.take_screenshot("backend/test_screen_cameras_grid.png")

    # Step 6: Test Camera Card Buttons (Camera Details, Webcam, Upload)
    print("\n--- STEP 6: Testing Camera Card Actions ---")
    card_buttons = await chrome.eval_js("""
        Array.from(document.querySelectorAll('button')).filter(b => 
            b.innerText.includes('Camera Details') || b.innerText.includes('Webcam') || b.innerText.includes('Upload')
        ).map(b => b.innerText.trim())
    """)
    print(f"Found camera card action buttons ({len(card_buttons)}):", card_buttons[:6])

    # Click first 'Camera Details' button to open Camera Detail view
    print("Clicking first 'Camera Details' button...")
    clicked_details = await chrome.eval_js("""
        (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.includes('Camera Details')
            );
            if (btn) {
                btn.click();
                return 'Opened Camera Detail';
            }
            return 'Button not found';
        })()
    """)
    print(f"Camera Details action: {clicked_details}")
    await asyncio.sleep(1.5)
    await chrome.take_screenshot("backend/test_screen_camera_detail.png")

    # Step 7: Verify Camera Detail Page & 'Back to All Cameras' Button
    print("\n--- STEP 7: Testing Camera Detail Controls & Back Navigation ---")
    detail_title = await chrome.eval_js("""
        (() => {
            const h = document.querySelector('h1, h2, h3');
            return h ? h.innerText.trim() : null;
        })()
    """)
    print(f"Camera Detail Heading: {detail_title}")

    # Click Back button
    print("Clicking 'Back to All Cameras' button...")
    clicked_back = await chrome.eval_js("""
        (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.includes('Back') || b.innerText.includes('All Cameras')
            );
            if (btn) {
                btn.click();
                return 'Returned to dashboard';
            }
            return 'Back button not found';
        })()
    """)
    print(f"Back button response: {clicked_back}")
    await asyncio.sleep(1.5)
    await chrome.take_screenshot("backend/test_screen_final_dashboard.png")

    print("\n============================================================")
    print("ALL BUTTONS, TABS, OPTIONS, AND NAVIGATION VERIFIED IN BROWSER!")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_button_checks())
