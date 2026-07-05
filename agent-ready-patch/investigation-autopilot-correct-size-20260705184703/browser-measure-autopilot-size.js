// Pega esto en la consola del navegador con el dashboard abierto.
// No modifica nada. Mide el contenido real y calcula el h correcto del grid.

(() => {
  const agent = document.querySelector(".agent-command-widget");
  const gridItem = agent?.closest(".react-grid-item");
  const grid = document.querySelector(".react-grid-layout");
  const mainCard = document.querySelector(".agent-main-card");
  const reviewMode = document.querySelector(".agent-review-mode");
  const top = document.querySelector(".agent-widget-top");
  const headline = document.querySelector(".agent-headline");
  const eventShell = document.querySelector(".agent-event-shell");

  const rowHeight = 92;
  const marginY = 10;

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      x: Math.round(r.x),
      y: Math.round(r.y),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
    };
  }

  function metrics(el) {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      rect: rect(el),
      scrollWidth: el.scrollWidth,
      scrollHeight: el.scrollHeight,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      offsetWidth: el.offsetWidth,
      offsetHeight: el.offsetHeight,
      css: {
        display: s.display,
        position: s.position,
        width: s.width,
        height: s.height,
        minHeight: s.minHeight,
        maxHeight: s.maxHeight,
        overflow: s.overflow,
        padding: s.padding,
        margin: s.margin,
        boxSizing: s.boxSizing,
      },
      styleAttr: el.getAttribute("style"),
      className: String(el.className),
    };
  }

  function rowsNeeded(pixelHeight) {
    // React Grid Layout height formula:
    // px = rowHeight * h + marginY * (h - 1)
    // h = ceil((px + marginY) / (rowHeight + marginY))
    return Math.ceil((pixelHeight + marginY) / (rowHeight + marginY));
  }

  const agentMetrics = metrics(agent);
  const gridItemMetrics = metrics(gridItem);
  const gridMetrics = metrics(grid);
  const mainCardMetrics = metrics(mainCard);
  const reviewModeMetrics = metrics(reviewMode);
  const topMetrics = metrics(top);
  const headlineMetrics = metrics(headline);
  const eventShellMetrics = metrics(eventShell);

  const desiredContentHeight = Math.max(
    agent?.scrollHeight || 0,
    agent?.offsetHeight || 0,
    agentMetrics?.rect?.height || 0
  );

  const desiredRows = rowsNeeded(desiredContentHeight);
  const desiredRowsWithBreathingRoom = rowsNeeded(desiredContentHeight + 24);

  const currentGridItemHeight = gridItemMetrics?.rect?.height || 0;
  const currentRowsApprox = rowsNeeded(currentGridItemHeight);

  console.log("===== AUTOPILOT SIZE DIAGNOSTIC =====");

  console.table({
    agent_rect_h: agentMetrics?.rect?.height,
    agent_scroll_h: agentMetrics?.scrollHeight,
    agent_offset_h: agentMetrics?.offsetHeight,
    grid_item_h: gridItemMetrics?.rect?.height,
    grid_item_w: gridItemMetrics?.rect?.width,
    main_card_h: mainCardMetrics?.rect?.height,
    review_mode_h: reviewModeMetrics?.rect?.height,
    top_h: topMetrics?.rect?.height,
    headline_h: headlineMetrics?.rect?.height,
    event_shell_h: eventShellMetrics?.rect?.height,
    desired_content_px: desiredContentHeight,
    desired_rows_exact: desiredRows,
    desired_rows_plus_24px: desiredRowsWithBreathingRoom,
    current_rows_approx: currentRowsApprox,
  });

  console.log("agent", agentMetrics);
  console.log("gridItem", gridItemMetrics);
  console.log("grid", gridMetrics);
  console.log("mainCard", mainCardMetrics);
  console.log("reviewMode", reviewModeMetrics);
  console.log("top", topMetrics);
  console.log("headline", headlineMetrics);
  console.log("eventShell", eventShellMetrics);

  console.log("RECOMMENDATION:");
  console.log({
    lg: {
      w_6_height_px: desiredRowsWithBreathingRoom * rowHeight + (desiredRowsWithBreathingRoom - 1) * marginY,
      suggested_h: desiredRowsWithBreathingRoom,
      suggested_w: 6,
    },
    note: "Si el contenido se corta, usa suggested_h. Si queda mucho espacio, usa desired_rows_exact.",
  });
})();
