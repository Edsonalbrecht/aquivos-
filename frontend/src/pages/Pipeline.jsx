import { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/Modal';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function DealForm({ stages, clients, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { title: '', client_id: '', stage_id: stages[0]?.id || '', value: '', expected_close: '', notes: '', status: 'open' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (initial?.id) await api.put(`/deals/${initial.id}`, form);
    else await api.post('/deals', form);
    onSave();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input value={form.title} onChange={set('title')} required className="input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
          <select value={form.stage_id} onChange={set('stage_id')} className="input">
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
          <input type="number" value={form.value} onChange={set('value')} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <select value={form.client_id} onChange={set('client_id')} className="input">
            <option value="">— Selecione —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de Fechamento</label>
          <input type="date" value={form.expected_close} onChange={set('expected_close')} className="input" />
        </div>
        {initial && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')} className="input">
              <option value="open">Aberto</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea value={form.notes} onChange={set('notes')} rows={2} className="input" />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">Salvar</button>
      </div>
    </form>
  );
}

export default function Pipeline() {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);

  const load = async () => {
    const [s, d, c] = await Promise.all([
      api.get('/deals/stages'),
      api.get('/deals', { params: { status: 'open' } }),
      api.get('/clients')
    ]);
    setStages(s.data);
    setDeals(d.data);
    setClients(c.data);
  };

  useEffect(() => { load(); }, []);

  const moveStage = async (dealId, stageId) => {
    await api.patch(`/deals/${dealId}/stage`, { stage_id: stageId });
    load();
  };

  const del = async id => {
    if (!confirm('Excluir negócio?')) return;
    await api.delete(`/deals/${id}`);
    load();
  };

  const dealsByStage = stageId => deals.filter(d => d.stage_id === stageId);

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pipeline</h2>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Novo Negócio
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageDeals = dealsByStage(stage.id);
          const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
          return (
            <div key={stage.id} className="flex-shrink-0 w-72 bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: stage.color }} />
                  <h3 className="font-semibold text-gray-700 text-sm">{stage.name}</h3>
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{stageDeals.length}</span>
                </div>
                <span className="text-xs text-gray-400">{fmt(stageValue)}</span>
              </div>
              <div className="space-y-3">
                {stageDeals.map(deal => (
                  <div key={deal.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-800 text-sm leading-snug">{deal.title}</p>
                      <button onClick={() => setModal({ type: 'edit', deal })} className="text-gray-300 hover:text-blue-500 text-xs ml-2 flex-shrink-0">✎</button>
                    </div>
                    {deal.client_name && <p className="text-xs text-gray-400 mt-1">{deal.client_name}</p>}
                    {deal.value > 0 && <p className="text-sm font-semibold text-gray-700 mt-2">{fmt(deal.value)}</p>}
                    {deal.expected_close && <p className="text-xs text-gray-400 mt-1">Fecha: {new Date(deal.expected_close).toLocaleDateString('pt-BR')}</p>}
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {stages.filter(s => s.id !== stage.id).map(s => (
                        <button key={s.id} onClick={() => moveStage(deal.id, s.id)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-400 transition-colors">
                          → {s.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => del(deal.id)} className="text-xs text-red-300 hover:text-red-500 mt-2">Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal.type === 'create' ? 'Novo Negócio' : 'Editar Negócio'} onClose={() => setModal(null)}>
          <DealForm stages={stages} clients={clients} initial={modal.deal} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
