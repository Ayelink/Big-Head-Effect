import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

interface DetectionResult {
  headBox: { x: number; y: number; width: number; height: number };
  imageWidth: number;
  imageHeight: number;
}

let faceDetector: FaceDetector | null = null;

async function initDetector(): Promise<FaceDetector> {
  if (faceDetector) return faceDetector;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  );

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    minDetectionConfidence: 0.5,
  });

  return faceDetector;
}

export async function detectHead(
  imageElement: HTMLImageElement
): Promise<DetectionResult | null> {
  const detector = await initDetector();
  const result = detector.detect(imageElement);

  if (!result.detections || result.detections.length === 0) {
    return null;
  }

  const detection = result.detections[0];
  const bbox = detection.boundingBox;
  if (!bbox) return null;

  // Expand the bounding box to include the full head (face detection only gets face area)
  const expandX = bbox.width * 0.35;
  const expandYTop = bbox.height * 0.55;
  const expandYBottom = bbox.height * 0.15;

  const headBox = {
    x: Math.max(0, bbox.originX - expandX),
    y: Math.max(0, bbox.originY - expandYTop),
    width: Math.min(imageElement.naturalWidth, bbox.width + expandX * 2),
    height: Math.min(
      imageElement.naturalHeight,
      bbox.height + expandYTop + expandYBottom
    ),
  };

  return {
    headBox,
    imageWidth: imageElement.naturalWidth,
    imageHeight: imageElement.naturalHeight,
  };
}

export function renderBigHeadEffect(
  imageElement: HTMLImageElement,
  detection: DetectionResult,
  headScale: number,
  bodyCompress: number
): HTMLCanvasElement {
  const { headBox, imageWidth, imageHeight } = detection;

  // Calculate dimensions
  const bodyTop = headBox.y + headBox.height;
  const bodyHeight = imageHeight - bodyTop;
  const compressedBodyHeight = bodyHeight * (1 - bodyCompress);

  // The new head dimensions
  const newHeadWidth = headBox.width * headScale;
  const newHeadHeight = headBox.height * headScale;

  // Output canvas dimensions
  const outputWidth = imageWidth;
  const outputHeight = headBox.y + newHeadHeight + compressedBodyHeight;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  // Step 1: Draw the area above the head (if any)
  if (headBox.y > 0) {
    ctx.drawImage(
      imageElement,
      0, 0, imageWidth, headBox.y,
      0, 0, imageWidth, headBox.y
    );
  }

  // Step 2: Draw the enlarged head centered
  const headCenterX = headBox.x + headBox.width / 2;
  const newHeadX = headCenterX - newHeadWidth / 2;
  const newHeadY = headBox.y;

  ctx.drawImage(
    imageElement,
    headBox.x, headBox.y, headBox.width, headBox.height,
    newHeadX, newHeadY, newHeadWidth, newHeadHeight
  );

  // Step 3: Draw the compressed body
  const bodyDestY = headBox.y + newHeadHeight;
  ctx.drawImage(
    imageElement,
    0, bodyTop, imageWidth, bodyHeight,
    0, bodyDestY, imageWidth, compressedBodyHeight
  );

  return canvas;
}
