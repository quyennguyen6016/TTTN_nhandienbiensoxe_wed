import { FormEvent, useState } from 'react';
import { Database, Gauge, Power, ShieldCheck } from 'lucide-react';
import {
  API_BASE_URL, CameraPayload, CameraRecord,
  deleteCamera, fetchCameras, saveCamera, setCameraActive,
} from '../api';
import { BtnDelete, BtnEdit, CrudLayout, FormActions, SearchField } from './shared';

const empty: CameraPayload = { name: '', sourceUrl: 'browser-webcam', location: '', isActive: true };

type ServerState = 'checking' | 'active' | 'offline';

interface SettingsProps {
  cameras: CameraRecord[];
  serverState: ServerState;
  onCamerasChange: (c: CameraRecord[]) => void;
  onNotice: (msg: string) => void;
}

export function Settings({ cameras, serverState, onCamerasChange, onNotice }: SettingsProps) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CameraPayload>(empty);
  const [editingId, setEditingId] = useState<number | undefined>();

  function set<K extends keyof CameraPayload>(k: K, v: CameraPayload[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSearch() { onCamerasChange(await fetchCameras(search)); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const saved = await saveCamera(form, editingId);
    onCamerasChange([saved, ...cameras.filter(c => c.id !== saved.id)]);
    setForm(empty); setEditingId(undefined);
    onNotice('Đã lưu camera.');
  }

  function startEdit(c: CameraRecord) {
    setEditingId(c.id);
    setForm({ name: c.name, sourceUrl: c.sourceUrl || '', location: c.location || '', isActive: c.isActive });
  }

  async function handleDelete(c: CameraRecord) {
    if (!window.confirm(`Xóa camera ${c.name}?`)) return;
    await deleteCamera(c.id);
    onCamerasChange(cameras.filter(i => i.id !== c.id));
    onNotice('Đã xóa dữ liệu.');
  }

  async function handleToggle(c: CameraRecord) {
    const saved = await setCameraActive(c.id, !c.isActive);
    onCamerasChange(cameras.map(i => i.id === saved.id ? saved : i));
  }

  const configItems = [
    { icon: Database, label: 'API Base URL',  value: API_BASE_URL },
    { icon: Gauge,    label: 'AI Core',       value: 'YOLO + PaddleOCR qua Node.js backend' },
    { icon: Power,    label: 'Trạng thái API', value: serverState === 'active' ? 'ONLINE' : serverState === 'offline' ? 'OFFLINE' : 'CHECKING...' },
    { icon: ShieldCheck, label: 'Security',   value: 'AES-256 ACTIVE' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Cấu hình hệ thống</h2>
        <p>[Module: System_Configuration]</p>
      </div>

      {/* Runtime config panel */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h3>Runtime Config</h3>
            <p>Các giá trị hệ thống đang sử dụng.</p>
          </div>
          <span className={`badge ${serverState === 'active' ? 'badge-green' : serverState === 'offline' ? 'badge-red' : 'badge-amber'}`}>
            <span className="status-dot pulse" />
            {serverState === 'active' ? 'System Online' : serverState === 'offline' ? 'Offline' : 'Checking...'}
          </span>
        </div>
        <div className="config-list">
          {configItems.map(({ icon: Icon, label, value }) => (
            <div className="config-item" key={label}>
              <div className="config-item-icon"><Icon size={16} /></div>
              <div className="config-item-text">
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Camera CRUD */}
      <CrudLayout
        title="Quản lý Camera" subtitle="Cấu hình nguồn camera cho upload và realtime."
        search={<SearchField value={search} placeholder="Tên, vị trí, nguồn..." onChange={setSearch} onSearch={handleSearch} />}
        form={
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="form-label">Tên camera
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Cổng chính" />
            </label>
            <label className="form-label">Nguồn (Source URL)
              <input value={form.sourceUrl} onChange={e => set('sourceUrl', e.target.value)} placeholder="browser-webcam / rtsp://..." />
            </label>
            <label className="form-label">Vị trí
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Cổng Tây, Sân B..." />
            </label>
            <label className="form-label check-row">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
              Đang hoạt động
            </label>
            <FormActions isEditing={Boolean(editingId)} onCancel={() => { setForm(empty); setEditingId(undefined); }} />
          </form>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tên camera</th>
                <th>Nguồn</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Option</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>ID #{c.id}</small>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{c.sourceUrl || '--'}</td>
                  <td>{c.location || '--'}</td>
                  <td>
                    <button
                      className={`toggle-pill ${c.isActive ? 'on' : 'off'}`}
                      onClick={() => handleToggle(c)}
                    >
                      {c.isActive ? 'Bật' : 'Tắt'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <BtnEdit onClick={() => startEdit(c)} />
                      <BtnDelete onClick={() => handleDelete(c)} />
                    </div>
                  </td>
                </tr>
              ))}
              {cameras.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chưa có camera nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CrudLayout>
    </div>
  );
}
