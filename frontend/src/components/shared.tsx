import { FileImage, Loader2, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { ReactNode } from 'react';
import { RecognitionLog } from '../api';

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(value));
}

export function confidenceLabel(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${Math.round(value * 100)}%`;
}

export function plateOwner(log: RecognitionLog) {
  return log.vehicle?.owner?.fullName || 'Vãng lai';
}

export function Thumb({ log }: { log: RecognitionLog }) {
  const src = log.annotatedImagePath || log.imagePath;
  return (
    <div className="history-thumb">
      {src
        ? <img src={src} alt={log.plateNumber} />
        : <FileImage size={18} />
      }
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="loading-state">
      <Loader2 className="spin-ring" size={28} style={{ animation: 'spin .8s linear infinite' }} />
      <span>Đang tải dữ liệu...</span>
    </div>
  );
}

export function SearchField({
  value, placeholder, onChange, onSearch,
}: {
  value: string; placeholder: string;
  onChange: (v: string) => void; onSearch: () => void;
}) {
  return (
    <div className="search-wrap">
      <Search size={15} />
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch()}
      />
      <button className="search-btn" onClick={onSearch} title="Tìm">
        <RefreshCw size={13} />
      </button>
    </div>
  );
}

export function FormActions({ isEditing, onCancel }: { isEditing: boolean; onCancel: () => void }) {
  return (
    <div className="form-actions">
      <button className="btn btn-primary" type="submit" style={{ flex: 1, justifyContent: 'center' }}>
        {isEditing ? <Save size={14} /> : <Plus size={14} />}
        {isEditing ? 'Cập nhật' : 'Thêm mới'}
      </button>
      {isEditing && (
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          <X size={14} /> Hủy
        </button>
      )}
    </div>
  );
}

export function BtnEdit({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-icon" type="button" onClick={onClick} title="Sửa">
      <Pencil size={14} />
    </button>
  );
}
export function BtnDelete({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-icon danger" type="button" onClick={onClick} title="Xóa">
      <Trash2 size={14} />
    </button>
  );
}

export function CrudLayout({
  title, subtitle, search, form, children,
}: {
  title: string; subtitle: string;
  search: ReactNode; form: ReactNode; children: ReactNode;
}) {
  return (
    <div className="crud-grid">
      <div className="card">
        <div className="card-header">
          <div><h3>{title}</h3><p>{subtitle}</p></div>
          {search}
        </div>
        {children}
      </div>
      <div className="form-panel">
        <div className="form-panel-title">
          <Plus size={14} style={{ color: 'var(--accent)' }} />
          Biểu mẫu
        </div>
        {form}
      </div>
    </div>
  );
}
