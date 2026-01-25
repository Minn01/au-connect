// types/ProfilePicCrop.ts

export type ProfilePicCrop = {
  zoom: number; // e.g. 1 - 3

  // drag position used by crop UI libs (like react-easy-crop)
  crop: {
    x: number;
    y: number;
  };

  // final crop area in pixels (used to generate 512x512 output via canvas)
  croppedAreaPixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};
