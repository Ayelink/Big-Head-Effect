export type Locale = "zh" | "en";

export const translations = {
  zh: {
    title: "大头矮人特效",
    subtitle: "AI 一键生成趣味大头娃娃效果",
    uploadBtn: "上传图片",
    cameraBtn: "拍照",
    fileTip: "支持 JPG、PNG、WebP，最大 10MB",
    scaleLabel: "头部放大比例",
    uploading: "上传中...",
    uploadingDesc: "正在上传图片",
    generating: "AI 生成中...",
    generatingDesc: "通常需要 10-30 秒",
    errorRetry: "重新开始",
    regenerate: "重新生成",
    changePhoto: "换一张",
    viewFull: "查看大图",
    original: "原图",
    uploadFailed: "图片上传失败，请重试",
    generateFailed: "AI 生成失败，请更换照片重试",
    noFace: "未检测到人脸，请换一张正面照片重试",
  },
  en: {
    title: "Big Head Effect",
    subtitle: "AI-powered fun bobblehead transformation",
    uploadBtn: "Upload",
    cameraBtn: "Camera",
    fileTip: "JPG, PNG, WebP supported, max 10MB",
    scaleLabel: "Head Scale",
    uploading: "Uploading...",
    uploadingDesc: "Uploading your image",
    generating: "AI Generating...",
    generatingDesc: "Usually takes 10-30 seconds",
    errorRetry: "Start Over",
    regenerate: "Regenerate",
    changePhoto: "New Photo",
    viewFull: "View Full",
    original: "Original",
    uploadFailed: "Upload failed, please try again",
    generateFailed: "Generation failed, please try another photo",
    noFace: "No face detected, please use a front-facing photo",
  },
} as const;

export function t(locale: Locale, key: keyof typeof translations.zh): string {
  return translations[locale][key];
}
