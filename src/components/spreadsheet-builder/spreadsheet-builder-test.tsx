import { useEffect, useRef } from "react";
import { createUniver, LocaleType, merge } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/presets/preset-sheets-core";

import "@univerjs/presets/lib/styles/preset-sheets-core.css";

const WORKBOOK_DATA = {
  id: "corevix-invoice-sheet",
  name: "Factura Demo",
  appVersion: "0.25.1",
  locale: LocaleType.EN_US,
  sheets: {
    sheet1: {
      id: "sheet1",
      name: "Factura",
      cellData: {
        0: {
          0: { v: "Corevix CRM - Factura", s: "header" },
        },
        2: {
          0: { v: "Cliente" },
          1: { v: "Cliente Demo SRL" },
        },
        3: {
          0: { v: "Fecha" },
          1: { v: new Date().toLocaleDateString() },
        },
        5: {
          0: { v: "Producto / Servicio" },
          1: { v: "Cantidad" },
          2: { v: "Precio" },
          3: { v: "Total" },
        },
        6: {
          0: { v: "Diseño CRM" },
          1: { v: 1 },
          2: { v: 85000 },
          3: { f: "=B7*C7" },
        },
        7: {
          0: { v: "Automatización" },
          1: { v: 1 },
          2: { v: 25000 },
          3: { f: "=B8*C8" },
        },
        9: {
          2: { v: "Subtotal" },
          3: { f: "=SUM(D7:D8)" },
        },
        10: {
          2: { v: "ITBIS 18%" },
          3: { f: "=D10*0.18" },
        },
        11: {
          2: { v: "Total" },
          3: { f: "=D10+D11" },
        },
      },
      rowCount: 100,
      columnCount: 26,
    },
  },
  sheetOrder: ["sheet1"],
  styles: {
    header: {
      fs: 18,
      bl: 1,
    },
  },
};

export function SpreadsheetBuilderTest() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: merge({}),
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
        }),
      ],
    });

    univerAPI.createWorkbook(WORKBOOK_DATA as any);

    return () => {
      univerAPI.dispose?.();
    };
  }, []);

  return (
    <div className="h-[calc(100vh-88px)] w-full bg-white">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
