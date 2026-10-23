const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:3001/login");
  await page.fill('input[type="email"]', "admin@excalispace.local");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  await page.waitForSelector('a[href*="/board/"]');
  const b = await page.$('a[href*="/board/"]');
  await b.click();
  await page.waitForTimeout(4000);

  // Select arrow
  await page.evaluate(() => {
    const el = document.querySelector(".excalidraw");
    const key = Object.keys(el || {}).find(k => k.startsWith("__reactFiber"));
    let fiber = el[key];
    while (fiber) {
      if (fiber.stateNode && fiber.stateNode.state && fiber.stateNode.scene) {
        const arrow = fiber.stateNode.scene.getNonDeletedElements().find(e => e.type === "arrow");
        fiber.stateNode.setState({ selectedElementIds: { [arrow.id]: true } });
        break;
      }
      fiber = fiber.return;
    }
  });

  await page.waitForTimeout(1000);
  const btn = await page.$("#excalispace-arrow-type-animation-btn");
  await btn.click();
  await page.waitForTimeout(1000);

  const rects = await page.evaluate(() => {
    const btnEl = document.getElementById("excalispace-arrow-type-animation-btn");
    const pop = document.getElementById("excalispace-flow-popover");
    return {
      btnRect: btnEl.getBoundingClientRect(),
      popoverRect: pop.getBoundingClientRect(),
      computedTheme: document.querySelector(".excalidraw")?.classList.contains("theme--dark") ? "dark" : "light"
    };
  });

  console.log("Button & Popover Alignment:", JSON.stringify(rects, null, 2));

  // Screenshot specifically of the sidebar and the popover side-by-side
  await page.screenshot({
    path: "C:/Users/rodri/.gemini/antigravity/brain/090a19ea-81e4-4382-ae03-ca3acb87c9c7/popover-alignment.png",
    clip: {
      x: Math.max(0, rects.btnRect.left - 20),
      y: Math.max(0, rects.popoverRect.top - 30),
      width: rects.popoverRect.right - rects.btnRect.left + 50,
      height: rects.popoverRect.height + 60
    }
  });

  await browser.close();
})();
