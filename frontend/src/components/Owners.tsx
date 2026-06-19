import { FormEvent, useState } from 'react';
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Owner, OwnerPayload, deleteOwner, fetchOwners, saveOwner } from '../api';
import { BtnDelete, BtnEdit, CrudLayout, FormActions, SearchField } from './shared';

const empty: OwnerPayload = { fullName: '', phone: '', email: '', address: '' };

interface OwnersProps {
  owners: Owner[];
  onOwnersChange: (o: Owner[]) => void;
  onNotice: (msg: string) => void;
  isAdmin: boolean;   // ← thêm dòng này
}

export function Owners({ owners, onOwnersChange, onNotice }: OwnersProps) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<OwnerPayload>(empty);
  const [editingId, setEditingId] = useState<number | undefined>();

  function set<K extends keyof OwnerPayload>(k: K, v: OwnerPayload[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSearch() { onOwnersChange(await fetchOwners(search)); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const saved = await saveOwner(form, editingId);
    onOwnersChange([saved, ...owners.filter(o => o.id !== saved.id)]);
    setForm(empty); setEditingId(undefined);
    onNotice('Đã lưu chủ xe.');
  }

  function startEdit(o: Owner) {
    setEditingId(o.id);
    setForm({ fullName: o.fullName, phone: o.phone || '', email: o.email || '', address: o.address || '' });
  }

  async function handleDelete(o: Owner) {
    if (!window.confirm(`Xóa chủ xe ${o.fullName}?`)) return;
    await deleteOwner(o.id);
    onOwnersChange(owners.filter(i => i.id !== o.id));
    onNotice('Đã xóa dữ liệu.');
  }

  return (
    <div>
      <div className="page-header">
        <h2>Quản lý chủ xe</h2>
        <p>[Identity: Personnel_Directory]</p>
      </div>

      <CrudLayout
        title="Danh sách chủ xe" subtitle="Lưu hồ sơ chủ xe để đối chiếu khi nhận diện biển số."
        search={<SearchField value={search} placeholder="Tên, điện thoại, email..." onChange={setSearch} onSearch={handleSearch} />}
        form={
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="form-label">Họ và tên
              <input required value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="VD: Nguyễn Ngọc Quyền" />
            </label>
            <label className="form-label">Số điện thoại
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="091xxxxxxx" />
            </label>
            <label className="form-label">Email
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@example.com" />
            </label>
            <label className="form-label wide">Địa chỉ
              <textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Phường, Quận, Tỉnh/Thành..." />
            </label>
            <FormActions isEditing={Boolean(editingId)} onCancel={() => { setForm(empty); setEditingId(undefined); }} />
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
                <th style={{ textAlign: 'right' }}>Option</th>
              </tr>
            </thead>
            <tbody>
              {owners.map(o => (
                <tr key={o.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 900, fontSize: 13 }}>
                        {o.fullName.charAt(0)}
                      </div>
                      <div>
                        <strong style={{ fontStyle: 'italic' }}>{o.fullName}</strong>
                        <small>ID: #{o.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      {o.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)' }}><Phone size={11} style={{ color: 'var(--text-muted)' }} />{o.phone}</span>}
                      {o.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}><Mail size={11} style={{ color: 'var(--text-muted)' }} />{o.email}</span>}
                      {!o.phone && !o.email && '--'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      <MapPin size={11} />
                      {o.address || '--'}
                    </div>
                  </td>
                  <td>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                      {o.vehicles?.length ?? 0}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <BtnEdit onClick={() => startEdit(o)} />
                      <BtnDelete onClick={() => handleDelete(o)} />
                    </div>
                  </td>
                </tr>
              ))}
              {owners.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chưa có chủ xe nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Security note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderTop: '1px solid var(--border)', borderLeft: '2px solid var(--accent)', background: 'var(--accent-dim)' }}>
          <ShieldCheck size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
            Dữ liệu chủ xe được mã hóa theo giao thức PV-SEC. Chỉ truy cập khi được cấp quyền operator.
          </p>
        </div>
      </CrudLayout>
    </div>
  );
}
