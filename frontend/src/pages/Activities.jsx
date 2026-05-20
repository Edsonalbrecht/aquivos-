import { useEffect, useState } from 'react';
import { PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/Modal';

const TYPES = ['Tarefa', 'Ligação', 'Email', 'Reunião', 'Visita'];
const TYPE_COLORS = { Tarefa: 'bg-blue-100 text-blue-700', Ligação: 'bg-green-100 text-green-700', Email: 'bg-purple-100 text-purple-700', Reunião: 'bg-amber-100 text-amber-700', Visita: 'bg-rose-100 text-rose-700' };

function ActivityForm({ clients, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { type: 'Tarefa', title: '', description: '', client_id: '', due_date: '', completed: false });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (initial?.id) await api.put(`/activities/${initial.id}`, form);
    else await api.post('/activities', form);
    onSave();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select value={form.type} onChange={set('type')} className="input">
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <select value={form.client_id} onChange={set('client_id')} className="input">
            <option value="">— Nenhum —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input value={form.title} onChange={set('title')} required className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Data/Hora</label>
        <input type="datetime-local" value={form.due_date} onChange={set('due_date')} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
        <textarea value={form.description} onChange={set('description')} rows={3} className="input" />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">Salvar</button>
      </div>
    </form>
  );
}

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [modal, setModal] = useState(null);

  const load = async () => {
    const [a, c] = await Promise.all([
      api.get('/activities', { params: { completed: filter === 'done' ? 'true' : filter === 'pending' ? 'false' : undefined } }),
      api.get('/clients')
    ]);
    setActivities(a.data);
    setClients(c.data);
  };

  useEffect(() => { load(); }, [filter]);

  const complete = async id => {
    await api.patch(`/activities/${id}/complete`);
    load();
  };

  const del = async id => {
    if (!confirm('Excluir atividade?')) return;
    await api.delete(`/activities/${id}`);
    load();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Atividades</h2>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Nova Atividade
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[['pending', 'Pendentes'], ['done', 'Concluídas'], ['all', 'Todas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {activities.length === 0 && <div className="text-center py-10 text-gray-400">Nenhuma atividade encontrada</div>}
        {activities.map(a => (
          <div key={a.id} className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start gap-4 ${a.completed ? 'opacity-60' : ''}`}>
            <button onClick={() => !a.completed && complete(a.id)} className={`mt-0.5 flex-shrink-0 ${a.completed ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}>
              <CheckCircleIcon className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type] || 'bg-gray-100 text-gray-600'}`}>{a.type}</span>
                {a.client_name && <span className="text-xs text-gray-400">{a.client_name}</span>}
                {a.deal_title && <span className="text-xs text-gray-400">· {a.deal_title}</span>}
              </div>
              <p className={`font-medium text-gray-800 ${a.completed ? 'line-through' : ''}`}>{a.title}</p>
              {a.description && <p className="text-sm text-gray-500 mt-1">{a.description}</p>}
              {a.due_date && (
                <p className={`text-xs mt-1 ${!a.completed && new Date(a.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {new Date(a.due_date).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal({ activity: a })} className="text-xs text-gray-400 hover:text-blue-600">Editar</button>
              <button onClick={() => del(a.id)} className="text-xs text-gray-400 hover:text-red-600">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal?.activity ? 'Editar Atividade' : 'Nova Atividade'} onClose={() => setModal(null)}>
          <ActivityForm clients={clients} initial={modal?.activity} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
