export type LeadFolderRecord = {
  drive_folder_id: string | null;
  drive_folder_url: string | null;
};

export type DriveFolderCandidate = {
  id: string;
  webViewLink?: string | null;
  created: boolean;
};

type Result = {
  data: LeadFolderRecord | null;
  error: { message: string } | null;
};

export async function persistLeadDriveFolder(args: {
  folder: DriveFolderCandidate;
  saveIfMissing: () => Promise<Result>;
  readCurrent: () => Promise<Result>;
  deleteFolder: (id: string) => Promise<void>;
  warn?: (message: string, details: { folderId: string; error: string }) => void;
}): Promise<{ id: string; webViewLink?: string }> {
  const { data: saved, error: saveError } = await args.saveIfMissing();
  if (saveError)
    throw new Error(`No se pudo guardar la carpeta del prospecto: ${saveError.message}`);
  if (saved?.drive_folder_id) {
    return {
      id: String(saved.drive_folder_id),
      webViewLink: String(saved.drive_folder_url || ""),
    };
  }

  const { data: current, error: readError } = await args.readCurrent();
  if (readError)
    throw new Error(`No se pudo confirmar la carpeta del prospecto: ${readError.message}`);
  if (!current?.drive_folder_id)
    throw new Error("No se pudo guardar ni recuperar la carpeta del prospecto.");

  if (args.folder.created && String(current.drive_folder_id) !== args.folder.id) {
    try {
      await args.deleteFolder(args.folder.id);
    } catch (error) {
      args.warn?.("Duplicate lead folder cleanup failed", {
        folderId: args.folder.id,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    id: String(current.drive_folder_id),
    webViewLink: String(current.drive_folder_url || ""),
  };
}
