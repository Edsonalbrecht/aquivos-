import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/Modal';

function ClientForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', email: '', phone: '', company: '', city: '', state: '', notes: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (initial?.id) await api.put(`/clients/${initial.id}`, form);
    else await api.post('/clients', form);
    onSave();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input value={form.name} onChange={set('name')} required className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <input value={form.company} onChange={set('company')} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={set('email')} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input value={form.phone} onChange={set('phone')} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input value={form.city} onChange={set('city')} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <input value={form.state} onChange={set('state')} className="input" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea value={form.notes} onChange={set('notes')} rows={3} className="input" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">Salvar</button>
      </div>
    </form>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const load = () => api.get('/clients', { params: { search } }).then(r => setClients(r.data));

  useEffect(() => { load(); }, [search]);

  const del = async id => {
    if (!confirm('Excluir cliente?')) return;
    await api.delete(`/clients/${id}`);
    load();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar clientes..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Nome', 'Empresa', 'Email', 'Telefone', 'Cidade', 'Status', ''].map(h => (
                <th key={h} className="px-6 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">
                  <Link to={`/app/clients/${c.id}`} className="text-blue-600 hover:underline">{c.name}</Link>
                </td>
                <td className="px-6 py-4 text-gray-500">{c.company || '—'}</td>
                <td className="px-6 py-4 text-gray-500">{c.email || '—'}</td>
                <td className="px-6 py-4 text-gray-500">{c.phone || '—'}</td>
                <td className="px-6 py-4 text-gray-500">{c.city || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => setModal({ type: 'edit', client: c })} className="text-gray-400 hover:text-blue-600 text-xs">Editar</button>
                  <button onClick={() => del(c.id)} className="text-gray-400 hover:text-red-600 text-xs">Excluir</button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Nenhum cliente encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.type === 'create' ? 'Novo Cliente' : 'Editar Cliente'} onClose={() => setModal(null)}>
          <ClientForm initial={modal.client} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
