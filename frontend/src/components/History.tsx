import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Search, Trash2 } from 'lucide-react';
import { CameraRecord, Pagination, RecognitionLog, deleteRecognition, fetchRecognitionHistory } from '../api';
import { Thumb, confidenceLabel, formatTime, plateOwner } from './shared';

interface HistoryProps {
  history: RecognitionLog[];
  cameras: CameraRecord[];
  onHistoryChange: (logs: RecognitionLog[]) => void;
  onNotice: (msg: string) => void;
  readOnly?: boolean;
  // Phân trang — truyền từ ngoài vào để App.tsx kiểm soát chung cho cả USER/ADMIN
  pagination?: Pagination;
  // USER: App.tsx tự fetch và set lại history + pagination
  onPageChange?: (page: number) => void;
  // ADMIN: History.tsx tự fetch (vì còn filter), chỉ cần đồng bộ pagination lên App.tsx
  onPaginationUpdate?: (pagination: Pagination) => void;
}

const PAGE_SIZE_DEFAULT = 50;

export function History({
  history, cameras, onHistoryChange, onNotice, readOnly = false,
  pagination, onPageChange, onPaginationUpdate,
}: HistoryProps) {
  const [filters, setFilters] = useState({ plateNumber: '', cameraId: '', from: '', to: '' });

  async function reload(page = 1) {
    if (readOnly) {
      // USER: App.tsx chịu trách nhiệm fetch lại qua handleMyHistoryPageChange
      onPageChange?.(page);
      return;
    }
    // ADMIN: tự fetch tại đây vì còn áp dụng filter (plateNumber, camera, ngày)
    const { logs, pagination: p } = await fetchRecognitionHistory({
      ...filters, page, pageSize: PAGE_SIZE_DEFAULT,
    });
    onHistoryChange(logs);
    onPaginationUpdate?.(p);
  }

  async function handleDelete(item: RecognitionLog) {
    if (!window.confirm(`Xóa log ${item.plateNumber}?`)) return;
    await deleteRecognition(item.id);
    onHistoryChange(history.filter(l => l.id !== item.id));
    onNotice('Đã xóa dữ liệu.');
  }

  const page       = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const totalCount = pagination?.totalCount ?? history.length;

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    reload(p);
  }

  // Tạo danh sách số trang hiển thị (tối đa 5 nút, có dấu ... khi nhiều trang)
  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>{readOnly ? 'Lịch sử xe của tôi' : 'Bảng lịch sử nhận diện'}</h2>
            <p>{readOnly ? '[My_Vehicle_History]' : '[Archive: Detection_Database]'}</p>
          </div>
          {!readOnly && (
            <button className="btn btn-secondary">
              <Download size={13} style={{ color: 'var(--accent)' }} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {/* Filter row */}
        <div className="filter-row">
          <div className="search-wrap">
            <Search size={14} />
            <input
              placeholder="TÌM BIỂN SỐ..."
              value={filters.plateNumber}
              onChange={e => setFilters(f => ({ ...f, plateNumber: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && !readOnly && reload(1)}
            />
          </div>

          {!readOnly && cameras.length > 0 && (
            <select
              value={filters.cameraId}
              onChange={e => setFilters(f => ({ ...f, cameraId: e.target.value }))}
            >
              <option value="">Tất cả camera</option>
              {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px' }}>
            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} style={{ border: 'none', background: 'transparent', padding: '8px 0', width: 120 }} />
            <span style={{ color: 'var(--text-muted)' }}>-</span>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} style={{ border: 'none', background: 'transparent', padding: '8px 0', width: 120 }} />
          </div>

          {!readOnly && (
            <button className="btn btn-accent-outline" onClick={() => reload(1)}>
              <Search size={13} /> Lọc dữ liệu
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Biển số</th>
                <th>Chủ xe</th>
                <th>Địa phương</th>
                {!readOnly && <th>Camera</th>}
                <th>Tin cậy</th>
                <th>Thời gian</th>
                {!readOnly && <th style={{ textAlign: 'right' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id}>
                  <td style={{ width: 90 }}><Thumb log={item} /></td>
                  <td>
                    <strong>{item.plateNumber}</strong>
                    <small>{item.normalizedPlateNumber}</small>
                  </td>
                  <td>
                    {plateOwner(item) === 'Vãng lai' && readOnly
                      ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11 }}>—</span>
                      : plateOwner(item)}
                  </td>
                  <td>{item.province ? item.province : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  {!readOnly && <td>{item.camera?.name || '--'}</td>}
                  <td><span className="badge badge-green">{confidenceLabel(item.confidence)}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{formatTime(item.recognizedAt)}</td>
                  {!readOnly && (
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon danger" onClick={() => handleDelete(item)} title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 6 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {readOnly ? 'Chưa có lịch sử nhận diện xe của bạn.' : 'Chưa có dữ liệu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer: tổng số kết quả + điều hướng trang ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Trang {page}/{totalPages} · {totalCount} kết quả
          </span>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn-icon"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                title="Trang trước"
                style={{ opacity: page <= 1 ? .4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: 12 }}>···</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    style={{
                      minWidth: 30, height: 30, padding: '0 6px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: p === page ? 'var(--accent)' : 'var(--bg-card)',
                      color: p === page ? '#fff' : 'var(--text-dim)',
                      fontSize: 11, fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                className="btn-icon"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                title="Trang sau"
                style={{ opacity: page >= totalPages ? .4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}