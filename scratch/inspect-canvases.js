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

  const res = await page.evaluate(() => {
    const w = document.querySelector(".excalidraw__canvas-wrapper");
    const c = document.querySelector(".excalispace-flow-animation-canvas");
    const sc = document.querySelector(".excalidraw__canvas.static");
    const ic = document.querySelector(".excalidraw__canvas.interactive");
    const appEl = document.querySelector(".excalidraw");
    
    return {
      wrapperRect: w ? w.getBoundingClientRect() : null,
      canvasRect: c ? c.getBoundingClientRect() : null,
      cAttributes: c ? { width: c.width, height: c.height, style: c.getAttribute("style") } : null,
      cParent: c ? c.parentElement?.className : null,
      staticCanvas: sc ? { width: sc.width, height: sc.height, rect: sc.getBoundingClientRect() } : null,
      interactiveCanvas: ic ? { width: ic.width, height: ic.height, rect: ic.getBoundingClientRect() } : null,
      appState: (() => {
        const key = Object.keys(appEl || {}).find(k => k.startsWith("__reactFiber"));
        let fiber = appEl ? appEl[key] : null;
        while (fiber) {
          if (fiber.stateNode && fiber.stateNode.state && fiber.stateNode.scene) {
            return {
              width: fiber.stateNode.state.width,
              height: fiber.stateNode.state.height,
              zoom: fiber.stateNode.state.zoom,
              scrollX: fiber.stateNode.state.scrollX,
              scrollY: fiber.stateNode.state.scrollY,
              elementsCount: fiber.stateNode.scene.getNonDeletedElements().length,
              arrowElements: fiber.stateNode.scene.getNonDeletedElements().filter(e => e.type === "arrow").map(e => ({
                id: e.id,
                x: e.x,
                y: e.y,
                points: e.points,
                customData: e.customData
              }))
            };
          }
          fiber = fiber.return;
        }
        return null;
      })()
    };
  });

  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
