import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from './Modal';

export default function AIEmailModal({ client, onClose }) {
  const [purpose, setPurpose] = useState('');
  const [tone, setTone] = useState('profissional e cordial');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const { data } = await api.post('/ai/email', {
        clientName: client.name,
        clientCompany: client.company,
        purpose,
        tone,
      });
      setResult(data.email);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar email.');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <Modal title="Gerar Email com IA" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          <SparklesIcon className="w-4 h-4" />
          Gerando email para <strong>{client.name}</strong>{client.company ? ` · ${client.company}` : ''}
        </div>

        <form onSubmit={generate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo do email *</label>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={3}
              required
              placeholder="Ex: Apresentar nossa proposta comercial, agendar uma reunião, fazer follow-up após reunião..."
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tom</label>
            <select value={tone} onChange={e => setTone(e.target.value)} className="input">
              <option>profissional e cordial</option>
              <option>formal</option>
              <option>descontraído</option>
              <option>persuasivo</option>
              <option>urgente</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            <SparklesIcon className="w-4 h-4" />
            {loading ? 'Gerando...' : 'Gerar Email'}
          </button>
        </form>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {result && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-700">Email gerado:</p>
              <button onClick={copy} className="text-xs text-blue-600 hover:underline">Copiar</button>
            </div>
            <pre className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
              {result}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
