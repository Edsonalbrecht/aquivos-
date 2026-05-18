import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlusIcon, ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/Modal';
import AIEmailModal from '../components/AIEmailModal';

function ContactForm({ clientId, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', email: '', phone: '', role: '', notes: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async e => {
    e.preventDefault();
    if (initial?.id) await api.put(`/contacts/${initial.id}`, form);
    else await api.post('/contacts', { ...form, client_id: clientId });
    onSave();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input value={form.name} onChange={set('name')} required className="input" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label><input value={form.role} onChange={set('role')} className="input" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={set('email')} className="input" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label><input value={form.phone} onChange={set('phone')} className="input" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea value={form.notes} onChange={set('notes')} rows={2} className="input" /></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
    </form>
  );
}

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [modal, setModal] = useState(null);

  const load = () => api.get(`/clients/${id}`).then(r => setClient(r.data));
  useEffect(() => { load(); }, [id]);

  if (!client) return <div className="flex items-center justify-center h-full text-gray-400">Carregando...</div>;

  return (
    <div className="p-8 space-y-6">
      <Link to="/app/clients" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeftIcon className="w-4 h-4" /> Voltar para Clientes
      </Link>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            {client.company && <p className="text-gray-500">{client.company}</p>}
            <div className="flex gap-4 mt-2 text-sm text-gray-400">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
              {client.city && <span>{client.city}{client.state ? `, ${client.state}` : ''}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setModal({ type: 'email' })} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors">
              <SparklesIcon className="w-4 h-4" /> Gerar Email com IA
            </button>
            <span className={`px-3 py-1 rounded-full text-sm ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {client.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
        {client.notes && <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{client.notes}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">Contatos ({client.contacts?.length || 0})</h3>
          <button onClick={() => setModal({ type: 'contact' })} className="btn-primary flex items-center gap-2 text-xs py-1.5">
            <PlusIcon className="w-3 h-3" /> Adicionar
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {client.contacts?.length === 0 && <p className="px-6 py-4 text-sm text-gray-400">Nenhum contato</p>}
          {client.contacts?.map(c => (
            <div key={c.id} className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{c.name}</p>
                <p className="text-sm text-gray-400">{c.role && `${c.role} · `}{c.email}{c.phone && ` · ${c.phone}`}</p>
              </div>
              <button onClick={() => setModal({ type: 'contact', contact: c })} className="text-xs text-gray-400 hover:text-blue-600">Editar</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">Negócios ({client.deals?.length || 0})</h3>
          <Link to="/app/pipeline" className="text-sm text-blue-600 hover:underline">Ver pipeline</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Título', 'Etapa', 'Valor', 'Status'].map(h => <th key={h} className="px-6 py-3 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {client.deals?.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">Nenhum negócio</td></tr>}
            {client.deals?.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{d.title}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs" style={{ background: d.stage_color + '22', color: d.stage_color }}>{d.stage_name}</span></td>
                <td className="px-6 py-4">{fmt(d.value)}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${d.status === 'won' ? 'bg-green-100 text-green-700' : d.status === 'lost' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{d.status === 'won' ? 'Ganho' : d.status === 'lost' ? 'Perdido' : 'Aberto'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'email' && (
        <AIEmailModal client={client} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'contact' && (
        <Modal title={modal.contact ? 'Editar Contato' : 'Novo Contato'} onClose={() => setModal(null)}>
          <ContactForm clientId={id} initial={modal.contact} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
