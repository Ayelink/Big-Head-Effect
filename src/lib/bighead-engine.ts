import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

interface DetectionResult {
  headBox: { x: number; y: number; width: number; height: number };
  imageWidth: number;
  imageHeight: number;
}

let faceDetector: FaceDetector | null = null;
let initPromise: Promise<FaceDetector> | null = null;

function initDetector(): Promise<FaceDetector> {
  if (faceDetector) return Promise.resolve(faceDetector);
  if (initPromise) return initPromise;

  initPromise = (async () => {
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
      minDetectionConfidence: 0.3,
    });

    return faceDetector;
  })();

  return initPromise;
}

/**
 * Draw the image onto a canvas to ensure MediaPipe can read pixels
 * (avoids CORS/tainted canvas issues with blob URLs)
 */
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export async function detectHead(
  imageElement: HTMLImageElement
): Promise<DetectionResult | null> {
  const detector = await initDetector();

  // Convert to canvas to avoid cross-origin pixel access issues
  const canvas = imageToCanvas(imageElement);

  const result = detector.detect(canvas);

  console.log("MediaPipe detection result:", JSON.stringify(result.detections?.map(d => ({
    score: d.categories?.[0]?.score,
    bbox: d.boundingBox,
    keypoints: d.keypoints?.length
  }))));

  if (!result.detections || result.detections.length === 0) {
    return null;
  }

  const detection = result.detections[0];
  const bbox = detection.boundingBox;

  // Fallback: if boundingBox is not available, try to compute from keypoints
  if (!bbox) {
    const keypoints = detection.keypoints;
    if (keypoints && keypoints.length >= 2) {
      const imgW = imageElement.naturalWidth;
      const imgH = imageElement.naturalHeight;

      // Keypoints are in normalized coordinates (0-1)
      const xs = keypoints.map((kp) => kp.x * imgW);
      const ys = keypoints.map((kp) => kp.y * imgH);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;
      const faceCenterX = (minX + maxX) / 2;
      const faceCenterY = (minY + maxY) / 2;

      // Estimate face bounding box from keypoints
      const estimatedWidth = faceWidth * 2.5;
      const estimatedHeight = faceHeight * 3.0;

      const expandX = estimatedWidth * 0.35;
      const expandYTop = estimatedHeight * 0.55;
      const expandYBottom = estimatedHeight * 0.15;

      const headBox = {
        x: Math.max(0, faceCenterX - estimatedWidth / 2 - expandX),
        y: Math.max(0, faceCenterY - estimatedHeight / 2 - expandYTop),
        width: Math.min(imgW, estimatedWidth + expandX * 2),
        height: Math.min(imgH, estimatedHeight + expandYTop + expandYBottom),
      };

      return {
        headBox,
        imageWidth: imgW,
        imageHeight: imgH,
      };
    }
    return null;
  }

  const imgW = imageElement.naturalWidth;
  const imgH = imageElement.naturalHeight;

  // Expand the bounding box to include the full head (face detection only gets face area)
  const expandX = bbox.width * 0.35;
  const expandYTop = bbox.height * 0.55;
  const expandYBottom = bbox.height * 0.15;

  const headBox = {
    x: Math.max(0, bbox.originX - expandX),
    y: Math.max(0, bbox.originY - expandYTop),
    width: Math.min(imgW - Math.max(0, bbox.originX - expandX), bbox.width + expandX * 2),
    height: Math.min(
      imgH - Math.max(0, bbox.originY - expandYTop),
      bbox.height + expandYTop + expandYBottom
    ),
  };

  return {
    headBox,
    imageWidth: imgW,
    imageHeight: imgH,
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

  // Fill background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  // Step 1: Draw the area above the head (if any)
  if (headBox.y > 0) {
    ctx.drawImage(
      imageElement,
      0, 0, imageWidth, headBox.y,
      0, 0, imageWidth, headBox.y
    );
  }

  // Step 2: Draw the compressed body FIRST (so head overlaps on top)
  const bodyDestY = headBox.y + newHeadHeight;
  if (bodyHeight > 0) {
    ctx.drawImage(
      imageElement,
      0, bodyTop, imageWidth, bodyHeight,
      0, bodyDestY, imageWidth, compressedBodyHeight
    );
  }

  // Step 3: Draw the enlarged head centered (on top of body)
  const headCenterX = headBox.x + headBox.width / 2;
  const newHeadX = headCenterX - newHeadWidth / 2;
  const newHeadY = headBox.y;

  ctx.drawImage(
    imageElement,
    headBox.x, headBox.y, headBox.width, headBox.height,
    newHeadX, newHeadY, newHeadWidth, newHeadHeight
  );

  return canvas;
}
