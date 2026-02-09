import { useUploadStore } from "@/lib/stores/uploadStore";
import { uploadFile } from "@/app/profile/utils/uploadMedia";
import { handleCreatePost } from "@/app/profile/utils/fetchfunctions";
import { editPost } from "@/app/profile/utils/fetchfunctions";

let invalidatePostsFn: (() => void) | null = null;

export function setInvalidatePosts(fn: () => void) {
  invalidatePostsFn = fn;
  console.log("✅ invalidatePostsFn set");
}

function invalidatePostsSafe() {
  if (invalidatePostsFn) {
    invalidatePostsFn();
  } else {
    console.warn("⚠️ invalidatePostsFn not set yet");
  }
}

export async function processUpload(jobId: string) {
  const store = useUploadStore.getState();
  const job = store.jobs.find((j) => j.id === jobId);

  if (!job) {
    console.log("❌ Job not found:", jobId);
    return;
  }

  console.log("🚀 Starting upload for job:", jobId);

  try {
    store.updateJobStatus(jobId, "uploading");

    // Upload media files
    const uploadedMedia = await Promise.all(
      job.media
        .filter((item): item is typeof item & { file: File } => !!item.file)
        .map(async (item, index) => {
          const { blobName, thumbnailBlobName } = await uploadFile(item.file);
          if (!blobName) throw new Error("Upload failed");

          const total = job.media.length || 1;
          const progress = Math.floor(((index + 1) / total) * 80);
          store.updateJobProgress(jobId, progress);

          return {
            blobName,
            thumbnailBlobName,
            type: item.type,
            name: item.file.name,
            mimetype: item.file.type,
            size: item.file.size,
          };
        }),
    );

    console.log("✅ Media uploaded:", uploadedMedia);

    store.updateJobProgress(jobId, 90);

    // Create post
    const createdPost = await handleCreatePost(
      job.postType,
      job.title,
      job.content,
      job.visibility,
      job.disableComments,
      uploadedMedia,
      () => {},
      job.links,
      job.pollOptions,
      job.pollDuration,
    );

    console.log("✅ Post created:", createdPost);

    store.updateJobProgress(jobId, 100);
    store.updateJobStatus(jobId, "complete");

    invalidatePostsSafe();

    setTimeout(() => store.removeJob(jobId), 3000);
  } catch (error) {
    console.error("❌ Upload failed:", error);
    store.setJobError(
      jobId,
      error instanceof Error ? error.message : "Upload failed",
    );
  }
}

// edit post job function
export async function processEdit(jobId: string) {
  const store = useUploadStore.getState();
  const job = store.jobs.find((j) => j.id === jobId);

  if (!job || !job.isEdit || !job.postId) return;

  try {
    store.updateJobStatus(jobId, "uploading");

    const uploadedNewMedia = await Promise.all(
      job.media
        .filter((item): item is typeof item & { file: File } => !!item.file)
        .map(async (item) => {
          const uploadResult = await uploadFile(item.file);

          return {
            blobName: uploadResult.blobName,
            thumbnailBlobName: uploadResult.thumbnailBlobName,
            type: item.type,
            name: item.file.name,
            mimetype: item.file.type,
            size: item.file.size,
          };
        }),
    );

    store.updateJobProgress(jobId, 90);

    if (!job.existingMedia) {
      throw new Error("Edit job missing existingMedia");
    }

    const finalMedia = [
      ...job.existingMedia.map((m) => ({
        blobName: m.blobName,
        thumbnailBlobName: m.thumbnailBlobName ?? null,
        type: m.type,
        name: m.name,
        mimetype: m.mimetype,
        size: m.size,
      })),
      ...uploadedNewMedia.filter(Boolean),
    ];
    await editPost({
      postId: job.postId,
      data: {
        postType: job.postType,
        title: job.title,
        content: job.content,
        visibility: job.visibility,
        commentsDisabled: job.disableComments,
        links: job.links,
        media: finalMedia,
        ...(job.postType === "poll" && {
          pollOptions: job.pollOptions,
          pollDuration: job.pollDuration,
        }),
      },
    });

    store.updateJobProgress(jobId, 100);
    store.updateJobStatus(jobId, "complete");

    invalidatePostsSafe();

    setTimeout(() => store.removeJob(jobId), 3000);
  } catch (err) {
    store.setJobError(jobId, "Edit failed");
  }
}
