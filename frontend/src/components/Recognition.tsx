import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, AlertCircle, FileImage, ImageUp, Loader2, ScanLine, Upload, X,
} from 'lucide-react';
import { RecognitionLog, UploadRecognitionResponse, uploadPlateImage } from '../api';
import { prepareImageForUpload } from '../imageUpload';
import { confidenceLabel, plateOwner } from './shared';

interface RecognitionProps {
  onNewLog: (log: RecognitionLog) => void;
  onBumpSummary: () => void;
  onNotice: (msg: string) => void;
}

export function Recognition({ onNewLog, onBumpSummary, onNotice }: RecognitionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<UploadRecognitionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayImg = result?.log.annotatedImagePath || previewUrl;

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { onNotice('Vui lòng chọn tệp hình ảnh.'); return; }
    setFile(f); setResult(null); setError(null);
  }

  function reset() { setFile(null); setResult(null); setError(null); }

  async function processImage() {
    if (!file || isProcessing) return;
    setIsProcessing(true); setError(null);
    try {
      const prepared = await prepareImageForUpload(file);
      const data = await uploadPlateImage(prepared);
      setResult(data);
      if (!data.duplicateSkipped) { onNewLog(data.log); onBumpSummary(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối server.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Nhận diện biển số</h2>
        <p>[Module: Image_Recognition_AI]</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900, margin: '0 auto' }}>
        {/* Left: upload zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            className={`upload-zone${isDragging ? ' dragging' : ''}${displayImg ? ' has-file' : ''}`}
            onClick={() => !displayImg && inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          >
            {displayImg ? (
              <div className="preview-wrap">
                <img src={displayImg} alt="Preview" />
                <div className="preview-actions">
                  <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); reset(); }}>
                    <X size={14} /> Xóa
                  </button>
                  <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                    <FileImage size={14} /> Đổi ảnh
                  </button>
                  <button className="btn btn-primary" onClick={e => { e.stopPropagation(); processImage(); }} disabled={isProcessing}>
                    {isProcessing ? <Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> : <Upload size={14} />}
                    {isProcessing ? 'Đang xử lý' : 'Nhận diện'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-empty">
                <div className="upload-icon"><ImageUp size={32} /></div>
                <strong>Kéo thả ảnh biển số</strong>
                <span>PNG · JPG · WEBP</span>
                <button className="btn btn-primary" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                  Chọn tệp
                </button>
              </div>
            )}
            <input ref={inputRef} className="file-input" type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={e => handleFiles(e.target.files)} />
          </div>

          {!displayImg && (
            <button className="btn btn-secondary" disabled style={{ justifyContent: 'center', padding: 14, opacity: .4 }}>
              <ScanLine size={16} /> Chọn ảnh để bắt đầu phân tích
            </button>
          )}
        </div>

        {/* Right: AI result panel */}
        <div className="ai-panel">
          <div className="ai-panel-title">
            <span className="ai-dot" />
            AI_Analysis_Engine
          </div>

          {!file && !result && !error && (
            <div className="ai-waiting">
              <FileImage size={40} style={{ color: 'var(--border)', marginBottom: 4 }} />
              <p>Waiting for stream input...</p>
            </div>
          )}

          {isProcessing && (
            <div className="ai-processing">
              <div className="spin-ring" style={{ width: 48, height: 48, border: '2px solid rgba(14,165,233,.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .8s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScanLine size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="ai-processing" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)', animation: 'pulse-text 1.5s infinite' }}>
                Scanning matrix...
              </p>
            </div>
          )}

          {error && (
            <div className="ai-error">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} style={{ color: 'var(--red)' }} />
                <p>System_Error</p>
              </div>
              <span style={{ marginTop: 6 }}>{error}</span>
              <button className="btn btn-danger" style={{ marginTop: 12, fontSize: 10 }} onClick={reset}>
                Retry_Protocol
              </button>
            </div>
          )}

          {result && !isProcessing && (
            <div>
              <div className="ai-result-grid" style={{ marginBottom: 16 }}>
                <div className="ai-result-cell">
                  <p>License_Plate</p>
                  <div className="plate-num">{result.recognition.plate}</div>
                </div>
                <div className="ai-result-cell">
                  <p>Confidence_L</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="conf-num">{confidenceLabel(result.recognition.confidence)}</span>
                    <CheckCircle2 size={14} style={{ color: 'rgba(52,211,153,.4)' }} />
                  </div>
                </div>
              </div>
              <div>
                <div className="ai-result-row">
                  <span>Location Node</span>
                  <strong>{result.recognition.location || '--'}</strong>
                </div>
                <div className="ai-result-row">
                  <span>Chủ xe</span>
                  <strong>{plateOwner(result.log)}</strong>
                </div>
                <div className="ai-result-row" style={{ borderBottom: 'none' }}>
                  <span>Log status</span>
                  <strong>{result.duplicateSkipped ? 'Bỏ qua trùng' : 'Đã lưu'}</strong>
                </div>
              </div>
              <div className="ai-success">
                <CheckCircle2 size={14} />
                Data_Packet_Stored_Securely
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
