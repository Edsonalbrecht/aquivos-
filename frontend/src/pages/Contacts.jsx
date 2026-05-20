import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, PhotoIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/Modal';

function ContactForm({ clients, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { client_id: '', name: '', email: '', phone: '', role: '', notes: '', photo_path: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const { data } = await api.post('/contacts/upload', formData);
      setForm(f => ({ ...f, photo_path: data.url }));
    } catch (err) {
      alert('Erro ao fazer upload da foto');
    }
  };

  const submit = async e => {
    e.preventDefault();
    if (initial?.id) await api.put(`/contacts/${initial.id}`, form);
    else await api.post('/contacts', form);
    onSave();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Upload de Foto */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="relative group">
          {form.photo_path ? (
            <img 
              src={`http://localhost:3001${form.photo_path}`} 
              alt="Preview" 
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/50" 
            />
          ) : (
            <UserCircleIcon className="w-16 h-16 text-gray-600" />
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <PhotoIcon className="w-6 h-6 text-white" />
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-200">Foto do contato</p>
          <p className="text-xs text-gray-500">Clique na imagem para alterar</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Cliente vinculado</label>
        <select value={form.client_id} onChange={set('client_id')} className="input">
          <option value="">— Nenhum —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Nome *</label>
          <input value={form.name} onChange={set('name')} required className="input" placeholder="Nome completo" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Cargo</label>
          <input value={form.role} onChange={set('role')} className="input" placeholder="Ex: Gerente" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Email</label>
          <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="email@exemplo.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Telefone</label>
          <input value={form.phone} onChange={set('phone')} className="input" placeholder="(00) 00000-0000" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: '#cbd5e1' }}>Observações</label>
        <textarea value={form.notes} onChange={set('notes')} rows={3} className="input" placeholder="Anotações sobre o contato..." />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">Salvar contato</button>
      </div>
    </form>
  );
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(false);

  const load = () => api.get('/contacts', { params: { search } }).then(r => setContacts(r.data));

  useEffect(() => { load(); }, [search]);
  useEffect(() => { api.get('/clients').then(r => setClients(r.data)); }, []);

  const handleExportVCF = async () => {
    try {
      const response = await api.get('/import/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contatos_nexus_${new Date().toISOString().split('T')[0]}.vcf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao exportar contatos.');
    }
  };

  const handleImportVCF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('updateExisting', updateExisting ? 'true' : 'false');
    try {
      const { data } = await api.post('/import/vcf', formData);
      alert(`Importação concluída!\n✅ Novos: ${data.count}\n🔄 Atualizados: ${data.updated}\n⏭️ Ignorados: ${data.skipped}`);
      load();
    } catch (err) {
      alert('Erro ao importar arquivo VCF.');
    }
  };

  const del = async id => {
    if (!confirm('Excluir contato?')) return;
    await api.delete(`/contacts/${id}`);
    load();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #f1f5f9, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Contatos
        </h2>
        <div className="flex gap-3 items-center">
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <ArrowUpTrayIcon style={{ width: 16, height: 16 }} /> Importar VCF
            <input type="file" accept=".vcf" onChange={handleImportVCF} className="hidden" />
          </label>
          <button onClick={handleExportVCF} className="btn-secondary flex items-center gap-2">
            <ArrowDownTrayIcon style={{ width: 16, height: 16 }} /> Exportar VCF
          </button>
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2">
            <PlusIcon style={{ width: 16, height: 16 }} /> Novo Contato
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contatos..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase" style={{ color: '#475569' }}>
            <tr>{['Nome', 'Cargo', 'Email', 'Telefone', 'Cliente', ''].map(h => (
              <th key={h} className="px-6 py-3 text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>{c.name}</td>
                <td className="px-6 py-4 text-gray-500">{c.role || '—'}</td>
                <td className="px-6 py-4 text-gray-500">{c.email || '—'}</td>
                <td className="px-6 py-4 text-gray-500">{c.phone || '—'}</td>
                <td className="px-6 py-4">
                  {c.client_id
                    ? <Link to={`/app/clients/${c.client_id}`} style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>{c.client_name}</Link>
                    : <span style={{ color: '#475569' }}>—</span>}
                </td>
                <td className="px-6 py-4 text-right" style={{ whiteSpace: 'nowrap' }}>
                  <button onClick={() => setModal({ type: 'edit', contact: c })} style={{ color: '#475569', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                    Editar
                  </button>
                  <button onClick={() => del(c.id)} style={{ color: '#475569', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '40px 24px', textAlign: 'center', color: '#475569' }}>Nenhum contato encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.type === 'create' ? 'Novo Contato' : 'Editar Contato'} onClose={() => setModal(null)}>
          <ContactForm clients={clients} initial={modal.contact} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
