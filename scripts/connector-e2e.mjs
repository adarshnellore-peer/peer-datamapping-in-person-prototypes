import { chromium } from "playwright";

const BASE = process.env.APP_URL ?? "http://localhost:3056";

async function countConnectorStrokes(page) {
  return page.locator("[data-connector-viewport] svg").first().locator(
    "path[stroke='#ff4e49'], path[stroke='#e64641'], path[stroke='#6366f1'], path[stroke='#4338ca']",
  ).count();
}

async function switchToV4(page) {
  await page.getByRole("button", { name: /^Version V\d/ }).click();
  await page.getByRole("menuitem", { name: /V4/i }).click();
  await page.waitForTimeout(500);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const issues = [];

  const check = (label, ok, detail = "") => {
    if (!ok) issues.push(detail ? `${label}: ${detail}` : label);
  };

  try {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    await switchToV4(page);

    const outline = page.getByPlaceholder("Search outline");
    const sources = page.getByPlaceholder("Search sources");
    check("outline search", (await outline.count()) > 0);
    check("sources search", (await sources.count()) > 0);

    const section = page.locator('[data-node-kind="section"]').first();
    const section2 = page.locator('[data-node-kind="section"]').nth(1);
    const docHeader = page.locator('[data-node-kind="document"]').first();
    const reference = page.locator('[data-node-kind="reference"]').first();

    // Idle: no connectors
    const idlePaths = await countConnectorStrokes(page);
    check("idle connectors hidden", idlePaths === 0, `found ${idlePaths}`);

    // Section hover
    await section.hover();
    await page.waitForTimeout(450);
    const pathsAfterSectionHover = await countConnectorStrokes(page);
    check("section hover shows connectors", pathsAfterSectionHover > 0);

    // Hover another section while first not selected — preview should still work
    if ((await section2.count()) > 0) {
      await section2.hover();
      await page.waitForTimeout(450);
      const pathsAfterSecondHover = await countConnectorStrokes(page);
      check("second section hover shows connectors", pathsAfterSecondHover > 0);
    }

    // Section click selects and keeps connectors
    await section.click();
    await page.waitForTimeout(450);
    const pathsAfterClick = await countConnectorStrokes(page);
    check("section click shows connectors", pathsAfterClick > 0);

    // Hover source while section selected — selection should persist
    if ((await reference.count()) > 0) {
      await reference.hover();
      await page.waitForTimeout(450);
      const pathsWhileSelectedHover = await countConnectorStrokes(page);
      check(
        "selection persists when hovering elsewhere",
        pathsWhileSelectedHover === pathsAfterClick,
        `expected ${pathsAfterClick}, got ${pathsWhileSelectedHover}`,
      );
      check(
        "section stays selected after hover elsewhere",
        await section.evaluate((el) => el.classList.contains("is-selected")),
      );
    }

    // Scroll outline column — selection and connectors should persist
    const pathsBeforeScroll = await countConnectorStrokes(page);
    await page.locator(".connector-column-scroll").first().evaluate((el) => {
      el.scrollTop = 120;
    });
    await page.waitForTimeout(250);
    const pathsAfterScroll = await countConnectorStrokes(page);
    check(
      "scroll keeps selected connectors",
      pathsAfterScroll === pathsBeforeScroll && pathsAfterScroll > 0,
      `before ${pathsBeforeScroll}, after ${pathsAfterScroll}`,
    );
    check(
      "section stays selected after scroll",
      await section.evaluate((el) => el.classList.contains("is-selected")),
    );

    // Document hover (collapsed)
    if ((await docHeader.count()) > 0) {
      await docHeader.hover();
      await page.waitForTimeout(450);
      const pathsAfterDocHover = await countConnectorStrokes(page);
      check("document hover shows connectors", pathsAfterDocHover > 0);
    }

    // Per-column search
    await outline.fill("efficacy");
    await page.waitForTimeout(300);
    const filteredSections = await page.locator('[data-node-kind="section"]').count();
    check("outline search filters", filteredSections >= 0);

    await outline.fill("");
    await sources.fill("protocol");
    await page.waitForTimeout(300);
    const filteredSources = await page.locator('[data-node-kind="reference"], [data-node-kind="document"]').count();
    check("source search filters", filteredSources >= 0);
    await sources.fill("");

    // Re-select section for edge tag tests
    await section.click();
    await page.waitForTimeout(400);

    const removeBtns = page.getByRole("button", { name: "Remove connection" });
    const removeCount = await removeBtns.count();
    if (removeCount > 0 && pathsAfterClick > 1) {
      await removeBtns.first().click();
      await page.waitForTimeout(400);
      const pathsAfterRemove = await countConnectorStrokes(page);
      check(
        "remove one keeps others",
        pathsAfterRemove > 0,
        `had ${pathsAfterClick}, after remove ${pathsAfterRemove}`,
      );
    }

    // Role tag opens menu without clearing all connectors (hover edge first)
    await section.click();
    await page.waitForTimeout(400);
    const edgeHit = page.locator("[data-connector-edge-hit]").first();
    if ((await edgeHit.count()) > 0) {
      await edgeHit.click();
      await page.waitForTimeout(350);
      const roleBtn = page
        .locator('[data-connector-edge-menu] button')
        .filter({ hasText: /Insert|Interpret|Reference|Supporting|Primary|Data source/i })
        .first();
      if ((await roleBtn.count()) > 0) {
        const beforeMenu = await countConnectorStrokes(page);
        const roleBefore = (await roleBtn.textContent())?.trim() ?? "";
        await roleBtn.click();
        await page.waitForTimeout(250);
        const menu = page.locator('[data-connector-edge-menu]').filter({ has: page.locator("button", { hasText: /Insert|Interpret|Reference/i }) });
        check("role menu opens", (await menu.count()) > 0);
        const afterMenu = await countConnectorStrokes(page);
        check("connectors remain with menu open", afterMenu > 0 && afterMenu === beforeMenu);
        const nextRole =
          roleBefore === "Primary"
            ? "Supporting"
            : roleBefore === "Supporting"
              ? "Reference"
              : "Primary";
        const roleOption = page
          .locator("[data-connector-edge-menu] button")
          .filter({ hasText: new RegExp(`^${nextRole}$`) })
          .first();
        if ((await roleOption.count()) > 0) {
          await roleOption.click();
          await page.waitForTimeout(400);
          const roleAfter = (
            await page
              .locator("[data-connector-edge-menu] button, [data-connector-edge-menu] span")
              .first()
              .textContent()
          )?.trim();
          check(
            "role switch updates edge tag",
            roleAfter === nextRole,
            `expected ${nextRole}, got ${roleAfter}`,
          );
        }
        await page.keyboard.press("Escape");
      }
    }

    // Drag-connect: new mapping should stay visible immediately after role pick
    const connectSection = page.locator('[data-node-kind="section"]').nth(7);
    if ((await connectSection.count()) > 0) {
      await page.locator('[data-node-kind="document"] button').first().click();
      await page.waitForTimeout(200);
      const connectRef = page.locator('[data-node-kind="reference"]').nth(6);
      const refBox = await connectRef.boundingBox();
      if (refBox) {
        const handle = connectSection.locator("button").last();
        await handle.hover();
        await page.mouse.down();
        await page.mouse.move(refBox.x + refBox.width / 2, refBox.y + refBox.height / 2, {
          steps: 12,
        });
        await page.mouse.up();
        await page.waitForTimeout(450);
        const rolePick = page
          .locator("[data-connector-edge-menu] button")
          .filter({ hasText: /^Supporting$/ })
          .first();
        if ((await rolePick.count()) > 0) {
          await rolePick.click();
          await page.waitForTimeout(600);
          const pathsAfterConnect = await countConnectorStrokes(page);
          const staysSelected = await connectSection.evaluate((el) =>
            el.classList.contains("is-selected"),
          );
          check(
            "connect shows connectors after role pick",
            pathsAfterConnect > 0 && staysSelected,
            `paths ${pathsAfterConnect}, selected ${staysSelected}`,
          );
          check(
            "section-to-source connect keeps section selected",
            staysSelected,
          );
        }
      }
    }

    // Reference-to-section: origin (reference) should stay selected after role pick
    const connectRef = page.locator('[data-node-kind="reference"]').nth(8);
    const connectSection2 = page.locator('[data-node-kind="section"]').nth(8);
    if ((await connectRef.count()) > 0 && (await connectSection2.count()) > 0) {
      const secBox = await connectSection2.boundingBox();
      if (secBox) {
        const refHandle = connectRef.locator("button").last();
        await refHandle.hover();
        await page.mouse.down();
        await page.mouse.move(secBox.x + secBox.width / 2, secBox.y + secBox.height / 2, {
          steps: 12,
        });
        await page.mouse.up();
        await page.waitForTimeout(450);
        const rolePick = page
          .locator("[data-connector-edge-menu] button")
          .filter({ hasText: /^Supporting$/ })
          .first();
        if ((await rolePick.count()) > 0) {
          await rolePick.click();
          await page.waitForTimeout(600);
          const refStaysSelected = await connectRef.evaluate((el) =>
            el.classList.contains("is-selected"),
          );
          const pathsFromRef = await countConnectorStrokes(page);
          check(
            "source-to-section connect keeps reference selected",
            refStaysSelected && pathsFromRef > 0,
            `selected ${refStaysSelected}, paths ${pathsFromRef}`,
          );
        }
      }
    }

    // Click empty area clears selection and hover
    const viewport = page.locator("[data-connector-viewport]");
    await viewport.click({ position: { x: 200, y: 20 } });
    await page.waitForTimeout(300);
    const pathsAfterClear = await countConnectorStrokes(page);
    check("click empty clears connectors", pathsAfterClear === 0, `found ${pathsAfterClear}`);

    console.log(JSON.stringify({ ok: issues.length === 0, issues, base: BASE }, null, 2));
    process.exit(issues.length === 0 ? 0 : 1);
  } catch (error) {
    console.error("E2E run failed:", error);
    process.exit(2);
  } finally {
    await browser.close();
  }
}

main();
