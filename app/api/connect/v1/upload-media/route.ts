import { NextRequest, NextResponse } from "next/server";
import {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

import { getHeaderUserInfo } from "@/lib/authFunctions";
import { AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME } from "@/lib/env";

export async function POST(req: NextRequest) {
  const [userEmail, userId] = getHeaderUserInfo(req);

  if (!userEmail || !userId) {
    return NextResponse.json(
      { error: "Unauthorized action please sign in again" },
      { status: 401 }
    );
  }

  try {
    const accountName = AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = AZURE_STORAGE_CONTAINER_NAME;

    const fileName = `${crypto.randomUUID()}.jpg`;

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: fileName,
        permissions: BlobSASPermissions.parse("cw"), // create + write
        expiresOn: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
      sharedKeyCredential
    ).toString();

    const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}?${sasToken}`;

    return NextResponse.json({ uploadUrl: uploadUrl, blobName: fileName });
  } catch (err) {
    console.log(
      err instanceof Error
        ? err.message
        : "Something went wrong while trying to upload image"
    );
  }
}
