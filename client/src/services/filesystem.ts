import { platform } from "@tauri-apps/plugin-os";
import {
  exists,
  mkdir,
  writeTextFile as fsWriteText,
  readTextFile as fsReadText,
} from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import {
  AndroidFs,
  AndroidPublicGeneralPurposeDir,
  type AndroidFsUri,
} from "tauri-plugin-android-fs-api";

export type { AndroidFsUri } from "tauri-plugin-android-fs-api";

export type FolderRef = {
  path: string;
  uri: AndroidFsUri | null;
};

export interface FsService {
  /**
   * Save a text file to the given folder.
   * On desktop with `deduplicate: true`, auto-increments trailing index to avoid overwrites.
   * Returns the resulting file path or URI string.
   */
  saveTextFile(params: {
    folder: FolderRef;
    fileName: string;
    content: string;
    mimeType?: string;
    subfolder?: string;
    deduplicate?: boolean;
  }): Promise<string>;

  /**
   * Open a folder picker dialog.
   * Returns the selected folder or null if cancelled.
   * On Android, automatically persists the URI permission.
   */
  pickFolder(): Promise<FolderRef | null>;

  /**
   * Initialize and validate the save folder.
   * If the current folder is invalid or empty, returns a sensible platform default.
   */
  initDefaultFolder(current: FolderRef): Promise<FolderRef>;

  /**
   * Read a text file by name from the given folder.
   * Returns null if the file does not exist.
   */
  readTextFile(params: {
    folder: FolderRef;
    fileName: string;
  }): Promise<string | null>;

  /**
   * Create or overwrite a text file by name in the given folder.
   * On Android picked dirs, finds and overwrites an existing file with the same name.
   * Returns the resulting file path or URI string.
   */
  writeTextFile(params: {
    folder: FolderRef;
    fileName: string;
    content: string;
    mimeType?: string;
  }): Promise<string>;
}

// ─── Desktop implementation ─────────────────────────────────────────────────

class DesktopFsService implements FsService {
  async saveTextFile({
    folder,
    fileName,
    content,
    deduplicate = false,
  }: {
    folder: FolderRef;
    fileName: string;
    content: string;
    mimeType?: string;
    subfolder?: string;
    deduplicate?: boolean;
  }): Promise<string> {
    if (!(await exists(folder.path))) {
      await mkdir(folder.path, { recursive: true });
    }

    let filePath: string;
    if (deduplicate) {
      filePath = await this.findAvailableFilePath(folder.path, fileName);
    } else {
      filePath = await join(folder.path, fileName);
    }

    await fsWriteText(filePath, content);
    return filePath;
  }

  async readTextFile({
    folder,
    fileName,
  }: {
    folder: FolderRef;
    fileName: string;
  }): Promise<string | null> {
    const filePath = await join(folder.path, fileName);
    if (!(await exists(filePath))) return null;
    return fsReadText(filePath);
  }

  async writeTextFile({
    folder,
    fileName,
    content,
  }: {
    folder: FolderRef;
    fileName: string;
    content: string;
    mimeType?: string;
  }): Promise<string> {
    if (!(await exists(folder.path))) {
      await mkdir(folder.path, { recursive: true });
    }
    const filePath = await join(folder.path, fileName);
    await fsWriteText(filePath, content);
    return filePath;
  }

  async pickFolder(): Promise<FolderRef | null> {
    const folderPath = await open({ multiple: false, directory: true });
    if (!folderPath) return null;
    return { path: folderPath, uri: null };
  }

  async initDefaultFolder(current: FolderRef): Promise<FolderRef> {
    if (current.path && current.path !== "" && (await exists(current.path))) {
      return current;
    }

    const documentPath = await documentDir();
    const savePath = await join(documentPath, "Measurements");
    if (!(await exists(savePath))) {
      await mkdir(savePath);
    }
    return { path: savePath, uri: null };
  }

  /**
   * Find the next available file path by incrementing a trailing numeric index.
   * Given "base-1.csv", tries "base-1.csv", "base-2.csv", etc.
   */
  private async findAvailableFilePath(
    folderPath: string,
    fileName: string
  ): Promise<string> {
    const match = fileName.match(/^(.+)-(\d+)(\.[^.]+)$/);
    if (!match) {
      return join(folderPath, fileName);
    }

    const [, base, , ext] = match;
    let index = 1;
    while (true) {
      const candidate = `${base}-${index}${ext}`;
      const candidatePath = await join(folderPath, candidate);
      if (!(await exists(candidatePath))) {
        return candidatePath;
      }
      index++;
    }
  }
}

// ─── Android implementation ─────────────────────────────────────────────────

function isPublicDir(path: string): path is AndroidPublicGeneralPurposeDir {
  return (
    path === AndroidPublicGeneralPurposeDir.Documents ||
    path === AndroidPublicGeneralPurposeDir.Download
  );
}

class AndroidFsService implements FsService {
  async saveTextFile({
    folder,
    fileName,
    content,
    mimeType = "text/plain",
    subfolder,
  }: {
    folder: FolderRef;
    fileName: string;
    content: string;
    mimeType?: string;
    subfolder?: string;
    deduplicate?: boolean;
  }): Promise<string> {
    if (isPublicDir(folder.path)) {
      const relativePath = subfolder ? `${subfolder}/${fileName}` : fileName;
      const fileUri = await AndroidFs.createNewPublicFile(
        folder.path,
        relativePath,
        mimeType
      );
      await AndroidFs.writeTextFile(fileUri, content);
      await AndroidFs.scanPublicFile(fileUri).catch(() => {});
      return fileUri.uri;
    }

    if (folder.path.startsWith("content://")) {
      if (!folder.uri?.uri) {
        throw new Error(
          "Android folder permission metadata is missing. Re-select the folder in Settings."
        );
      }
      const fileUri = await AndroidFs.createNewFile(
        folder.uri,
        fileName,
        mimeType
      );
      await AndroidFs.writeTextFile(fileUri, content);
      return fileUri.uri;
    }

    throw new Error(`Unsupported Android folder path: ${folder.path}`);
  }

  async readTextFile({
    folder,
    fileName,
  }: {
    folder: FolderRef;
    fileName: string;
  }): Promise<string | null> {
    if (!folder.uri) return null;

    try {
      const entries = await AndroidFs.readDir(folder.uri);
      const file = entries.find(
        (e) => e.type === "File" && e.name === fileName
      );
      if (!file) return null;
      return AndroidFs.readTextFile(file.uri);
    } catch {
      return null;
    }
  }

  async writeTextFile({
    folder,
    fileName,
    content,
    mimeType = "text/csv",
  }: {
    folder: FolderRef;
    fileName: string;
    content: string;
    mimeType?: string;
  }): Promise<string> {
    if (isPublicDir(folder.path)) {
      const fileUri = await AndroidFs.createNewPublicFile(
        folder.path,
        fileName,
        mimeType
      );
      await AndroidFs.writeTextFile(fileUri, content);
      await AndroidFs.scanPublicFile(fileUri).catch(() => {});
      return fileUri.uri;
    }

    if (folder.path.startsWith("content://") && folder.uri) {
      try {
        const entries = await AndroidFs.readDir(folder.uri);
        const existing = entries.find(
          (e) => e.type === "File" && e.name === fileName
        );
        if (existing) {
          await AndroidFs.writeTextFile(existing.uri, content);
          return existing.uri.uri;
        }
      } catch {
        /* fall through to create */
      }

      const fileUri = await AndroidFs.createNewFile(
        folder.uri,
        fileName,
        mimeType
      );
      await AndroidFs.writeTextFile(fileUri, content);
      return fileUri.uri;
    }

    throw new Error(`Unsupported Android folder path: ${folder.path}`);
  }

  async pickFolder(): Promise<FolderRef | null> {
    const res = await AndroidFs.showOpenDirPicker();
    if (!res) return null;
    
    //await AndroidFs.releaseAllPersistedPickerUriPermissions();
    await AndroidFs.persistPickerUriPermission(res);
    return { path: res.uri, uri: res };
  }

  async initDefaultFolder(current: FolderRef): Promise<FolderRef> {
    if (current.path.startsWith("content://") && !current.uri) {
      return { path: AndroidPublicGeneralPurposeDir.Documents, uri: null };
    }

    const isValid =
      current.path.startsWith("content://") ||
      current.path === AndroidPublicGeneralPurposeDir.Documents ||
      current.path === AndroidPublicGeneralPurposeDir.Download;

    if (!isValid) {
      return { path: AndroidPublicGeneralPurposeDir.Documents, uri: null };
    }

    return current;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _instance: FsService | null = null;

export function getFs(): FsService {
  if (!_instance) {
    _instance =
      platform() === "android"
        ? new AndroidFsService()
        : new DesktopFsService();
  }
  return _instance;
}
