import { useRef, useState } from "react";
import { uploadResumePdf } from "../../api";

type StepResumeUploadProps = {
  resumeS3Key: string;
  resumeViewUrl: string;
  accessToken: string;
  onUploaded: (key: string, url: string) => void;
  onNext: () => void;
};

export function StepResumeUpload({
  resumeS3Key,
  resumeViewUrl,
  accessToken,
  onUploaded,
  onNext,
}: StepResumeUploadProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    resumeS3Key ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error");
      setErrorMsg("Resume must be a PDF file.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setStatus("error");
      setErrorMsg("Resume exceeds 1 MB size limit.");
      return;
    }
    setFileName(file.name);
    setStatus("uploading");
    setErrorMsg("");
    try {
      const uploaded = await uploadResumePdf(file, accessToken);
      onUploaded(uploaded.resume_s3_key, uploaded.resume_view_url);
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Upload failed. Please try again.");
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-[#1f1f1f]">Step 1: Upload Resume</h2>
      <p className="text-sm text-[#4d4d4d]">Please upload your resume as a PDF (max 1 MB).</p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {status === "done" ? (
        /* Success state */
        <div className="flex items-center gap-3 rounded-lg border border-[#1f6f5f]/30 bg-[#1f6f5f]/5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1f6f5f] text-white text-lg">
            {"\u2713"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1f1f1f]">{fileName || "Resume"}</p>
            <p className="text-xs text-[#666]">Uploaded successfully</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {resumeViewUrl && (
              <a
                href={resumeViewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-[#c7c7c7] px-3 py-1.5 text-xs text-[#333] hover:bg-[#f5f5f5]"
              >
                View
              </a>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded border border-[#c7c7c7] px-3 py-1.5 text-xs text-[#333] hover:bg-[#f5f5f5]"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => status !== "uploading" && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragging
              ? "border-[#1f6f5f] bg-[#1f6f5f]/5"
              : status === "error"
                ? "border-red-300 bg-red-50"
                : "border-[#c7c7c7] bg-[#fafafa] hover:border-[#999] hover:bg-[#f5f5f5]"
          }`}
        >
          {status === "uploading" ? (
            <>
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[#c7c7c7] border-t-[#1f6f5f]" />
              <p className="text-sm text-[#666]">Uploading {fileName}...</p>
            </>
          ) : (
            <>
              <svg className="mb-2 h-10 w-10 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.57 5.845H6.75z" />
              </svg>
              <p className="text-sm font-medium text-[#333]">Upload Resume (PDF)</p>
              <p className="mt-1 text-xs text-[#888]">Drag and drop or click to browse</p>
              {errorMsg && <p className="mt-2 text-xs text-red-600">{errorMsg}</p>}
            </>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!resumeS3Key}
          onClick={onNext}
          className="rounded-md bg-[#1f6f5f] px-5 py-2 text-white disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}
