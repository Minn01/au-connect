import { MEDIA_UPLOAD_API_PATH } from "@/lib/constants";

export async function uploadFile(file: File) {
    console.log("upload media is being called")
  // 1. Ask your server for a SAS upload URL
  const res = await fetch(MEDIA_UPLOAD_API_PATH, {
    method: "POST",
  });

  const { uploadUrl, blobName } = await res.json();

  if (!uploadUrl) {
    throw new Error("No upload URL returned");
  }

  if (!blobName) {
    throw new Error("No blobName returned; file name missing");
  }

  // 2. Upload DIRECTLY to Azure
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type,
    },
    body: file,
  });
    console.log("STEP 4")

  if (!uploadRes.ok) {
    throw new Error("Azure upload failed");
  }

  // 3. Return the blob name or file name
  return blobName;
}