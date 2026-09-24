import {
  fileOpen as _fileOpen,
  fileSave as _fileSave,
  supported as nativeFileSystemSupported,
} from "browser-fs-access";

import { MIME_TYPES } from "@excalidraw/common";

import { normalizeFile } from "./blob";

type FILE_EXTENSION = Exclude<keyof typeof MIME_TYPES, "binary">;

/**
 * Manually opens a file via a hidden <input type="file">, bypassing the
 * native File System Access API entirely. Used as a fallback when that API
 * is reported as available but its use is blocked at runtime (e.g. by a
 * device/enterprise policy), which surfaces as a `NotAllowedError` instead
 * of the graceful "unsupported" path browsers without the API take.
 * Mirrors browser-fs-access's own (untyped, so not importable) legacy
 * fallback: 'cancel' rejects with the same AbortError native pickers throw,
 * 'change' resolves with the selected file(s).
 */
const legacyFileOpen = (opts: {
  mimeTypes?: string[];
  extensions?: string[];
  multiple?: boolean;
}): Promise<File | File[]> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = opts.multiple ?? false;
    input.accept = [...(opts.mimeTypes ?? []), ...(opts.extensions ?? [])].join(
      ",",
    );
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("cancel", () => {
      input.remove();
      reject(new DOMException("The user aborted a request.", "AbortError"));
    });
    input.addEventListener("change", () => {
      input.remove();
      resolve(
        input.multiple ? Array.from(input.files ?? []) : input.files![0],
      );
    });
    if ("showPicker" in HTMLInputElement.prototype) {
      (input as any).showPicker();
    } else {
      input.click();
    }
  });
};

export const fileOpen = async <M extends boolean | undefined = false>(opts: {
  extensions?: FILE_EXTENSION[];
  description: string;
  multiple?: M;
}): Promise<M extends false | undefined ? File : File[]> => {
  // an unsafe TS hack, alas not much we can do AFAIK
  type RetType = M extends false | undefined ? File : File[];

  const mimeTypes = opts.extensions?.reduce((mimeTypes, type) => {
    mimeTypes.push(MIME_TYPES[type]);

    return mimeTypes;
  }, [] as string[]);

  const extensions = opts.extensions?.reduce((acc, ext) => {
    if (ext === "jpg") {
      return acc.concat(".jpg", ".jpeg");
    }
    return acc.concat(`.${ext}`);
  }, [] as string[]);

  let files: File | File[];
  try {
    files = await _fileOpen({
      description: opts.description,
      extensions,
      mimeTypes,
      multiple: opts.multiple ?? false,
    });
  } catch (error: any) {
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      // the native picker is blocked at runtime despite being detected as
      // supported — fall back to a plain <input type="file"> instead of
      // failing outright
      files = await legacyFileOpen({
        mimeTypes,
        extensions,
        multiple: opts.multiple,
      });
    } else {
      throw error;
    }
  }

  if (Array.isArray(files)) {
    return (await Promise.all(
      files.map((file) => normalizeFile(file)),
    )) as RetType;
  }
  return (await normalizeFile(files)) as RetType;
};

/**
 * Manually triggers a browser download of the given blob, bypassing the
 * native File System Access API entirely. Used as a fallback when that API
 * is reported as available but its use is blocked at runtime (e.g. by a
 * device/enterprise policy such as Chromium's
 * `DefaultFileSystemReadGuardSetting`), which surfaces as a `NotAllowedError`
 * instead of the graceful "unsupported" path browsers without the API take.
 */
const legacyFileSave = async (
  blob: Blob | Promise<Blob>,
  suggestedName: string,
) => {
  const input = window.prompt("Nom du fichier :", suggestedName);
  if (input === null) {
    // user cancelled, mirror the native picker's cancel behavior
    return null;
  }

  // preserve the extension if the user's edit dropped it, so the file
  // remains recognizable/importable
  const extensionMatch = suggestedName.match(/\.[^./\\]+$/);
  const extension = extensionMatch ? extensionMatch[0] : "";
  const trimmed = input.trim();
  const fileName =
    trimmed === ""
      ? suggestedName
      : extension && !trimmed.endsWith(extension)
        ? `${trimmed}${extension}`
        : trimmed;

  const resolvedBlob = await blob;
  const url = URL.createObjectURL(resolvedBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return null;
};

export const fileSave = async (
  blob: Blob | Promise<Blob>,
  opts: {
    /** supply without the extension */
    name: string;
    /** file extension */
    extension: FILE_EXTENSION;
    mimeTypes?: string[];
    description: string;
    /** existing FileSystemFileHandle */
    fileHandle?: FileSystemFileHandle | null;
  },
) => {
  const fileName = `${opts.name}.${opts.extension}`;

  try {
    return await _fileSave(
      blob,
      {
        fileName,
        description: opts.description,
        extensions: [`.${opts.extension}`],
        mimeTypes: opts.mimeTypes,
      },
      opts.fileHandle,
      false,
    );
  } catch (error: any) {
    if (error?.name === "AbortError") {
      // user cancelled the native picker — same no-op as upstream
      return null;
    }
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      // the native picker is blocked at runtime despite being detected as
      // supported — fall back to a plain download instead of failing
      return legacyFileSave(blob, fileName);
    }
    throw error;
  }
};

export { nativeFileSystemSupported };
