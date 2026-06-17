import { useState } from 'react';
import { Calendar, Download, Search, Trash2 } from 'lucide-react';
import { CameraRecord, RecognitionLog, deleteRecognition, fetchRecognitionHistory } from '../api';
import { Thumb, confidenceLabel, formatTime, plateOwner } from './shared';

interface HistoryProps {
  history: RecognitionLog[];
  cameras: CameraRecord[];
  onHistoryChange: (logs: RecognitionLog[]) => void;
  onNotice: (msg: string) => void;
}

export function History({ history, cameras, onHistoryChange, onNotice }: HistoryProps) {
  const [filters, setFilters] = useState({ plateNumber: '', cameraId: '', from: '', to: '' });

  async function reload() {
    const logs = await fetchRecognitionHistory({ ...filters, limit: 100 });
    onHistoryChange(logs);
  }

  async function handleDelete(item: RecognitionLog) {
    if (!window.confirm(`Xóa log ${item.plateNumber}?`)) return;
    await deleteRecognition(item.id);
    onHistoryChange(history.filter(l => l.id !== item.id));
    onNotice('Đã xóa dữ liệu.');
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Bảng lịch sử nhận diện</h2>
            <p>[Archive: Detection_Database]</p>
          </div>
          <button className="btn btn-secondary">
            <Download size={13} style={{ color: 'var(--accent)' }} /> Export CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-row">
          <div className="search-wrap">
            <Search size={14} />
            <input
              placeholder="TÌM BIỂN SỐ..."
              value={filters.plateNumber}
              onChange={e => setFilters(f => ({ ...f, plateNumber: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && reload()}
            />
          </div>
          <select value={filters.cameraId} onChange={e => setFilters(f => ({ ...f, cameraId: e.target.value }))}>
            <option value="">Tất cả camera</option>
            {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px' }}>
            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} style={{ border: 'none', background: 'transparent', padding: '8px 0', width: 120 }} />
            <span style={{ color: 'var(--text-muted)' }}>-</span>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} style={{ border: 'none', background: 'transparent', padding: '8px 0', width: 120 }} />
          </div>
          <button className="btn btn-accent-outline" onClick={reload}>
            <Search size={13} /> Lọc dữ liệu
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
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id}>
                  <td style={{ width: 90 }}><Thumb log={item} /></td>
                  <td>
                    <strong>{item.plateNumber}</strong>
                    <small>{item.province || 'Chưa rõ địa phương'}</small>
                  </td>
                  <td>{plateOwner(item)}</td>
                  <td>{item.camera?.name || '--'}</td>
                  <td><span className="badge badge-green">{confidenceLabel(item.confidence)}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{formatTime(item.recognizedAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon danger" onClick={() => handleDelete(item)} title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chưa có dữ liệu.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Hiển thị {history.length} kết quả
          </span>
        </div>
      </div>
    </div>
  );
}
