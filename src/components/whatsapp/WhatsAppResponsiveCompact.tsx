import { useEffect } from "react";

function injectResponsiveStyles() {
  const previous = document.getElementById("corevix-wa-responsive-compact");
  if (previous) previous.remove();

  const style = document.createElement("style");
  style.id = "corevix-wa-responsive-compact";
  style.textContent = `
    /* Corevix WhatsApp responsive compact layer */
    [data-corevix-wa-grid="true"] {
      height: calc(100vh - 72px) !important;
      overflow: hidden !important;
    }

    [data-corevix-wa-grid="true"] > * {
      min-width: 0 !important;
    }

    [data-corevix-wa-panel="true"] {
      min-width: 0 !important;
      padding: 10px !important;
      gap: 8px !important;
    }

    [data-corevix-wa-panel="true"] section {
      padding: 10px !important;
      border-radius: 16px !important;
      margin-bottom: 8px !important;
    }

    [data-corevix-wa-panel="true"] h3,
    [data-corevix-wa-panel="true"] h4 {
      font-size: 13px !important;
      line-height: 1.15 !important;
    }

    [data-corevix-wa-panel="true"] p {
      font-size: 10.5px !important;
      line-height: 1.3 !important;
    }

    [data-corevix-wa-main-button="true"],
    [data-corevix-wa-button="true"] {
      height: 32px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
      padding-left: 8px !important;
      padding-right: 8px !important;
    }

    [data-corevix-wa-doc-helper="true"],
    [data-corevix-wa-empty-doc-helper="true"] {
      padding: 6px 8px !important;
      font-size: 10px !important;
      line-height: 1.25 !important;
    }

    [data-whatsapp-quick-replies-slot] section,
    [data-whatsapp-task-slot] section {
      padding: 10px !important;
    }

    [data-whatsapp-operational-filters-slot] {
      margin-bottom: 6px !important;
    }

    [data-whatsapp-operational-filters-slot] > div {
      padding: 7px !important;
      border-radius: 14px !important;
    }

    [data-corevix-wa-channel-row="true"] {
      gap: 5px !important;
      margin-bottom: 6px !important;
    }

    [data-corevix-wa-channel-button="true"] {
      height: 29px !important;
      padding: 0 9px !important;
      font-size: 11px !important;
    }

    [data-corevix-wa-next="true"] {
      padding: 8px 10px !important;
      border-radius: 16px !important;
      overflow: hidden !important;
    }

    [data-corevix-wa-next="true"] > div:first-child {
      display: grid !important;
      grid-template-columns: minmax(0,1fr) 108px !important;
      align-items: center !important;
      gap: 8px !important;
    }

    [data-corevix-wa-next="true"] [data-corevix-wa-main-button="true"] {
      width: 108px !important;
      min-width: 108px !important;
      height: 30px !important;
    }

    @media (min-width: 1500px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: minmax(340px,380px) minmax(0,1fr) minmax(285px,310px) !important;
      }
    }

    @media (min-width: 1280px) and (max-width: 1499px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: minmax(300px,340px) minmax(0,1fr) 276px !important;
      }
      [data-corevix-wa-panel="true"] {
        display: block !important;
      }
      [data-corevix-wa-panel="true"] section {
        padding: 9px !important;
      }
    }

    @media (min-width: 1120px) and (max-width: 1279px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: 292px minmax(0,1fr) 252px !important;
      }
      [data-corevix-wa-panel="true"] {
        display: block !important;
        padding: 8px !important;
      }
      [data-corevix-wa-panel="true"] section {
        padding: 8px !important;
        border-radius: 14px !important;
      }
      [data-corevix-wa-doc-helper="true"] {
        display: none !important;
      }
      [data-whatsapp-quick-replies-slot] p {
        display: none !important;
      }
    }

    @media (min-width: 960px) and (max-width: 1119px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: 286px minmax(0,1fr) !important;
      }
      [data-corevix-wa-panel="true"] {
        display: none !important;
      }
    }

    @media (min-width: 761px) and (max-width: 959px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: 280px minmax(0,1fr) !important;
      }
      [data-corevix-wa-panel="true"] {
        display: none !important;
      }
      [data-corevix-wa-channel-row="true"] {
        overflow-x: auto !important;
      }
    }

    @media (max-width: 760px) {
      [data-corevix-wa-grid="true"] {
        grid-template-columns: 1fr !important;
      }
      [data-corevix-wa-panel="true"] {
        display: none !important;
      }
      [data-corevix-wa-grid="true"] > section,
      [data-corevix-wa-grid="true"] > main {
        min-width: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function markWhatsappGridFallback() {
  const grid = document.querySelector<HTMLElement>('div[class*="grid-cols-[76px_390px"]');
  if (grid) grid.dataset.corevixWaGrid = "true";
}

export function WhatsAppResponsiveCompact() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        injectResponsiveStyles();
        markWhatsappGridFallback();
      });
    };
    run();
    window.addEventListener("resize", run);
    const timer = window.setTimeout(run, 600);
    return () => {
      window.clearTimeout(timer);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", run);
      document.getElementById("corevix-wa-responsive-compact")?.remove();
    };
  }, []);

  return null;
}
