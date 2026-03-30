'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Image, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface FileUploadProps {
  projectId: string
  onUploadComplete?: () => void
}

interface FileEntry {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

const ACCEPTED_EXTENSIONS = ['.jar', '.zip', '.xml', '.png', '.jpg', '.jpeg', '.gif']
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif']

function isImageFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

function isAcceptedFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_EXTENSIONS.includes(ext)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const accepted = Array.from(newFiles).filter(isAcceptedFile)
    if (accepted.length === 0) return
    setFiles(prev => [
      ...prev,
      ...accepted.map(file => ({ file, status: 'pending' as const })),
    ])
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  async function handleUpload() {
    setUploading(true)
    const pendingIndices = files
      .map((f, i) => (f.status === 'pending' ? i : -1))
      .filter(i => i >= 0)

    for (const idx of pendingIndices) {
      setFiles(prev =>
        prev.map((f, i) => (i === idx ? { ...f, status: 'uploading' } : f))
      )
      try {
        const file = files[idx].file
        if (isImageFile(file)) {
          await api.uploadImage(projectId, file)
        } else {
          await api.uploadFile(projectId, file)
        }
        setFiles(prev =>
          prev.map((f, i) => (i === idx ? { ...f, status: 'success' } : f))
        )
      } catch (err) {
        setFiles(prev =>
          prev.map((f, i) =>
            i === idx
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        )
      }
    }
    setUploading(false)
    onUploadComplete?.()
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const hasPending = files.some(f => f.status === 'pending')

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Upload Files</h3>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
        }`}
      >
        <Upload className={`mb-3 h-10 w-10 ${dragOver ? 'text-primary-500' : 'text-slate-400'}`} />
        <p className="text-sm font-medium text-slate-700">
          Drag and drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Accepted: .jar, .zip, .xml, .png, .jpg, .jpeg, .gif
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jar,.zip,.xml,.png,.jpg,.jpeg,.gif"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5"
            >
              {isImageFile(entry.file) ? (
                <Image className="h-4 w-4 text-purple-500" />
              ) : (
                <FileText className="h-4 w-4 text-primary-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">
                  {entry.file.name}
                </p>
                <p className="text-xs text-slate-400">{formatFileSize(entry.file.size)}</p>
              </div>
              {entry.status === 'pending' && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              {entry.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              )}
              {entry.status === 'success' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {entry.status === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <XCircle className="h-4 w-4" />
                  {entry.error}
                </span>
              )}
            </div>
          ))}

          {hasPending && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary mt-2 w-full"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload {files.filter(f => f.status === 'pending').length} file(s)
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
