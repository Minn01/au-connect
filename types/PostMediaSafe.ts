// types/PostMediaSafe.ts

export type PostMediaSafe = {
  blobName: string;
  thumbnailBlobName?: string;
  type: string;
  name: string;
  mimetype: string;
  size: number;

  url: string;
  thumbnailUrl?: string;
};