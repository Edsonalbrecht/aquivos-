import { Link } from 'react-router-dom';
import {
  UsersIcon, ChartBarIcon, ClipboardDocumentListIcon,
  UserGroupIcon, BoltIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline';

const features = [
  { icon: UsersIcon, title: 'Gestão de Clientes', desc: 'Cadastre e acompanhe todos os seus clientes em um só lugar, com histórico completo.' },
  { icon: UserGroupIcon, title: 'Contatos', desc: 'Gerencie múltiplos contatos por empresa e mantenha os dados sempre atualizados.' },
  { icon: ChartBarIcon, title: 'Pipeline de Vendas', desc: 'Visualize seus negócios em kanban por etapa e mova-os com um clique.' },
  { icon: ClipboardDocumentListIcon, title: 'Atividades', desc: 'Crie tarefas, ligações e reuniões com alertas de prazo para não perder nenhum follow-up.' },
  { icon: BoltIcon, title: 'Dashboard em tempo real', desc: 'Métricas e gráficos atualizados automaticamente para decisões mais rápidas.' },
  { icon: ShieldCheckIcon, title: 'Seguro e privado', desc: 'Seus dados ficam armazenados localmente, sem dependência de serviços externos.' },
];

const stats = [
  { value: '100%', label: 'Dados locais' },
  { value: '5', label: 'Etapas de pipeline' },
  { value: '∞', label: 'Clientes e negócios' },
  { value: '0', label: 'Custo mensal' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CandeiasNexus" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            <div>
              <span className="text-xl font-bold text-blue-400">CandeiasNexus</span>
              <span className="text-gray-500 text-sm ml-2">CRM</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link to="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm font-medium rounded-lg transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <img src="/logo.png" alt="CandeiasNexus" style={{ width: 200, height: 200, objectFit: 'contain', margin: '0 auto 24px', display: 'block' }} />
        <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 text-blue-300 text-xs px-4 py-2 rounded-full mb-8">
          <BoltIcon className="w-3.5 h-3.5" />
          CRM completo, rápido e sem mensalidade
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Gerencie seus clientes<br />
          <span className="text-blue-400">de forma inteligente</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          O CandeiasNexus CRM reúne clientes, contatos, pipeline de vendas e atividades em uma plataforma simples e poderosa.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/login" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl text-lg transition-colors">
            Criar conta grátis
          </Link>
          <Link to="/login" className="px-8 py-3 border border-gray-700 hover:border-gray-500 font-semibold rounded-xl text-lg text-gray-300 transition-colors">
            Fazer login
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-4xl font-bold text-blue-400">{s.value}</p>
              <p className="text-gray-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">Tudo que você precisa</h2>
        <p className="text-gray-400 text-center mb-14">Uma plataforma completa para gerenciar seu ciclo de vendas do início ao fim.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-800 transition-colors">
              <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline preview */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-center mb-2">Pipeline visual em kanban</h2>
          <p className="text-gray-400 text-center text-sm mb-8">Arraste negócios entre etapas e acompanhe seu funil em tempo real</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {['Prospecção', 'Qualificação', 'Proposta', 'Negociação', 'Fechamento'].map((stage, i) => {
              const colors = ['#6366f1', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
              return (
                <div key={stage} className="flex-shrink-0 w-44 bg-gray-950 rounded-xl p-3 border border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
                    <span className="text-xs font-medium text-gray-300">{stage}</span>
                  </div>
                  {[...Array(i === 0 ? 3 : i === 1 ? 2 : 1)].map((_, j) => (
                    <div key={j} className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-2">
                      <div className="h-2 bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-gray-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 py-20 text-center px-6">
        <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
        <p className="text-gray-400 mb-8">Crie sua conta agora e comece a organizar seu time de vendas.</p>
        <Link to="/login" className="inline-block px-10 py-4 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-lg transition-colors">
          Começar agora — é grátis
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} CandeiasNexus CRM. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
