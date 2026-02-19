export type PostMediaResolved = {
  blobName: string;
  thumbnailBlobName?: string;
  url: string; // REQUIRED
  type: string;
  mimetype?: string;
  size?: number;
  name?: string;
};