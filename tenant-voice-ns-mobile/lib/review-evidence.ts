// Optional proof a reviewer can attach: photos or screenshots, such as a
// picture of the problem or a message about a repair. Evidence is never
// shown publicly. It is stored privately, readable only by the moderator,
// and is deleted along with its review.
//
// The browser shrinks and re-encodes every picture as a JPEG before it is
// sent. That keeps requests small and also drops metadata such as GPS
// location and camera details. The server checks the same limits again.

export const MAX_EVIDENCE_FILES = 3;

// Largest picture, in bytes, after the browser has shrunk it.
export const MAX_EVIDENCE_BYTES = 400_000;

export const EVIDENCE_MIME_TYPE = "image/jpeg";

export type EvidenceUpload = {
  mimeType: typeof EVIDENCE_MIME_TYPE;
  // The picture's bytes, base64-encoded.
  data: string;
};

const MAX_DIMENSION = 1600;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.46];
const SCALE_STEPS = [1, 0.75, 0.55];

// Runs in the browser only. Resolves with a JPEG under MAX_EVIDENCE_BYTES,
// or rejects if the picture can't be read or won't shrink enough.
export async function prepareEvidenceImage(file: File): Promise<EvidenceUpload> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only pictures can be attached.");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("We couldn’t read that picture. Try a JPEG or PNG.");
  });

  try {
    const baseScale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );

    for (const step of SCALE_STEPS) {
      const width = Math.max(1, Math.round(bitmap.width * baseScale * step));
      const height = Math.max(1, Math.round(bitmap.height * baseScale * step));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("We couldn’t process that picture.");
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, EVIDENCE_MIME_TYPE, quality)
        );
        if (blob && blob.size <= MAX_EVIDENCE_BYTES) {
          return {
            mimeType: EVIDENCE_MIME_TYPE,
            data: await blobToBase64(blob),
          };
        }
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error("That picture is too large to attach. Try a smaller one.");
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}
