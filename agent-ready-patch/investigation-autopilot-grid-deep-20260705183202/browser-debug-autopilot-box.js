// Pega esto en la consola del navegador estando en el dashboard.
// No modifica nada. Solo imprime medidas reales del widget y del grid item.

(() => {
  const agent = document.querySelector(".agent-command-widget");
  const gridItem =
    agent?.closest(".react-grid-item") ||
    agent?.closest("[class*='react-grid-item']");

  const shell =
    agent?.closest(".relative.min-h-0") ||
    agent?.closest("[class*='min-h-0']");

  const grip =
    gridItem?.querySelector(".dashboard-widget-drag-grip") ||
    document.querySelector(".dashboard-widget-drag-grip");

  const grid = document.querySelector(".react-grid-layout");

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
    };
  }

  function stylePick(el) {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      display: s.display,
      position: s.position,
      width: s.width,
      height: s.height,
      minWidth: s.minWidth,
      minHeight: s.minHeight,
      maxWidth: s.maxWidth,
      maxHeight: s.maxHeight,
      overflow: s.overflow,
      transform: s.transform,
      padding: s.padding,
      margin: s.margin,
    };
  }

  function attrs(el) {
    if (!el) return null;
    return {
      className: el.className,
      style: el.getAttribute("style"),
      dataGrid: el.getAttribute("data-grid"),
    };
  }

  console.table({
    agent_width: rect(agent)?.width,
    agent_height: rect(agent)?.height,
    grid_item_width: rect(gridItem)?.width,
    grid_item_height: rect(gridItem)?.height,
    shell_width: rect(shell)?.width,
    shell_height: rect(shell)?.height,
    grid_width: rect(grid)?.width,
    grid_height: rect(grid)?.height,
  });

  console.log("agent", { rect: rect(agent), style: stylePick(agent), attrs: attrs(agent) });
  console.log("gridItem", { rect: rect(gridItem), style: stylePick(gridItem), attrs: attrs(gridItem) });
  console.log("shell", { rect: rect(shell), style: stylePick(shell), attrs: attrs(shell) });
  console.log("grip", { rect: rect(grip), style: stylePick(grip), attrs: attrs(grip) });
  console.log("grid", { rect: rect(grid), style: stylePick(grid), attrs: attrs(grid) });

  const allGridItems = [...document.querySelectorAll(".react-grid-item")].map((el, index) => ({
    index,
    rect: rect(el),
    style: el.getAttribute("style"),
    text: el.textContent?.trim().slice(0, 80),
  }));

  console.table(allGridItems);
})();
