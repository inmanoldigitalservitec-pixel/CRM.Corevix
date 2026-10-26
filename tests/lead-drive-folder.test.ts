import assert from "node:assert/strict";
import test from "node:test";
import { persistLeadDriveFolder } from "../supabase/functions/_shared/lead-drive-folder.ts";

test("persists and returns the lead folder when there is no concurrent upload", async () => {
  let reads = 0;
  const result = await persistLeadDriveFolder({
    folder: { id: "folder-new", webViewLink: "https://drive/folder-new", created: true },
    saveIfMissing: async () => ({
      data: { drive_folder_id: "folder-new", drive_folder_url: "https://drive/folder-new" },
      error: null,
    }),
    readCurrent: async () => {
      reads += 1;
      return { data: null, error: null };
    },
    deleteFolder: async () => assert.fail("must not delete the winning folder"),
  });

  assert.deepEqual(result, { id: "folder-new", webViewLink: "https://drive/folder-new" });
  assert.equal(reads, 0);
});

test("reuses the concurrent winner and deletes only this request's newly created duplicate", async () => {
  const deleted: string[] = [];
  const result = await persistLeadDriveFolder({
    folder: { id: "folder-loser", webViewLink: "https://drive/folder-loser", created: true },
    saveIfMissing: async () => ({ data: null, error: null }),
    readCurrent: async () => ({
      data: { drive_folder_id: "folder-winner", drive_folder_url: "https://drive/folder-winner" },
      error: null,
    }),
    deleteFolder: async (id) => void deleted.push(id),
  });

  assert.deepEqual(result, { id: "folder-winner", webViewLink: "https://drive/folder-winner" });
  assert.deepEqual(deleted, ["folder-loser"]);
});

test("never deletes a pre-existing folder when another upload wins", async () => {
  const deleted: string[] = [];
  const result = await persistLeadDriveFolder({
    folder: { id: "folder-existing", created: false },
    saveIfMissing: async () => ({ data: null, error: null }),
    readCurrent: async () => ({
      data: { drive_folder_id: "folder-winner", drive_folder_url: null },
      error: null,
    }),
    deleteFolder: async (id) => void deleted.push(id),
  });

  assert.deepEqual(result, { id: "folder-winner", webViewLink: "" });
  assert.deepEqual(deleted, []);
});

test("surfaces database errors instead of silently losing the folder association", async () => {
  await assert.rejects(
    persistLeadDriveFolder({
      folder: { id: "folder-new", created: true },
      saveIfMissing: async () => ({ data: null, error: { message: "permission denied" } }),
      readCurrent: async () => ({ data: null, error: null }),
      deleteFolder: async () => undefined,
    }),
    /No se pudo guardar la carpeta del prospecto: permission denied/,
  );
});
