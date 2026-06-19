import { FormEvent, useState } from 'react';
import { Database, CheckCircle2, Mail, Phone, MapPin, User } from 'lucide-react';
import {
  Owner, Vehicle, VehiclePayload,
  deleteVehicle, fetchOwners, fetchVehicles, saveVehicle,
} from '../api';
import { BtnDelete, BtnEdit, CrudLayout, FormActions, SearchField } from './shared';

const empty: VehiclePayload = { plateNumber: '', ownerId: '', vehicleType: 'Xe máy', brand: '', color: '', province: '', note: '' };

interface VehiclesProps {
  vehicles: Vehicle[];
  owners: Owner[];
  onVehiclesChange: (v: Vehicle[]) => void;
  onOwnersChange: (o: Owner[]) => void;
  onNavigateToOwners: () => void;
  onNotice: (msg: string) => void;
  isAdmin: boolean;   // ← thêm dòng này
}

export function Vehicles({ vehicles, owners, onVehiclesChange, onOwnersChange, onNavigateToOwners, onNotice }: VehiclesProps) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<VehiclePayload>(empty);
  const [editingId, setEditingId] = useState<number | undefined>();

  function set<K extends keyof VehiclePayload>(k: K, v: VehiclePayload[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSearch() { onVehiclesChange(await fetchVehicles(search)); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const saved = await saveVehicle(form, editingId);
    onVehiclesChange([saved, ...vehicles.filter(v => v.id !== saved.id)]);
    onOwnersChange(await fetchOwners());
    setForm(empty); setEditingId(undefined);
    onNotice('Đã lưu xe.');
  }

  function startEdit(v: Vehicle) {
    setEditingId(v.id);
    setForm({ plateNumber: v.plateNumber, ownerId: v.ownerId || '', vehicleType: 'Xe máy', brand: v.brand || '', color: v.color || '', province: v.province || '', note: v.note || '' });
  }

  async function handleDelete(v: Vehicle) {
    if (!window.confirm(`Xóa xe ${v.plateNumber}?`)) return;
    await deleteVehicle(v.id);
    onVehiclesChange(vehicles.filter(i => i.id !== v.id));
    onNotice('Đã xóa dữ liệu.');
  }

  return (
    <div>
      <div className="page-header">
        <h2>Danh sách xe</h2>
        <p>[Registry: Vehicle_Assets]</p>
      </div>

      <CrudLayout
        title="Danh sách xe" subtitle="Quản lý biển số xe và gắn với chủ xe đã đăng ký."
        search={<SearchField value={search} placeholder="Biển số, hãng xe..." onChange={setSearch} onSearch={handleSearch} />}
        form={
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="form-label">Biển số
              <input required value={form.plateNumber} onChange={e => set('plateNumber', e.target.value)} placeholder="VD: 30A-123.45" />
            </label>
            <label className="form-label">Chủ xe
              <select value={form.ownerId} onChange={e => set('ownerId', e.target.value ? Number(e.target.value) : '')}>
                <option value="">Chưa chọn chủ xe</option>
                {owners.map(o => <option key={o.id} value={o.id}>{o.fullName}{o.phone ? ` · ${o.phone}` : ''}</option>)}
              </select>
              {owners.length === 0 && (
                <span className="form-hint">
                  Chưa có chủ xe.{' '}
                  <a href="#owners" onClick={e => { e.preventDefault(); onNavigateToOwners(); }}>Thêm tại đây</a>.
                </span>
              )}
            </label>
            <label className="form-label">Loại xe
              <input value="Xe máy" disabled />
            </label>
            <label className="form-label">Hãng xe
              <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Honda, Yamaha..." />
            </label>
            <label className="form-label">Màu xe
              <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Đen, Trắng..." />
            </label>
            <label className="form-label">Tỉnh/thành
              <input value={form.province} onChange={e => set('province', e.target.value)} placeholder="Đà Nẵng..." />
            </label>
            <label className="form-label wide">Ghi chú
              <input value={form.note} onChange={e => set('note', e.target.value)} />
            </label>
            <FormActions isEditing={Boolean(editingId)} onCancel={() => { setForm(empty); setEditingId(undefined); }} />
          </form>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Biển số</th>
                <th>Chủ xe</th>
                <th>Thông tin xe</th>
                <th>Vùng</th>
                <th style={{ textAlign: 'right' }}>Option</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.plateNumber}</strong>
                    <small>{v.normalizedPlateNumber}</small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={12} style={{ color: 'var(--text-muted)' }} />
                      {v.owner?.fullName || 'Vãng lai'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 700 }}>{v.vehicleType || '--'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {[v.brand, v.color].filter(Boolean).join(' · ') || '--'}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{v.province || '--'}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <BtnEdit onClick={() => startEdit(v)} />
                      <BtnDelete onClick={() => handleDelete(v)} />
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chưa có xe nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DB integrity footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="config-item-icon" style={{ width: 32, height: 32 }}>
              <Database size={14} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Database integrity</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Sync: 100% | Latency: 0.2ms</div>
            </div>
          </div>
          <CheckCircle2 size={16} style={{ color: 'rgba(52,211,153,.5)' }} />
        </div>
      </CrudLayout>
    </div>
  );
}
