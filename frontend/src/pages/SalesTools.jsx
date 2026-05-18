import { useState, useRef } from 'react';
import {
  CalculatorIcon, ChatBubbleLeftRightIcon, BuildingOfficeIcon,
  DocumentTextIcon, LightBulbIcon, MapPinIcon, CheckCircleIcon,
  XCircleIcon, SparklesIcon, PrinterIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

// ── DADOS DO CLUBE CANDEIAS ──────────────────────────────────────────────────
const PROPRIEDADES = [
  { nome: 'Candeias Central Balneário Camboriú', cidade: 'Balneário Camboriú', estado: 'SC', tipo: 'Residencial', destaque: 'Praia, aquaparque, beira-mar' },
  { nome: 'Candeias Residencial Conjunto Tértius', cidade: 'Balneário Camboriú', estado: 'SC', tipo: 'Residencial', destaque: 'Estrutura completa, apartamentos amplos' },
  { nome: 'Candeias Residencial Âncora', cidade: 'Bombinhas', estado: 'SC', tipo: 'Residencial', destaque: 'Praias paradisíacas, mergulho' },
  { nome: 'Candeias Parador da Cachoeira', cidade: 'Florianópolis', estado: 'SC', tipo: 'Parador', destaque: 'Natureza, cachoeiras, Ilha da Magia' },
  { nome: 'Candeias Residencial Caiobá', cidade: 'Matinhos', estado: 'PR', tipo: 'Residencial', destaque: 'Litoral paranaense, família' },
  { nome: 'Candeias Residencial Guarujá', cidade: 'Guarujá', estado: 'SP', tipo: 'Residencial', destaque: 'Litoral paulista, praias famosas' },
  { nome: 'Candeias Residencial Ubatuba', cidade: 'Ubatuba', estado: 'SP', tipo: 'Residencial', destaque: 'Mata Atlântica, praias selvagens' },
  { nome: 'Candeias Residencial Barzotto', cidade: 'Capão da Canoa', estado: 'RS', tipo: 'Residencial', destaque: 'Litoral gaúcho, tranquilidade' },
  { nome: 'Candeias Gold Fish', cidade: 'Corumbá', estado: 'MS', tipo: 'Resort', destaque: 'Pantanal, pesca esportiva, natureza' },
];

const DESTINOS_TOP = [
  { nome: 'Balneário Camboriú', uf: 'SC', atrativo: 'Maior roda-gigante da América Latina, praias e vida noturna' },
  { nome: 'Balneário Piçarras', uf: 'SC', atrativo: 'Berço do Candeias (1968), praias tranquilas, familiar' },
  { nome: 'Florianópolis', uf: 'SC', atrativo: 'Ilha da Magia, 42 praias, gastronomia e cultura' },
  { nome: 'Bombinhas', uf: 'SC', atrativo: 'Mergulho, praias cristalinas, reserva ambiental' },
  { nome: 'Foz do Iguaçu', uf: 'PR', atrativo: 'Cataratas do Iguaçu, parque das aves, fronteira tríplice' },
  { nome: 'Bonito', uf: 'MS', atrativo: 'Ecoturismo, flutuação em rios cristalinos, grutas' },
  { nome: 'Barra Velha', uf: 'SC', atrativo: 'Praias calmas, pesca, turismo familiar' },
];

const OBJECOES = [
  {
    objecao: '"Está caro demais"',
    resposta: 'Entendo! Mas veja: uma família que viaja 1x por ano gasta em média R$3.000 a R$8.000 em hospedagem. Com o Clube Candeias, esse custo cai até 70%. Em 2 ou 3 viagens você já recupera o investimento — e o clube dura a vida toda.',
    dica: 'Use a calculadora de economia para mostrar os números concretos.',
  },
  {
    objecao: '"Vou pensar e te ligo"',
    resposta: 'Claro, respeito sua decisão! Mas me deixa te mostrar uma coisa rápida: o clube tem +56 anos de tradição e é usado por famílias em todo o Brasil. O que exatamente você precisa pensar? Posso te ajudar com qualquer dúvida agora mesmo.',
    dica: 'Identifique a objeção real: preço, confiança ou falta de necessidade.',
  },
  {
    objecao: '"Não tenho dinheiro agora"',
    resposta: 'Perfeito, temos condições especiais de parcelamento! E o interessante é: quanto antes você entra, mais férias aproveita. Podemos montar um plano que cabe no seu bolso hoje?',
    dica: 'Pergunte sobre a situação financeira e ofereça o parcelamento.',
  },
  {
    objecao: '"Não viajo com frequência"',
    resposta: 'Ótimo ponto! Muitos membros pensavam assim antes de entrar. O que acontece é que com as facilidades do clube — 500 mil opções no mundo todo — as pessoas começam a viajar mais. Além disso, o clube nunca vence. Quando você quiser viajar, está lá.',
    dica: 'Mostre a flexibilidade: o clube não tem prazo de validade.',
  },
  {
    objecao: '"Já tenho Airbnb / Booking"',
    resposta: 'Essas são ótimas ferramentas! O diferencial do Candeias é que você tem residências exclusivas com muito mais espaço, conforto e estrutura de resort — a preços que o Airbnb não consegue oferecer. E com atendimento personalizado.',
    dica: 'Destaque as propriedades próprias com piscina, restaurante e wi-fi.',
  },
  {
    objecao: '"Não conheço o clube"',
    resposta: 'Entendo! O Clube Candeias existe desde 1968 — são mais de 56 anos de história e tradição. Somos considerados o maior clube de férias do mundo com +500 mil opções de hospedagem. Deixa eu te mostrar as propriedades que temos.',
    dica: 'Mostre fotos das propriedades e depoimentos de membros.',
  },
];

const CANDEIAS_STATS = {
  fundacao: 1968,
  anos: new Date().getFullYear() - 1968,
  hospedagens: '500.000+',
  continentes: 5,
  propriedades: 10,
  telefone: '4007-2252',
  whatsapp: '(41) 4007-2252',
};

// ── COMPONENTES ──────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}

// Calculadora de Economia
function Calculadora() {
  const [form, setForm] = useState({ viagens: 1, pessoas: 2, noites: 5, valorHotel: 350 });
  const set = k => e => setForm(f => ({ ...f, [k]: Number(e.target.value) }));

  const custoSemClube = form.viagens * form.noites * form.pessoas * form.valorHotel / form.pessoas;
  const economiaPercent = 65;
  const custoComClube = custoSemClube * (1 - economiaPercent / 100);
  const economia = custoSemClube - custoComClube;
  const economia10anos = economia * 10;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>Como usar:</strong> Preencha o perfil de viagem do cliente para mostrar quanto ele economiza sendo membro.
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Viagens por ano', key: 'viagens', min: 1, max: 12 },
          { label: 'Pessoas por viagem', key: 'pessoas', min: 1, max: 10 },
          { label: 'Noites por viagem', key: 'noites', min: 1, max: 30 },
          { label: 'Diária média (R$)', key: 'valorHotel', min: 100, max: 2000 },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <input type="number" min={f.min} max={f.max} value={form[f.key]} onChange={set(f.key)} className="input" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-xs text-red-500 font-medium mb-1">Sem o Clube (por ano)</p>
          <p className="text-2xl font-bold text-red-600">R$ {custoSemClube.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-xs text-green-500 font-medium mb-1">Com o Clube (por ano)</p>
          <p className="text-2xl font-bold text-green-600">R$ {custoComClube.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-500 font-medium mb-1">Economia anual</p>
          <p className="text-2xl font-bold text-blue-600">R$ {economia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <p className="text-sm opacity-80 mb-1">Economia acumulada em 10 anos</p>
        <p className="text-4xl font-bold">R$ {economia10anos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
        <p className="text-sm opacity-70 mt-2">Baseado em {economiaPercent}% de desconto médio nas hospedagens</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
        <p>📊 <strong>Argumento de venda:</strong></p>
        <p>"{form.pessoas === 1 ? 'Você' : `Sua família`} viaja {form.viagens}x por ano, {form.noites} noites cada. Hoje gasta <strong>R$ {custoSemClube.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/ano</strong> em hospedagens.
        Com o Clube Candeias, esse valor cai para <strong>R$ {custoComClube.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/ano</strong> — uma economia de <strong>R$ {economia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong> todo ano. Em 10 anos, serão <strong>R$ {economia10anos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong> no seu bolso."</p>
      </div>
    </div>
  );
}

// Objeções
function Objecoes() {
  const [aberta, setAberta] = useState(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">Clique em uma objeção para ver como responder.</p>
      {OBJECOES.map((o, i) => (
        <div key={i} className={`border rounded-xl overflow-hidden transition-all ${aberta === i ? 'border-blue-300' : 'border-gray-200'}`}>
          <button onClick={() => setAberta(aberta === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="font-medium text-gray-800">{o.objecao}</span>
            </div>
            <span className="text-gray-400 text-lg">{aberta === i ? '−' : '+'}</span>
          </button>
          {aberta === i && (
            <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
              <div className="flex gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 text-sm leading-relaxed">"{o.resposta}"</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 flex gap-2">
                <LightBulbIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700"><strong>Dica:</strong> {o.dica}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Propriedades
function Propriedades() {
  const cores = { SC: 'bg-blue-100 text-blue-700', SP: 'bg-purple-100 text-purple-700', PR: 'bg-green-100 text-green-700', MS: 'bg-amber-100 text-amber-700', RS: 'bg-rose-100 text-rose-700' };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{CANDEIAS_STATS.propriedades}</p>
          <p className="text-xs text-gray-500 mt-1">Propriedades próprias</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{CANDEIAS_STATS.hospedagens}</p>
          <p className="text-xs text-gray-500 mt-1">Hospedagens no mundo</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{CANDEIAS_STATS.continentes}</p>
          <p className="text-xs text-gray-500 mt-1">Continentes</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {PROPRIEDADES.map((p, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 hover:border-blue-200 transition-colors shadow-sm">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{p.nome}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPinIcon className="w-3 h-3" />{p.cidade} · {p.destaque}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${cores[p.estado] || 'bg-gray-100 text-gray-600'}`}>{p.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gerador de Proposta com IA
function GeradorProposta() {
  const [form, setForm] = useState({ nome: '', perfil: '', destino: '', objecao: '' });
  const [proposta, setProposta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const gerar = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProposta('');
    try {
      const context = `
Clube Candeias — ${CANDEIAS_STATS.anos} anos de tradição, fundado em 1968.
${CANDEIAS_STATS.hospedagens} hospedagens em ${CANDEIAS_STATS.continentes} continentes.
${CANDEIAS_STATS.propriedades} propriedades próprias no Brasil.
Destinos próprios: ${PROPRIEDADES.map(p => p.cidade).join(', ')}.
Contato: ${CANDEIAS_STATS.telefone} | WhatsApp: ${CANDEIAS_STATS.whatsapp}
      `.trim();
      const { data } = await api.post('/ai/chat', {
        message: `Crie uma proposta de vendas personalizada e persuasiva para o seguinte cliente:
Nome: ${form.nome || 'Cliente'}
Perfil: ${form.perfil}
Destino de interesse: ${form.destino || 'a definir'}
Principal objeção: ${form.objecao || 'nenhuma'}

A proposta deve:
1. Cumprimentar pelo nome
2. Mostrar como o Clube Candeias resolve o perfil dele
3. Destacar os benefícios relevantes
4. Contornar a objeção de forma natural
5. Terminar com chamada para ação
6. Ser em português, tom profissional e caloroso`,
        context,
      });
      setProposta(data.reply);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar proposta. Verifique a chave Gemini no .env');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>NexusAI + Candeias:</strong> Gera uma proposta personalizada com base no perfil do cliente usando o Gemini.
      </div>
      <form onSubmit={gerar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do cliente</label>
            <input value={form.nome} onChange={set('nome')} placeholder="Ex: João Silva" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destino de interesse</label>
            <select value={form.destino} onChange={set('destino')} className="input">
              <option value="">— Selecione —</option>
              {DESTINOS_TOP.map(d => <option key={d.nome}>{d.nome} ({d.uf})</option>)}
              <option>Internacional</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Perfil do cliente *</label>
          <textarea value={form.perfil} onChange={set('perfil')} required rows={3}
            placeholder="Ex: Casal com 2 filhos, viaja 2x por ano, gosta de praia, classe média, preocupado com custo-benefício"
            className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Principal objeção levantada</label>
          <select value={form.objecao} onChange={set('objecao')} className="input">
            <option value="">— Nenhuma objeção ainda —</option>
            {OBJECOES.map(o => <option key={o.objecao}>{o.objecao}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          <SparklesIcon className="w-4 h-4" />
          {loading ? 'Gerando proposta...' : 'Gerar Proposta com IA'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {proposta && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">Proposta gerada:</p>
            <button onClick={() => navigator.clipboard.writeText(proposta)} className="text-xs text-blue-600 hover:underline">Copiar</button>
          </div>
          <pre className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-5 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">{proposta}</pre>
        </div>
      )}
    </div>
  );
}

// ── GERADOR DE CONTRATO ───────────────────────────────────────────────────────
const PLANOS = [
  { nome: 'Candeias Standard', semanas: 1, descricao: '1 semana/ano nas propriedades Candeias' },
  { nome: 'Candeias Plus', semanas: 2, descricao: '2 semanas/ano + acesso à rede mundial' },
  { nome: 'Candeias Premium', semanas: 3, descricao: '3 semanas/ano + prioridade na reserva' },
  { nome: 'Candeias Gold', semanas: 4, descricao: '4 semanas/ano + todas as vantagens exclusivas' },
];

function GeradorContrato() {
  const printRef = useRef(null);
  const hoje = new Date().toLocaleDateString('pt-BR');
  const [form, setForm] = useState({
    // Membro
    nomeCompleto: '', cpf: '', rg: '', nascimento: '', profissao: '',
    email: '', telefone: '',
    endereco: '', cidade: '', estado: '', cep: '',
    // Cônjuge
    nomeConjuge: '', cpfConjuge: '',
    // Plano
    plano: PLANOS[1].nome,
    // Financeiro
    valorTotal: '', entrada: '', parcelas: '12', valorParcela: '',
    formaPagamento: 'Cartão de crédito',
    dataVencimento: '10',
    // Vendedor
    vendedor: '', dataContrato: hoje,
  });
  const [gerado, setGerado] = useState(false);
  const set = k => e => {
    const novo = { ...form, [k]: e.target.value };
    // Auto-calcula valor da parcela
    if ((k === 'valorTotal' || k === 'entrada' || k === 'parcelas') && novo.valorTotal && novo.parcelas) {
      const restante = (parseFloat(novo.valorTotal) || 0) - (parseFloat(novo.entrada) || 0);
      novo.valorParcela = restante > 0 ? (restante / parseInt(novo.parcelas)).toFixed(2) : '';
    }
    setForm(novo);
    setGerado(false);
  };

  const planoObj = PLANOS.find(p => p.nome === form.plano) || PLANOS[1];
  const fmtMoeda = v => v ? `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ —';

  const imprimir = () => {
    const conteudo = printRef.current.innerHTML;
    const janela = window.open('', '_blank');
    janela.document.write(`
      <html><head><title>Contrato Clube Candeias</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 40px; line-height: 1.6; }
        h1 { text-align: center; font-size: 16px; margin-bottom: 4px; }
        h2 { font-size: 13px; margin: 20px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 20px; font-weight: 900; letter-spacing: -1px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        td { padding: 4px 8px; vertical-align: top; }
        td:first-child { font-weight: bold; width: 40%; }
        .clausulas { margin-top: 20px; }
        .clausula { margin-bottom: 16px; }
        .clausula strong { display: block; margin-bottom: 4px; }
        .assinaturas { margin-top: 60px; display: flex; justify-content: space-between; }
        .assinatura { text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 8px; font-size: 11px; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>${conteudo}</body></html>
    `);
    janela.document.close();
    janela.print();
  };

  const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{children}</label>
  );

  const Section = ({ title }) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '20px 0 12px', borderBottom: '1px solid rgba(99,102,241,0.2)', paddingBottom: 8 }}>{title}</p>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: gerado ? '1fr 1fr' : '1fr', gap: 24 }}>
      {/* Formulário */}
      <div>
        <Section title="Dados do Membro" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Nome Completo *</Label>
            <input value={form.nomeCompleto} onChange={set('nomeCompleto')} className="input" placeholder="Nome completo do titular" />
          </div>
          <div><Label>CPF *</Label><input value={form.cpf} onChange={set('cpf')} className="input" placeholder="000.000.000-00" /></div>
          <div><Label>RG</Label><input value={form.rg} onChange={set('rg')} className="input" placeholder="00.000.000-0" /></div>
          <div><Label>Data de Nascimento</Label><input type="date" value={form.nascimento} onChange={set('nascimento')} className="input" /></div>
          <div><Label>Profissão</Label><input value={form.profissao} onChange={set('profissao')} className="input" placeholder="Ex: Empresário" /></div>
          <div><Label>Email</Label><input type="email" value={form.email} onChange={set('email')} className="input" placeholder="email@exemplo.com" /></div>
          <div><Label>Telefone</Label><input value={form.telefone} onChange={set('telefone')} className="input" placeholder="(00) 00000-0000" /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Endereço</Label><input value={form.endereco} onChange={set('endereco')} className="input" placeholder="Rua, número, complemento" />
          </div>
          <div><Label>Cidade</Label><input value={form.cidade} onChange={set('cidade')} className="input" /></div>
          <div><Label>Estado</Label><input value={form.estado} onChange={set('estado')} className="input" placeholder="Ex: SP" /></div>
          <div><Label>CEP</Label><input value={form.cep} onChange={set('cep')} className="input" placeholder="00000-000" /></div>
        </div>

        <Section title="Cônjuge / Dependente (opcional)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label>Nome do Cônjuge</Label><input value={form.nomeConjuge} onChange={set('nomeConjuge')} className="input" /></div>
          <div><Label>CPF do Cônjuge</Label><input value={form.cpfConjuge} onChange={set('cpfConjuge')} className="input" /></div>
        </div>

        <Section title="Plano Contratado" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {PLANOS.map(p => (
            <div key={p.nome} onClick={() => setForm(f => ({ ...f, plano: p.nome }))} style={{
              padding: '12px 14px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
              background: form.plano === p.nome ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              border: form.plano === p.nome ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: form.plano === p.nome ? '0 0 15px rgba(99,102,241,0.15)' : 'none',
            }}>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: form.plano === p.nome ? '#a5b4fc' : '#e2e8f0' }}>{p.nome}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{p.descricao}</p>
            </div>
          ))}
        </div>

        <Section title="Condições Financeiras" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label>Valor Total (R$) *</Label><input type="number" value={form.valorTotal} onChange={set('valorTotal')} className="input" placeholder="Ex: 12000" /></div>
          <div><Label>Entrada (R$)</Label><input type="number" value={form.entrada} onChange={set('entrada')} className="input" placeholder="Ex: 2000" /></div>
          <div>
            <Label>Número de Parcelas</Label>
            <select value={form.parcelas} onChange={set('parcelas')} className="input">
              {[1,2,3,6,10,12,18,24,36,48,60].map(n => <option key={n} value={n}>{n}x</option>)}
            </select>
          </div>
          <div><Label>Valor da Parcela (R$)</Label><input value={form.valorParcela} onChange={set('valorParcela')} className="input" placeholder="Auto calculado" /></div>
          <div>
            <Label>Forma de Pagamento</Label>
            <select value={form.formaPagamento} onChange={set('formaPagamento')} className="input">
              {['Cartão de crédito', 'Boleto bancário', 'PIX', 'Transferência bancária', 'Cheque'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <Label>Vencimento (dia)</Label>
            <select value={form.dataVencimento} onChange={set('dataVencimento')} className="input">
              {[5,10,15,20,25].map(d => <option key={d} value={d}>Dia {d}</option>)}
            </select>
          </div>
        </div>

        <Section title="Dados do Vendedor" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><Label>Nome do Vendedor</Label><input value={form.vendedor} onChange={set('vendedor')} className="input" placeholder="Seu nome" /></div>
          <div><Label>Data do Contrato</Label><input value={form.dataContrato} onChange={set('dataContrato')} className="input" /></div>
        </div>

        <button
          onClick={() => { if (!form.nomeCompleto || !form.cpf || !form.valorTotal) { alert('Preencha: Nome, CPF e Valor Total'); return; } setGerado(true); }}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ marginTop: 20, padding: '12px 0' }}
        >
          <DocumentTextIcon style={{ width: 16, height: 16 }} />
          Gerar Contrato
        </button>
      </div>

      {/* Contrato gerado */}
      {gerado && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Contrato gerado</p>
            <button onClick={imprimir} className="btn-primary flex items-center gap-2" style={{ padding: '8px 16px', fontSize: 13 }}>
              <PrinterIcon style={{ width: 14, height: 14 }} /> Imprimir / PDF
            </button>
          </div>

          <div ref={printRef} style={{
            background: 'white', color: '#111', borderRadius: 12, padding: 32,
            fontSize: 12, lineHeight: 1.7, maxHeight: '75vh', overflowY: 'auto',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            {/* Cabeçalho */}
            <div className="header" style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="logo" style={{ fontSize: 22, fontWeight: 900, letterSpacing: -1, color: '#1e3a8a' }}>CLUBE CANDEIAS</div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>CNPJ: Candeias Turismo e Empreendimentos · Fundado em 1968 · Balneário Piçarras, SC</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>Tel: 4007-2252 · WhatsApp: (41) 4007-2252 · portal.clubecandeias.com</p>
              <h1 style={{ margin: '20px 0 0', fontSize: 15, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: '#1e3a8a' }}>
                Contrato de Adesão ao Clube de Férias
              </h1>
              <p style={{ margin: '4px 0 0', color: '#666', fontSize: 11 }}>Plano: <strong>{form.plano}</strong> · Data: {form.dataContrato}</p>
            </div>

            {/* Qualificação */}
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '20px 0 10px', color: '#1e3a8a' }}>CLÁUSULA 1 — DAS PARTES</h2>
            <p><strong>CONTRATADA:</strong> Clube Candeias Turismo e Empreendimentos Ltda., com mais de {CANDEIAS_STATS.anos} anos de tradição no mercado de turismo e lazer, portador de CNPJ próprio, com sede em Balneário Piçarras/SC, doravante denominada simplesmente <strong>CLUBE CANDEIAS</strong>.</p>
            <p style={{ marginTop: 10 }}><strong>CONTRATANTE (MEMBRO TITULAR):</strong></p>
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0' }}>
              <tbody>
                {[
                  ['Nome completo', form.nomeCompleto],
                  ['CPF', form.cpf],
                  ['RG', form.rg || '—'],
                  ['Nascimento', form.nascimento ? new Date(form.nascimento).toLocaleDateString('pt-BR') : '—'],
                  ['Profissão', form.profissao || '—'],
                  ['Email', form.email || '—'],
                  ['Telefone', form.telefone || '—'],
                  ['Endereço', form.endereco || '—'],
                  ['Cidade/Estado', `${form.cidade || '—'} / ${form.estado || '—'}`],
                  ['CEP', form.cep || '—'],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 700, width: '35%', color: '#333' }}>{k}:</td>
                    <td style={{ padding: '4px 8px', color: '#555' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {form.nomeConjuge && (
              <>
                <p style={{ marginTop: 10 }}><strong>CÔNJUGE / DEPENDENTE:</strong> {form.nomeConjuge} — CPF: {form.cpfConjuge || '—'}</p>
              </>
            )}

            {/* Plano */}
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '20px 0 10px', color: '#1e3a8a' }}>CLÁUSULA 2 — DO OBJETO E PLANO CONTRATADO</h2>
            <p>O presente contrato tem por objeto a adesão ao <strong>{form.plano}</strong>, que garante ao CONTRATANTE o direito de usufruir de <strong>{planoObj.semanas} semana(s) de hospedagem por ano</strong> nas propriedades do CLUBE CANDEIAS, bem como acesso à rede de mais de <strong>500.000 opções de hospedagem em 5 continentes</strong>.</p>
            <p style={{ marginTop: 8 }}>A associação tem caráter <strong>vitalício e intransferível ao titular</strong>, não possuindo prazo de vigência determinado, podendo o CONTRATANTE utilizar os benefícios a qualquer tempo, condicionado ao adimplemento das obrigações financeiras assumidas.</p>

            {/* Financeiro */}
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '20px 0 10px', color: '#1e3a8a' }}>CLÁUSULA 3 — DO PREÇO E CONDIÇÕES DE PAGAMENTO</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0' }}>
              <tbody>
                {[
                  ['Valor total', fmtMoeda(form.valorTotal)],
                  ['Entrada', form.entrada ? fmtMoeda(form.entrada) : 'Sem entrada'],
                  ['Parcelamento', `${form.parcelas}x de ${fmtMoeda(form.valorParcela)}`],
                  ['Forma de pagamento', form.formaPagamento],
                  ['Vencimento das parcelas', `Todo dia ${form.dataVencimento} de cada mês`],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 700, width: '45%', color: '#333' }}>{k}:</td>
                    <td style={{ padding: '4px 8px', color: '#555' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 8 }}>O inadimplemento de qualquer parcela por prazo superior a 30 (trinta) dias acarretará a suspensão temporária dos benefícios até a regularização, acrescidos de multa de 2% e juros de 1% ao mês.</p>

            {/* Benefícios */}
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '20px 0 10px', color: '#1e3a8a' }}>CLÁUSULA 4 — DOS BENEFÍCIOS DO MEMBRO</h2>
            <p>São direitos do CONTRATANTE enquanto membro adimplente:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0', color: '#555' }}>
              <li>Acesso a {planoObj.semanas} semana(s) de hospedagem/ano nas propriedades Candeias;</li>
              <li>Acesso à rede mundial de +500.000 opções de hospedagem em 5 continentes;</li>
              <li>Utilização do portal do membro e aplicativo móvel (iOS e Android);</li>
              <li>Atendimento personalizado para planejamento de viagens;</li>
              <li>Descontos exclusivos em parceiros de turismo e lazer;</li>
              <li>Possibilidade de hospedagem pet-friendly em propriedades selecionadas.</li>
            </ul>

            {/* Prazo */}
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '20px 0 10px', color: '#1e3a8a' }}>CLÁUSULA 5 — DO PRAZO E VIGÊNCIA</h2>
            <p>A presente associação é de natureza vitalícia, vigorando a partir da data de assinatura deste contrato e quitação da entrada, sem prazo de vencimento, transmissível por herança aos descendentes diretos do CONTRATANTE, conforme legislação civil vigente.</p>

            {/* Rescisão */}
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '20px 0 10px', color: '#1e3a8a' }}>CLÁUSULA 6 — DA RESCISÃO E DIREITO DE ARREPENDIMENTO</h2>
            <p>O CONTRATANTE poderá rescindir o presente contrato no prazo de <strong>7 (sete) dias corridos</strong> a contar da data de assinatura, sem qualquer ônus, conforme art. 49 do Código de Defesa do Consumidor (Lei 8.078/90). Após este prazo, a rescisão será analisada conforme regulamento interno do CLUBE CANDEIAS.</p>

            {/* Foro */}
            <h2 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '20px 0 10px', color: '#1e3a8a' }}>CLÁUSULA 7 — DO FORO</h2>
            <p>As partes elegem o foro da Comarca de Balneário Piçarras, Estado de Santa Catarina, para dirimir quaisquer dúvidas ou litígios oriundos do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

            {/* Assinaturas */}
            <div style={{ marginTop: 50, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center', width: '45%', borderTop: '1px solid #000', paddingTop: 8 }}>
                <p style={{ margin: 0, fontSize: 11 }}><strong>{form.nomeCompleto}</strong></p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>CPF: {form.cpf} — CONTRATANTE</p>
              </div>
              <div style={{ textAlign: 'center', width: '45%', borderTop: '1px solid #000', paddingTop: 8 }}>
                <p style={{ margin: 0, fontSize: 11 }}><strong>CLUBE CANDEIAS</strong></p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>Representante Legal — CONTRATADA</p>
              </div>
            </div>
            {form.vendedor && (
              <div style={{ marginTop: 30, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', borderTop: '1px solid #000', paddingTop: 8, width: '45%' }}>
                  <p style={{ margin: 0, fontSize: 11 }}><strong>{form.vendedor}</strong></p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>Vendedor / Consultor</p>
                </div>
              </div>
            )}
            <p style={{ marginTop: 24, textAlign: 'center', fontSize: 10, color: '#999' }}>
              {form.cidade || 'Local'}, {form.dataContrato} · Clube Candeias · portal.clubecandeias.com
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'calc', label: 'Calculadora', icon: CalculatorIcon },
  { id: 'objecoes', label: 'Objeções', icon: ChatBubbleLeftRightIcon },
  { id: 'propriedades', label: 'Propriedades', icon: BuildingOfficeIcon },
  { id: 'proposta', label: 'Gerar Proposta IA', icon: DocumentTextIcon },
  { id: 'contrato', label: 'Contrato', icon: PrinterIcon },
];

export default function SalesTools() {
  const [tab, setTab] = useState('calc');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ferramentas de Vendas</h2>
        <p className="text-gray-400 text-sm mt-1">Clube Candeias · {CANDEIAS_STATS.anos} anos · {CANDEIAS_STATS.hospedagens} hospedagens · {CANDEIAS_STATS.continentes} continentes</p>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Fundação', value: CANDEIAS_STATS.fundacao },
          { label: 'Anos de tradição', value: CANDEIAS_STATS.anos },
          { label: 'Hospedagens', value: CANDEIAS_STATS.hospedagens },
          { label: 'Propriedades próprias', value: CANDEIAS_STATS.propriedades },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-blue-600">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />)}
        </div>
        <div className="p-6">
          {tab === 'calc' && <Calculadora />}
          {tab === 'objecoes' && <Objecoes />}
          {tab === 'propriedades' && <Propriedades />}
          {tab === 'proposta' && <GeradorProposta />}
          {tab === 'contrato' && <GeradorContrato />}
        </div>
      </div>
    </div>
  );
}
