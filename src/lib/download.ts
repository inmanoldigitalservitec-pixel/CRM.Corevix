export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function buildCsv(
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string }>,
) {
  return [
    columns.map((column) => escapeCsvCell(column.label)).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column.key])).join(",")),
  ].join("\n");
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string }>,
) {
  downloadTextFile(filename, buildCsv(rows, columns), "text/csv;charset=utf-8;");
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}
