import { NextResponse, NextRequest } from "next/server";

import {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/lib/env";
import { getHeaderUserInfo } from "@/lib/authFunctions";

export async function GET(req: NextRequest) {
  const [userEmail, userId] = getHeaderUserInfo(req);

  if (!userEmail || !userId) {
    return NextResponse.json(
      { error: "Unauthorized action please sign in again" },
      { status: 401 }
    );
  }

  const blobName = req.nextUrl.searchParams.get('blobName')

  if (!blobName) {
    return NextResponse.json(
      { error: "Internal Server error; failed to receive blob/file name" },
      { status: 400 }
    );
  }

  try {
    const accountName = AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = AZURE_STORAGE_CONTAINER_NAME;

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse("r"), //  read
        expiresOn: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
      sharedKeyCredential
    ).toString();

    const signedurl=`https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
    return NextResponse.json({
        url: signedurl
    })

  } catch (err) {
    console.log(
      err instanceof Error
        ? err.message
        : "Something went wrong while trying to upload image"
    );
  }
}
