import { BarChart3, Camera, Car, RefreshCcw, Upload, Users } from 'lucide-react';
import { RecognitionLog, RecognitionSummary } from '../api';
import { ViewType } from './Sidebar';
import { formatTime, confidenceLabel, plateOwner, Thumb } from './shared';

interface DashboardProps {
  summary: RecognitionSummary | null;
  history: RecognitionLog[];
  onNavigate: (v: ViewType) => void;
  onReload: () => void;
}

export function Dashboard({ summary, history, onNavigate, onReload }: DashboardProps) {
  const stats = [
    { label: 'Total Scans',      value: summary?.totalLogs     ?? 0, icon: BarChart3, color: 'var(--accent)',   bg: 'var(--accent-dim)' },
    { label: 'Xe đã đăng ký',   value: summary?.totalVehicles ?? 0, icon: Car,       color: '#34d399',          bg: 'var(--green-dim)' },
    { label: 'Chủ xe',           value: summary?.totalOwners   ?? 0, icon: Users,     color: '#c084fc',          bg: 'rgba(192,132,252,.1)' },
    { label: 'Camera',           value: summary?.totalCameras  ?? 0, icon: Camera,    color: 'var(--amber)',     bg: 'rgba(245,158,11,.1)' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Dashboard Overview</h2>
            <p>[System_status: Operational]</p>
          </div>
          <div className="page-header-actions">
            <span className="badge badge-green">
              <span className="status-dot pulse" />
              Live Data Feed
            </span>
            <button className="btn-icon" onClick={onReload} title="Tải lại">
              <RefreshCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid" style={{ marginBottom: 28 }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div className="metric-card" key={i}>
              <div className="metric-card-icon" style={{ background: s.bg, color: s.color }}>
                <Icon size={16} />
              </div>
              <div className="metric-card-label">{s.label}</div>
              <div className="metric-card-value">{s.value.toLocaleString()}</div>
              <div className="metric-card-sub" style={{ color: s.color }}>
                {s.value > 0 ? `${s.value} bản ghi` : 'Chưa có dữ liệu'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent detections */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Recent Detections</h3>
            <p>{history.length} bản ghi mới nhất</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('recognition')}>
              <Upload size={13} style={{ color: 'var(--accent)' }} />
              Upload
            </button>
            <button className="btn btn-accent-outline" onClick={() => onNavigate('camera')}>
              <Camera size={13} />
              Live Feed
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Biển số</th>
                <th>Chủ xe</th>
                <th>Địa phương</th>
                <th style={{ textAlign: 'right' }}>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 10).map(log => (
                <tr key={log.id}>
                  <td style={{ width: 90 }}>
                    <Thumb log={log} />
                  </td>
                  <td>
                    <strong>{log.plateNumber}</strong>
                    <small>{formatTime(log.recognizedAt)}</small>
                  </td>
                  <td>{plateOwner(log)}</td>
                  <td>{log.province || '--'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="badge badge-green">{confidenceLabel(log.confidence)} ACC</span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Chưa có lịch sử nhận diện.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}