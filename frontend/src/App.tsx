import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Car,
  CheckCircle2,
  Database,
  FileImage,
  Gauge,
  History,
  ImageUp,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  Video,
  VideoOff,
  Users,
  X,
} from "lucide-react";
import {
  API_BASE_URL,
  CameraPayload,
  CameraRecord,
  Owner,
  OwnerPayload,
  RecognitionLog,
  RecognitionSummary,
  UploadRecognitionResponse,
  Vehicle,
  VehiclePayload,
  checkHealth,
  deleteCamera,
  deleteOwner,
  deleteRecognition,
  deleteVehicle,
  fetchCameras,
  fetchOwners,
  fetchRecognitionHistory,
  fetchRecognitionSummary,
  fetchVehicles,
  saveCamera,
  saveOwner,
  saveVehicle,
  setCameraActive,
  uploadPlateImage,
} from "./api";
import { prepareImageForUpload } from "./imageUpload";

type ServerState = "checking" | "active" | "offline";
type View =
  | "dashboard"
  | "image-recognition"
  | "camera-realtime"
  | "recognitions"
  | "vehicles"
  | "owners"
  | "settings";

const views: Array<{ id: View; label: string; icon: typeof Gauge }> = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "image-recognition", label: "Nhận diện ảnh", icon: FileImage },
  { id: "camera-realtime", label: "Camera realtime", icon: Video },
  { id: "recognitions", label: "Lịch sử", icon: History },
  { id: "vehicles", label: "Xe", icon: Car },
  { id: "owners", label: "Chủ xe", icon: Users },
  { id: "settings", label: "Cấu hình", icon: Settings },
];

const emptyOwner: OwnerPayload = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
};

const emptyVehicle: VehiclePayload = {
  plateNumber: "",
  ownerId: "",
  vehicleType: "Xe máy",
  brand: "",
  color: "",
  province: "",
  note: "",
};

const emptyCamera: CameraPayload = {
  name: "",
  sourceUrl: "browser-webcam",
  location: "",
  isActive: true,
};

function viewFromHash(): View {
  const hash = window.location.hash.replace("#/", "").replace("#", "") as View;
  return views.some((view) => view.id === hash) ? hash : "dashboard";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function confidenceLabel(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : `${Math.round(value * 100)}%`;
}

function plateOwner(log: RecognitionLog) {
  return log.vehicle?.owner?.fullName || "Vãng lai";
}

function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanningFrameRef = useRef(false);
  const [activeView, setActiveView] = useState<View>(viewFromHash);
  const [serverState, setServerState] = useState<ServerState>("checking");
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [summary, setSummary] = useState<RecognitionSummary | null>(null);
  const [history, setHistory] = useState<RecognitionLog[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cameras, setCameras] = useState<CameraRecord[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<UploadRecognitionResponse | null>(null);
  const [realtimeCameraId, setRealtimeCameraId] = useState<number | "">("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [isScanningFrame, setIsScanningFrame] = useState(false);
  const [cameraResult, setCameraResult] = useState<UploadRecognitionResponse | null>(null);
  const [cameraStatus, setCameraStatus] = useState("Camera laptop chưa bật.");
  const [scanIntervalMs, setScanIntervalMs] = useState(2000);

  const [historyFilters, setHistoryFilters] = useState({
    plateNumber: "",
    cameraId: "",
    from: "",
    to: "",
  });
  const [ownerSearch, setOwnerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [cameraSearch, setCameraSearch] = useState("");

  const [ownerForm, setOwnerForm] = useState<OwnerPayload>(emptyOwner);
  const [ownerEditingId, setOwnerEditingId] = useState<number | undefined>();
  const [vehicleForm, setVehicleForm] = useState<VehiclePayload>(emptyVehicle);
  const [vehicleEditingId, setVehicleEditingId] = useState<number | undefined>();
  const [cameraForm, setCameraForm] = useState<CameraPayload>(emptyCamera);
  const [cameraEditingId, setCameraEditingId] = useState<number | undefined>();

  const activeCameras = useMemo(
    () => cameras.filter((cameraRecord) => cameraRecord.isActive),
    [cameras]
  );

  const displayImage = result?.log.annotatedImagePath || previewUrl;

  useEffect(() => {
    function onHashChange() {
      setActiveView(viewFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeView !== "vehicles" || isLoading) {
      return;
    }
    fetchOwners()
      .then(setOwners)
      .catch(() => {});
  }, [activeView, isLoading]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeView !== "camera-realtime") {
      stopCamera();
    }
  }, [activeView]);

  useEffect(() => {
    if (!isAutoScanning || !isCameraOn) {
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      return;
    }

    scanTimerRef.current = window.setInterval(() => {
      scanCameraFrame();
    }, scanIntervalMs);

    return () => {
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [isAutoScanning, isCameraOn, scanIntervalMs]);

  async function loadInitialData() {
    setIsLoading(true);
    setNotice(null);
    try {
      await checkHealth();
      setServerState("active");
    } catch {
      setServerState("offline");
    }

    try {
      const [summaryData, logs, ownerData, vehicleData, cameraData] = await Promise.all([
        fetchRecognitionSummary(),
        fetchRecognitionHistory({ limit: 50 }),
        fetchOwners(),
        fetchVehicles(),
        fetchCameras(),
      ]);
      setSummary(summaryData);
      setHistory(logs);
      setOwners(ownerData);
      setVehicles(vehicleData);
      setCameras(cameraData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  }

  async function reloadHistory() {
    const logs = await fetchRecognitionHistory({
      ...historyFilters,
      limit: 100,
    });
    setHistory(logs);
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setNotice("Vui lòng chọn tệp hình ảnh.");
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setNotice(null);
  }

  function bumpSummaryAfterLog(duplicateSkipped?: boolean) {
    if (duplicateSkipped) {
      return;
    }
    setSummary((current) =>
      current ? { ...current, totalLogs: current.totalLogs + 1 } : current
    );
  }

  async function submitImage() {
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setNotice(null);
    try {
      const preparedFile = await prepareImageForUpload(selectedFile);
      const data = await uploadPlateImage(preparedFile);
      setResult(data);
      if (!data.duplicateSkipped) {
        setHistory((current) => [data.log, ...current.filter((item) => item.id !== data.log.id)]);
        bumpSummaryAfterLog();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể nhận diện ảnh.");
    } finally {
      setIsUploading(false);
    }
  }

  async function startCamera() {
    setNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
      setCameraStatus("Camera laptop đang sẵn sàng.");
    } catch (error) {
      setIsCameraOn(false);
      setIsAutoScanning(false);
      setCameraStatus("Không mở được camera.");
      setNotice(
        error instanceof Error
          ? error.message
          : "Không thể truy cập camera. Hãy kiểm tra quyền camera của trình duyệt."
      );
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setIsAutoScanning(false);
    scanningFrameRef.current = false;
    setIsScanningFrame(false);
    setCameraStatus("Camera đã tắt.");
  }

  async function scanCameraFrame() {
    if (!videoRef.current || !canvasRef.current || scanningFrameRef.current) {
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setCameraStatus("Camera chưa có khung hình ổn định.");
      return;
    }

    scanningFrameRef.current = true;
    setIsScanningFrame(true);
    setCameraStatus("Đang quét khung hình...");
    try {
      const canvas = canvasRef.current;
      const maxWidth = 960;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Không tạo được canvas để chụp frame.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.86)
      );
      if (!blob) {
        throw new Error("Không chụp được khung hình camera.");
      }

      const frame = new File([blob], `camera-frame-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const data = await uploadPlateImage(frame, realtimeCameraId, "CAMERA_FRAME");
      setCameraResult(data);
      if (!data.duplicateSkipped) {
        setHistory((current) => [data.log, ...current.filter((item) => item.id !== data.log.id)]);
        bumpSummaryAfterLog();
      }
      setCameraStatus(
        data.duplicateSkipped
          ? `Đã nhận ${data.recognition.plate}, bỏ qua log trùng.`
          : `Đã nhận ${data.recognition.plate}.`
      );
    } catch (error) {
      setCameraStatus("Khung hình này chưa nhận diện được.");
      if (!isAutoScanning) {
        setNotice(error instanceof Error ? error.message : "Không thể quét camera.");
      }
    } finally {
      scanningFrameRef.current = false;
      setIsScanningFrame(false);
    }
  }

  async function submitOwner(event: FormEvent) {
    event.preventDefault();
    const saved = await saveOwner(ownerForm, ownerEditingId);
    setOwners((current) => [saved, ...current.filter((owner) => owner.id !== saved.id)]);
    setOwnerForm(emptyOwner);
    setOwnerEditingId(undefined);
    setNotice("Đã lưu chủ xe.");
  }

  async function submitVehicle(event: FormEvent) {
    event.preventDefault();
    const saved = await saveVehicle(vehicleForm, vehicleEditingId);
    setVehicles((current) => [saved, ...current.filter((vehicle) => vehicle.id !== saved.id)]);
    setOwners(await fetchOwners());
    setVehicleForm(emptyVehicle);
    setVehicleEditingId(undefined);
    setNotice("Đã lưu xe máy.");
  }

  async function submitCamera(event: FormEvent) {
    event.preventDefault();
    const saved = await saveCamera(cameraForm, cameraEditingId);
    setCameras((current) => [saved, ...current.filter((cameraRecord) => cameraRecord.id !== saved.id)]);
    setCameraForm(emptyCamera);
    setCameraEditingId(undefined);
    setNotice("Đã lưu camera.");
  }

  async function confirmDelete(label: string, action: () => Promise<void>) {
    if (!window.confirm(`Xóa ${label}?`)) {
      return;
    }
    await action();
    setNotice("Đã xóa dữ liệu.");
  }

  async function searchOwners() {
    setOwners(await fetchOwners(ownerSearch));
  }

  async function searchVehicles() {
    setVehicles(await fetchVehicles(vehicleSearch));
  }

  async function searchCameras() {
    setCameras(await fetchCameras(cameraSearch));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" onClick={() => setActiveView("dashboard")}>
          <span className="brand-icon" aria-hidden="true">
            <Camera size={20} />
          </span>
          <span>PlateVision AI</span>
        </a>

        <nav className="nav-links" aria-label="Điều hướng chính">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <a
                className={activeView === view.id ? "active" : ""}
                href={`#${view.id}`}
                key={view.id}
                onClick={() => setActiveView(view.id)}
              >
                <Icon size={18} />
                <span>{view.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hệ thống nhận diện biển số</p>
            <h1>{views.find((view) => view.id === activeView)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" onClick={loadInitialData} title="Tải lại">
              <RefreshCw size={18} />
            </button>
            <span className={`server-state ${serverState}`}>
              {serverState === "offline" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
              {serverState === "checking"
                ? "Đang kiểm tra"
                : serverState === "active"
                  ? "API hoạt động"
                  : "API offline"}
            </span>
          </div>
        </header>

        {notice ? (
          <div className="notice">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} title="Đóng">
              <X size={16} />
            </button>
          </div>
        ) : null}

        <main className="content">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="spin" size={28} />
              <span>Đang tải dữ liệu...</span>
            </div>
          ) : null}

          {!isLoading && activeView === "dashboard" ? (
            <section className="dashboard-grid">
              <div className="metric-grid">
                <Metric label="Lượt nhận diện" value={summary?.totalLogs ?? 0} />
                <Metric label="Xe đã đăng ký" value={summary?.totalVehicles ?? 0} />
                <Metric label="Chủ xe" value={summary?.totalOwners ?? 0} />
                <Metric label="Camera" value={summary?.totalCameras ?? 0} />
              </div>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Lịch sử gần đây</h2>
                    <p>{history.length} bản ghi mới nhất</p>
                  </div>
                  <div className="panel-header-actions">
                    <a className="secondary-button" href="#image-recognition" onClick={() => setActiveView("image-recognition")}>
                      <FileImage size={17} />
                      Nhận diện ảnh
                    </a>
                    <a className="secondary-button" href="#camera-realtime" onClick={() => setActiveView("camera-realtime")}>
                      <Video size={17} />
                      Camera realtime
                    </a>
                  </div>
                </div>
                <HistoryList logs={history.slice(0, 8)} />
              </section>
            </section>
          ) : null}

          {!isLoading && activeView === "image-recognition" ? (
            <section className="page-grid">
              <section className="panel upload-panel">
                <div className="panel-header">
                  <div>
                    <h2>Upload ảnh biển số</h2>
                    <p>Gửi ảnh qua Node.js API và lưu lịch sử PostgreSQL.</p>
                  </div>
                </div>

                <div
                  className={`upload-zone ${isDragging ? "dragging" : ""} ${displayImage ? "has-preview" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    handleFiles(event.dataTransfer.files);
                  }}
                >
                  {displayImage ? (
                    <div className="preview-layout">
                      <img src={displayImage} alt="Ảnh biển số" />
                      <div className="preview-actions">
                        <button className="secondary-button" onClick={() => inputRef.current?.click()}>
                          <FileImage size={18} />
                          Đổi ảnh
                        </button>
                        <button className="primary-button" onClick={submitImage} disabled={isUploading}>
                          {isUploading ? <Loader2 className="spin" size={18} /> : <Upload size={18} />}
                          {isUploading ? "Đang xử lý" : "Nhận diện"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-empty">
                      <span className="upload-icon" aria-hidden="true">
                        <ImageUp size={34} />
                      </span>
                      <strong>Kéo thả ảnh biển số</strong>
                      <span>JPG, PNG hoặc WebP</span>
                      <button className="primary-button" onClick={() => inputRef.current?.click()}>
                        Chọn tệp tin
                      </button>
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    className="file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                </div>

                {result ? (
                  <div className="result-strip">
                    <ResultItem label="Biển số" value={result.recognition.plate} />
                    <ResultItem label="Địa phương" value={result.recognition.location} />
                    <ResultItem label="Chủ xe" value={plateOwner(result.log)} />
                    <ResultItem label="Tin cậy" value={confidenceLabel(result.recognition.confidence)} />
                  </div>
                ) : null}
              </section>
            </section>
          ) : null}

          {!isLoading && activeView === "camera-realtime" ? (
            <section className="page-grid">
              <section className="panel camera-panel">
                <div className="panel-header">
                  <div>
                    <h2>Quét biển số realtime</h2>
                    <p>Dùng camera laptop, quét chậm để giảm lỗi và tránh ghi log trùng.</p>
                  </div>
                  <div className="camera-controls">
                    <select
                      value={realtimeCameraId}
                      onChange={(event) =>
                        setRealtimeCameraId(event.target.value ? Number(event.target.value) : "")
                      }
                      disabled={isAutoScanning}
                    >
                      <option value="">Không gắn camera</option>
                      {activeCameras.map((cameraRecord) => (
                        <option key={cameraRecord.id} value={cameraRecord.id}>
                          {cameraRecord.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={scanIntervalMs}
                      onChange={(event) => setScanIntervalMs(Number(event.target.value))}
                      disabled={isAutoScanning}
                    >
                      <option value={2000}>Mỗi 2 giây</option>
                      <option value={3000}>Mỗi 3 giây</option>
                      <option value={5000}>Mỗi 5 giây</option>
                    </select>
                    {isCameraOn ? (
                      <button className="secondary-button" type="button" onClick={stopCamera}>
                        <VideoOff size={17} />
                        Tắt camera
                      </button>
                    ) : (
                      <button className="primary-button" type="button" onClick={startCamera}>
                        <Video size={17} />
                        Bật camera
                      </button>
                    )}
                  </div>
                </div>

                <div className="camera-body">
                  <div className={`camera-frame ${isCameraOn ? "active" : ""}`}>
                    <video ref={videoRef} playsInline muted />
                    {!isCameraOn ? (
                      <div className="camera-placeholder">
                        <Camera size={36} />
                        <strong>Camera laptop chưa bật</strong>
                        <span>Trình duyệt sẽ hỏi quyền truy cập camera khi bật.</span>
                      </div>
                    ) : null}
                    <canvas ref={canvasRef} className="hidden-canvas" />
                  </div>

                  <div className="camera-side">
                    <div className="camera-status">
                      <span>{cameraStatus}</span>
                      {isScanningFrame ? <Loader2 className="spin" size={18} /> : null}
                    </div>
                    <div className="camera-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={scanCameraFrame}
                        disabled={!isCameraOn || isScanningFrame}
                      >
                        <RefreshCw size={17} />
                        Quét 1 frame
                      </button>
                      <button
                        className={isAutoScanning ? "danger-button" : "primary-button"}
                        type="button"
                        onClick={() => setIsAutoScanning((current) => !current)}
                        disabled={!isCameraOn}
                      >
                        {isAutoScanning ? <VideoOff size={17} /> : <Video size={17} />}
                        {isAutoScanning ? "Dừng tự quét" : "Tự quét chậm"}
                      </button>
                    </div>

                    {cameraResult ? (
                      <div className="camera-result">
                        <ResultItem label="Biển số" value={cameraResult.recognition.plate} />
                        <ResultItem label="Chủ xe" value={plateOwner(cameraResult.log)} />
                        <ResultItem
                          label="Tin cậy"
                          value={confidenceLabel(cameraResult.recognition.confidence)}
                        />
                        <ResultItem
                          label="Lưu log"
                          value={cameraResult.duplicateSkipped ? "Bỏ qua trùng" : "Đã lưu"}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </section>
          ) : null}

          {!isLoading && activeView === "recognitions" ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Bảng lịch sử nhận diện</h2>
                  <p>Lọc theo biển số, khoảng ngày và camera.</p>
                </div>
              </div>
              <div className="filter-row">
                <SearchField
                  value={historyFilters.plateNumber}
                  placeholder="Tìm biển số"
                  onChange={(value) => setHistoryFilters((current) => ({ ...current, plateNumber: value }))}
                  onSearch={reloadHistory}
                />
                <select
                  value={historyFilters.cameraId}
                  onChange={(event) =>
                    setHistoryFilters((current) => ({ ...current, cameraId: event.target.value }))
                  }
                >
                  <option value="">Tất cả camera</option>
                  {cameras.map((cameraRecord) => (
                    <option key={cameraRecord.id} value={cameraRecord.id}>
                      {cameraRecord.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={historyFilters.from}
                  onChange={(event) =>
                    setHistoryFilters((current) => ({ ...current, from: event.target.value }))
                  }
                />
                <input
                  type="date"
                  value={historyFilters.to}
                  onChange={(event) =>
                    setHistoryFilters((current) => ({ ...current, to: event.target.value }))
                  }
                />
                <button className="secondary-button" onClick={reloadHistory}>
                  <Search size={17} />
                  Lọc
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Biển số</th>
                      <th>Chủ xe</th>
                      <th>Camera</th>
                      <th>Tin cậy</th>
                      <th>Thời gian</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Thumb log={item} />
                        </td>
                        <td>
                          <strong>{item.plateNumber}</strong>
                          <small>{item.province || "Chưa rõ địa phương"}</small>
                        </td>
                        <td>{plateOwner(item)}</td>
                        <td>{item.camera?.name || "--"}</td>
                        <td>{confidenceLabel(item.confidence)}</td>
                        <td>{formatTime(item.recognizedAt)}</td>
                        <td className="table-actions">
                          <button
                            className="danger-icon"
                            type="button"
                            title="Xóa"
                            onClick={() =>
                              confirmDelete(`log ${item.plateNumber}`, async () => {
                                await deleteRecognition(item.id);
                                setHistory((current) => current.filter((log) => log.id !== item.id));
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {!isLoading && activeView === "vehicles" ? (
            <CrudLayout
              title="Danh sách xe"
              subtitle="Quản lý biển số xe máy và gắn với chủ xe đã đăng ký."
              search={
                <SearchField
                  value={vehicleSearch}
                  placeholder="Biển số, hãng xe, chủ xe"
                  onChange={setVehicleSearch}
                  onSearch={searchVehicles}
                />
              }
              form={
                <form className="form-grid" onSubmit={submitVehicle}>
                  <label>
                    Biển số
                    <input
                      required
                      value={vehicleForm.plateNumber}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, plateNumber: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Chủ xe
                    <select
                      value={vehicleForm.ownerId}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          ownerId: event.target.value ? Number(event.target.value) : "",
                        }))
                      }
                    >
                      <option value="">Chưa chọn chủ xe</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.fullName}
                          {owner.phone ? ` · ${owner.phone}` : ""}
                        </option>
                      ))}
                    </select>
                    {owners.length === 0 ? (
                      <span className="form-hint">
                        Chưa có chủ xe trong hệ thống. Hãy thêm tại mục{" "}
                        <a
                          href="#owners"
                          onClick={(event) => {
                            event.preventDefault();
                            setActiveView("owners");
                          }}
                        >
                          Chủ xe
                        </a>
                        .
                      </span>
                    ) : null}
                  </label>
                  <label>
                    Loại xe
                    <input value="Xe máy" disabled />
                  </label>
                  <label>
                    Hãng xe
                    <input
                      value={vehicleForm.brand}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, brand: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Màu xe
                    <input
                      value={vehicleForm.color}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, color: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Tỉnh/thành
                    <input
                      value={vehicleForm.province}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, province: event.target.value }))
                      }
                    />
                  </label>
                  <label className="wide">
                    Ghi chú
                    <input
                      value={vehicleForm.note}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, note: event.target.value }))
                      }
                    />
                  </label>
                  <FormActions
                    isEditing={Boolean(vehicleEditingId)}
                    onCancel={() => {
                      setVehicleForm(emptyVehicle);
                      setVehicleEditingId(undefined);
                    }}
                  />
                </form>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Biển số</th>
                      <th>Chủ xe</th>
                      <th>Thông tin</th>
                      <th>Tỉnh/thành</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td>
                          <strong>{vehicle.plateNumber}</strong>
                          <small>{vehicle.normalizedPlateNumber}</small>
                        </td>
                        <td>{vehicle.owner?.fullName || "Vãng lai"}</td>
                        <td>
                          {[vehicle.vehicleType, vehicle.brand, vehicle.color].filter(Boolean).join(" · ") || "--"}
                        </td>
                        <td>{vehicle.province || "--"}</td>
                        <td className="table-actions">
                          <button
                            className="icon-button"
                            type="button"
                            title="Sửa"
                            onClick={() => {
                              setVehicleEditingId(vehicle.id);
                              setVehicleForm({
                                plateNumber: vehicle.plateNumber,
                                ownerId: vehicle.ownerId || "",
                                vehicleType: "Xe máy",
                                brand: vehicle.brand || "",
                                color: vehicle.color || "",
                                province: vehicle.province || "",
                                note: vehicle.note || "",
                              });
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="danger-icon"
                            type="button"
                            title="Xóa"
                            onClick={() =>
                              confirmDelete(`xe ${vehicle.plateNumber}`, async () => {
                                await deleteVehicle(vehicle.id);
                                setVehicles((current) => current.filter((item) => item.id !== vehicle.id));
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CrudLayout>
          ) : null}

          {!isLoading && activeView === "owners" ? (
            <CrudLayout
              title="Danh sách chủ xe"
              subtitle="Lưu hồ sơ chủ xe để đối chiếu khi nhận diện biển số."
              search={
                <SearchField
                  value={ownerSearch}
                  placeholder="Tên, số điện thoại, email"
                  onChange={setOwnerSearch}
                  onSearch={searchOwners}
                />
              }
              form={
                <form className="form-grid" onSubmit={submitOwner}>
                  <label>
                    Họ tên
                    <input
                      required
                      value={ownerForm.fullName}
                      onChange={(event) =>
                        setOwnerForm((current) => ({ ...current, fullName: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Số điện thoại
                    <input
                      value={ownerForm.phone}
                      onChange={(event) =>
                        setOwnerForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={ownerForm.email}
                      onChange={(event) =>
                        setOwnerForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </label>
                  <label className="wide">
                    Địa chỉ
                    <input
                      value={ownerForm.address}
                      onChange={(event) =>
                        setOwnerForm((current) => ({ ...current, address: event.target.value }))
                      }
                    />
                  </label>
                  <FormActions
                    isEditing={Boolean(ownerEditingId)}
                    onCancel={() => {
                      setOwnerForm(emptyOwner);
                      setOwnerEditingId(undefined);
                    }}
                  />
                </form>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Chủ xe</th>
                      <th>Liên hệ</th>
                      <th>Địa chỉ</th>
                      <th>Số xe</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner) => (
                      <tr key={owner.id}>
                        <td>
                          <strong>{owner.fullName}</strong>
                          <small>ID #{owner.id}</small>
                        </td>
                        <td>
                          {[owner.phone, owner.email].filter(Boolean).join(" · ") || "--"}
                        </td>
                        <td>{owner.address || "--"}</td>
                        <td>{owner.vehicles?.length ?? 0}</td>
                        <td className="table-actions">
                          <button
                            className="icon-button"
                            type="button"
                            title="Sửa"
                            onClick={() => {
                              setOwnerEditingId(owner.id);
                              setOwnerForm({
                                fullName: owner.fullName,
                                phone: owner.phone || "",
                                email: owner.email || "",
                                address: owner.address || "",
                              });
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="danger-icon"
                            type="button"
                            title="Xóa"
                            onClick={() =>
                              confirmDelete(`chủ xe ${owner.fullName}`, async () => {
                                await deleteOwner(owner.id);
                                setOwners((current) => current.filter((item) => item.id !== owner.id));
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CrudLayout>
          ) : null}

          {!isLoading && activeView === "settings" ? (
            <section className="settings-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Cấu hình runtime</h2>
                    <p>Các giá trị frontend đang sử dụng.</p>
                  </div>
                </div>
                <div className="config-list">
                  <ConfigItem icon={Database} label="API Base URL" value={API_BASE_URL} />
                  <ConfigItem icon={Gauge} label="AI Core" value="YOLO + PaddleOCR qua Node.js backend" />
                  <ConfigItem icon={Power} label="Trạng thái API" value={serverState} />
                </div>
              </section>

              <CrudLayout
                title="Camera"
                subtitle="Quản lý nguồn camera cho upload hiện tại và realtime ở giai đoạn 7."
                search={
                  <SearchField
                    value={cameraSearch}
                    placeholder="Tên, vị trí, nguồn"
                    onChange={setCameraSearch}
                    onSearch={searchCameras}
                  />
                }
                form={
                  <form className="form-grid" onSubmit={submitCamera}>
                    <label>
                      Tên camera
                      <input
                        required
                        value={cameraForm.name}
                        onChange={(event) =>
                          setCameraForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Nguồn
                      <input
                        value={cameraForm.sourceUrl}
                        onChange={(event) =>
                          setCameraForm((current) => ({ ...current, sourceUrl: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Vị trí
                      <input
                        value={cameraForm.location}
                        onChange={(event) =>
                          setCameraForm((current) => ({ ...current, location: event.target.value }))
                        }
                      />
                    </label>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={cameraForm.isActive}
                        onChange={(event) =>
                          setCameraForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />
                      Đang hoạt động
                    </label>
                    <FormActions
                      isEditing={Boolean(cameraEditingId)}
                      onCancel={() => {
                        setCameraForm(emptyCamera);
                        setCameraEditingId(undefined);
                      }}
                    />
                  </form>
                }
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Nguồn</th>
                        <th>Vị trí</th>
                        <th>Trạng thái</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cameras.map((cameraRecord) => (
                        <tr key={cameraRecord.id}>
                          <td>
                            <strong>{cameraRecord.name}</strong>
                            <small>ID #{cameraRecord.id}</small>
                          </td>
                          <td>{cameraRecord.sourceUrl || "--"}</td>
                          <td>{cameraRecord.location || "--"}</td>
                          <td>
                            <button
                              className={`status-pill ${cameraRecord.isActive ? "active" : ""}`}
                              type="button"
                              onClick={async () => {
                                const saved = await setCameraActive(cameraRecord.id, !cameraRecord.isActive);
                                setCameras((current) =>
                                  current.map((item) => (item.id === saved.id ? saved : item))
                                );
                              }}
                            >
                              {cameraRecord.isActive ? "Bật" : "Tắt"}
                            </button>
                          </td>
                          <td className="table-actions">
                            <button
                              className="icon-button"
                              type="button"
                              title="Sửa"
                              onClick={() => {
                                setCameraEditingId(cameraRecord.id);
                                setCameraForm({
                                  name: cameraRecord.name,
                                  sourceUrl: cameraRecord.sourceUrl || "",
                                  location: cameraRecord.location || "",
                                  isActive: cameraRecord.isActive,
                                });
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="danger-icon"
                              type="button"
                              title="Xóa"
                              onClick={() =>
                                confirmDelete(`camera ${cameraRecord.name}`, async () => {
                                  await deleteCamera(cameraRecord.id);
                                  setCameras((current) =>
                                    current.filter((item) => item.id !== cameraRecord.id)
                                  );
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CrudLayout>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Thumb({ log }: { log: RecognitionLog }) {
  return (
    <div className="history-thumb">
      {log.annotatedImagePath || log.imagePath ? (
        <img src={log.annotatedImagePath || log.imagePath || ""} alt={`Ảnh ${log.plateNumber}`} />
      ) : (
        <FileImage size={20} />
      )}
    </div>
  );
}

function HistoryList({ logs }: { logs: RecognitionLog[] }) {
  if (logs.length === 0) {
    return <div className="empty-state">Chưa có lịch sử nhận diện.</div>;
  }

  return (
    <ul className="history-list">
      {logs.map((item) => (
        <li className="history-item" key={item.id}>
          <Thumb log={item} />
          <div className="history-meta">
            <strong>{item.plateNumber}</strong>
            <span>{item.province || "Chưa rõ địa phương"}</span>
            <small>{formatTime(item.recognizedAt)}</small>
          </div>
          <span className="confidence-pill">{confidenceLabel(item.confidence)}</span>
        </li>
      ))}
    </ul>
  );
}

function SearchField({
  value,
  placeholder,
  onChange,
  onSearch,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="search-field">
      <Search size={17} />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSearch();
          }
        }}
      />
      <button type="button" onClick={onSearch} title="Tìm kiếm">
        <RefreshCw size={15} />
      </button>
    </div>
  );
}

function CrudLayout({
  title,
  subtitle,
  search,
  form,
  children,
}: {
  title: string;
  subtitle: string;
  search: ReactNode;
  form: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="crud-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {search}
        </div>
        {children}
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Biểu mẫu</h2>
            <p>Thêm mới hoặc cập nhật bản ghi.</p>
          </div>
        </div>
        {form}
      </section>
    </section>
  );
}

function FormActions({ isEditing, onCancel }: { isEditing: boolean; onCancel: () => void }) {
  return (
    <div className="form-actions">
      <button className="primary-button" type="submit">
        {isEditing ? <Save size={17} /> : <Plus size={17} />}
        {isEditing ? "Cập nhật" : "Thêm mới"}
      </button>
      {isEditing ? (
        <button className="secondary-button" type="button" onClick={onCancel}>
          <X size={17} />
          Hủy
        </button>
      ) : null}
    </div>
  );
}

function ConfigItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="config-item">
      <span>
        <Icon size={18} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default App;
