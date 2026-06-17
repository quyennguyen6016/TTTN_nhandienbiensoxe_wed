import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Loader2, RefreshCcw, ScanLine, Video, VideoOff } from 'lucide-react';
import { CameraRecord, RecognitionLog, UploadRecognitionResponse, uploadPlateImage } from '../api';
import { confidenceLabel, plateOwner } from './shared';

interface CameraRealtimeProps {
  activeCameras: CameraRecord[];
  onNewLog: (log: RecognitionLog) => void;
  onBumpSummary: () => void;
  onNotice: (msg: string) => void;
}

export function CameraRealtime({ activeCameras, onNewLog, onBumpSummary, onNotice }: CameraRealtimeProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const scanTimerRef   = useRef<number | null>(null);
  const scanningRef = useRef(false);

  const [cameraId, setCameraId]         = useState<number | ''>('');
  const [isOn, setIsOn]                 = useState(false);
  const [isAutoScan, setIsAutoScan]     = useState(false);
  const [isScanning, setIsScanning]     = useState(false);
  const [scanIntervalMs, setScanInterval] = useState(2000);
  const [status, setStatus]             = useState('Camera laptop chưa bật.');
  const [result, setResult]             = useState<UploadRecognitionResponse | null>(null);
  const [logs, setLogs]                 = useState<RecognitionLog[]>([]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), []);

  // Auto-scan interval
  useEffect(() => {
    if (!isAutoScan || !isOn) {
      if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
      return;
    }
    scanTimerRef.current = window.setInterval(scanFrame, scanIntervalMs);
    return () => { if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; } };
  }, [isAutoScan, isOn, scanIntervalMs]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setIsOn(true); setStatus('Camera đang sẵn sàng.');
    } catch (err) {
      setStatus('Không mở được camera.');
      onNotice(err instanceof Error ? err.message : 'Không thể truy cập camera.');
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsOn(false); setIsAutoScan(false); setIsScanning(false); scanningRef.current = false;
    setStatus('Camera đã tắt.');
  }

  async function scanFrame() {
    if (!videoRef.current || !canvasRef.current || scanningRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) { setStatus('Camera chưa có khung hình ổn định.'); return; }

    scanningRef.current = true; setIsScanning(true); setStatus('Đang quét khung hình...');
    try {
      const canvas = canvasRef.current;
      const scale = Math.min(1, 960 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', .86));
      if (!blob) throw new Error('Không chụp được khung hình.');

      const frame = new File([blob], `frame-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const data = await uploadPlateImage(frame, cameraId, 'CAMERA_FRAME');
      setResult(data);
      if (!data.duplicateSkipped) {
        onNewLog(data.log); onBumpSummary();
        setLogs(prev => [data.log, ...prev].slice(0, 6));
      }
      setStatus(data.duplicateSkipped ? `Nhận ${data.recognition.plate}, bỏ qua trùng.` : `Nhận ${data.recognition.plate}.`);
    } catch (err) {
      setStatus('Khung hình chưa nhận diện được.');
      if (!isAutoScan) onNotice(err instanceof Error ? err.message : 'Không thể quét camera.');
    } finally {
      scanningRef.current = false; setIsScanning(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Quét biển số Realtime</h2>
            <p>[Module: Live_Stream_Processor]</p>
          </div>
          <div className="page-header-actions">
            <select
              value={cameraId}
              onChange={e => setCameraId(e.target.value ? Number(e.target.value) : '')}
              disabled={isAutoScan}
              style={{ width: 'auto' }}
            >
              <option value="">Không gắn camera</option>
              {activeCameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={scanIntervalMs} onChange={e => setScanInterval(Number(e.target.value))} disabled={isAutoScan} style={{ width: 'auto' }}>
              <option value={2000}>Mỗi 2 giây</option>
              <option value={3000}>Mỗi 3 giây</option>
              <option value={5000}>Mỗi 5 giây</option>
            </select>
            {isOn
              ? <button className="btn btn-danger" onClick={stopCamera}><VideoOff size={14} /> Tắt Camera</button>
              : <button className="btn btn-primary" onClick={startCamera}><Video size={14} /> Bật Camera</button>
            }
          </div>
        </div>
      </div>

      <div className="camera-layout">
        {/* Camera view */}
        <div>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline muted style={{ opacity: isOn ? 1 : 0 }} />
              {!isOn && (
                <div className="camera-placeholder-inner">
                  <Camera size={40} />
                  <strong>Camera chưa kết nối</strong>
                  <span>Hệ thống đang chờ luồng tín hiệu [NODE_ID: CM-LPT-01]</span>
                </div>
              )}
              {isOn && (
                <>
                  <div className="camera-overlay-badge">
                    <div className="cam-badge">
                      <span className="status-dot pulse" style={{ color: '#10b981' }} />
                      LIVE // LOCAL_HOST
                    </div>
                    <div className="cam-badge cam-badge-white">1080P @ 60FPS</div>
                  </div>
                  <div className="camera-focus-box">
                    <div className="focus-frame"><span /></div>
                  </div>
                </>
              )}
              <canvas ref={canvasRef} className="hidden-canvas" />
            </div>
          </div>
          <div className="camera-actions-row">
            <button className="btn btn-secondary" onClick={scanFrame} disabled={!isOn || isScanning}>
              <RefreshCcw size={14} style={{ color: 'var(--accent)' }} /> Quét 1 frame
            </button>
            <button
              className={`btn ${isAutoScan ? 'btn-danger' : 'btn-accent-outline'}`}
              onClick={() => setIsAutoScan(p => !p)}
              disabled={!isOn}
            >
              <ScanLine size={14} />
              {isAutoScan ? 'Dừng tự quét' : 'Tự động quét chậm'}
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="camera-side">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Tình trạng camera
            </span>
            <span className={`badge ${isOn ? 'badge-green' : 'badge-red'}`}>
              {isOn ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="camera-status-box">
            <span>{status}</span>
            {isScanning && <Loader2 size={16} style={{ animation: 'spin .8s linear infinite', color: 'var(--accent)' }} />}
          </div>

          {result && (
            <div className="camera-result-grid">
              {[
                { label: 'Biển số',  val: result.recognition.plate },
                { label: 'Chủ xe',   val: plateOwner(result.log) },
                { label: 'Tin cậy',  val: confidenceLabel(result.recognition.confidence) },
                { label: 'Lưu log',  val: result.duplicateSkipped ? 'Bỏ qua' : 'Đã lưu' },
              ].map(({ label, val }) => (
                <div className="camera-result-cell" key={label}>
                  <span>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Detections log */}
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
              Detections_Log
            </div>
            {!isOn && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0', color: 'var(--text-muted)' }}>
                <AlertCircle size={28} style={{ opacity: .3 }} />
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-mono)' }}>Đang chờ kích hoạt stream...</p>
              </div>
            )}
            <div className="cam-detections">
              {logs.map(log => (
                <div className="cam-det-item" key={log.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="cam-det-img">
                      {(log.annotatedImagePath || log.imagePath)
                        ? <img src={log.annotatedImagePath || log.imagePath || ''} alt="" />
                        : null}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text)', fontStyle: 'italic' }}>{log.plateNumber}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{log.province || '--'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--accent)' }}>{confidenceLabel(log.confidence)} ACC</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
