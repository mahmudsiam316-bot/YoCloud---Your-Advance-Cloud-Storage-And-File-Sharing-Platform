import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { useUploadNewVersion } from "@/hooks/useVersions";
import type { FileItem } from "@/components/RecentFiles";

interface UploadVersionDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadVersionDialog({ file, open, onOpenChange }: UploadVersionDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadVersion = useUploadNewVersion();

  const handleUpload = () => {
    if (!file || !selectedFile) return;
    uploadVersion.mutate({ fileId: file.id, file: selectedFile }, {
      onSuccess: () => {
        setSelectedFile(null);
        onOpenChange(false);
      },
    });
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => { if (!v) setSelectedFile(null); onOpenChange(v); }}
      title="Upload New Version"
      description={file ? `Replace "${file.name}" with a new version. The current version will be saved in version history.` : ""}
      icon={
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploadVersion.isPending} className="flex-1">
            {uploadVersion.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading...</> : "Upload"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-secondary/50 transition-colors"
        >
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(selectedFile.size / 1e6).toFixed(1)} MB · Click to change
              </p>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to select a file</p>
            </div>
          )}
        </button>
      </div>
    </ResponsiveDialog>
  );
}
