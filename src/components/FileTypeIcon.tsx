import iconPdf from "@/assets/icons/icon-pdf.png";
import iconXls from "@/assets/icons/icon-xls.png";
import iconDoc from "@/assets/icons/icon-doc.png";
import iconSvg from "@/assets/icons/icon-svg.png";
import iconImg from "@/assets/icons/icon-img.png";
import iconVideo from "@/assets/icons/icon-video.png";
import iconAudio from "@/assets/icons/icon-audio.png";
import iconFolder from "@/assets/icons/icon-folder.png";
import iconZip from "@/assets/icons/icon-zip.png";
import iconFile from "@/assets/icons/icon-file.png";
import iconCode from "@/assets/icons/icon-code.png";
import iconPpt from "@/assets/icons/icon-ppt.png";
import iconExe from "@/assets/icons/icon-exe.png";
import iconFont from "@/assets/icons/icon-font.png";
import fileIconConfig from "@/config/fileIcons.json";

// Icon asset map
const iconAssets: Record<string, string> = {
  "icon-pdf": iconPdf,
  "icon-xls": iconXls,
  "icon-doc": iconDoc,
  "icon-svg": iconSvg,
  "icon-img": iconImg,
  "icon-video": iconVideo,
  "icon-audio": iconAudio,
  "icon-folder": iconFolder,
  "icon-zip": iconZip,
  "icon-file": iconFile,
  "icon-code": iconCode,
  "icon-ppt": iconPpt,
  "icon-exe": iconExe,
  "icon-font": iconFont,
};

type ExtConfig = { icon: string; color: string; label: string };

export function getFileExt(name: string): string {
  return name.split(".").pop()?.toUpperCase() || "";
}

export function getFileIconConfig(name: string, mime: string, isFolder: boolean): ExtConfig {
  if (isFolder) return fileIconConfig.folder as ExtConfig;

  const ext = getFileExt(name);
  const extEntry = (fileIconConfig.extensions as Record<string, ExtConfig>)[ext];
  if (extEntry) return extEntry;

  // Fallback by mime
  for (const [key, iconId] of Object.entries(fileIconConfig.mimeMap)) {
    if (mime.includes(key)) {
      return { icon: iconId, color: "#90A4AE", label: key };
    }
  }

  return fileIconConfig.default as ExtConfig;
}

export function getIconForFile(name: string, mime: string, isFolder: boolean): string {
  const config = getFileIconConfig(name, mime, isFolder);
  return iconAssets[config.icon] || iconFile;
}

interface FileTypeIconProps {
  name: string;
  mime: string;
  isFolder: boolean;
  size?: number;
  className?: string;
}

export function FileTypeIcon({ name, mime, isFolder, size = 48, className = "" }: FileTypeIconProps) {
  const src = getIconForFile(name, mime, isFolder);
  return (
    <img
      src={src}
      alt={isFolder ? "Folder" : getFileExt(name)}
      width={size}
      height={size}
      loading="lazy"
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
