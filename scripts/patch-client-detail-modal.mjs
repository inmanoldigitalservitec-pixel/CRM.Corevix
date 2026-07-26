import fs from "node:fs";

const file = "src/routes/clients.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

// Remove the Sheet imports. Dialog primitives are already imported in this route.
source = source.replace(
  /import \{\s*Sheet,\s*SheetContent,\s*SheetDescription,\s*SheetHeader,\s*SheetTitle,\s*\} from "@\/components\/ui\/sheet";\n/m,
  "",
);

replaceOnce(
  `      <Sheet\n        open={!!selectedClient}\n        onOpenChange={(open) => {\n          if (!open) closeClientDetail();\n        }}\n      >`,
  `      <Dialog\n        open={!!selectedClient}\n        onOpenChange={(open) => {\n          if (!open) closeClientDetail();\n        }}\n      >`,
  "apertura del panel de cliente",
);

replaceOnce(
  `        <SheetContent\n          data-demo="client-360-panel"\n          side="right"\n          className="!inset-0 !h-[100dvh] !w-screen !max-w-none border-0 bg-white p-0 shadow-none"\n        >`,
  `        <DialogContent\n          data-demo="client-360-panel"\n          className="flex h-[94dvh] w-[calc(100vw-24px)] max-w-[1180px] flex-col gap-0 overflow-hidden rounded-none border border-slate-200 bg-white p-0 shadow-2xl sm:rounded-xl [&>button.absolute.right-4.top-4]:z-20 [&>button.absolute.right-4.top-4]:rounded-none [&>button.absolute.right-4.top-4]:border-b [&>button.absolute.right-4.top-4]:border-slate-200 [&>button.absolute.right-4.top-4]:bg-white"\n        >`,
  "contenedor modal del cliente",
);

source = source
  .replaceAll("<SheetHeader", "<DialogHeader")
  .replaceAll("</SheetHeader>", "</DialogHeader>")
  .replaceAll("<SheetTitle", "<DialogTitle")
  .replaceAll("</SheetTitle>", "</DialogTitle>")
  .replaceAll("<SheetDescription", "<DialogDescription")
  .replaceAll("</SheetDescription>", "</DialogDescription>")
  .replaceAll("</SheetContent>", "</DialogContent>")
  .replaceAll("</Sheet>", "</Dialog>");

// Adapt viewport calculations from true fullscreen to the modal workspace height.
source = source
  .replaceAll("lg:h-[calc(100dvh-122px)]", "lg:h-[calc(94dvh-122px)]")
  .replaceAll("lg:h-[calc(100dvh-122px)]", "lg:h-[calc(94dvh-122px)]");

fs.writeFileSync(file, source);
console.log("✓ Panel 360 de clientes convertido en ventana modal centrada.");
