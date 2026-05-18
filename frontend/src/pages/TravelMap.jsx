import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { FireIcon, ArrowTrendingUpIcon, BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/outline';

const GEO_URL = 'https://raw.githubusercontent.com/fititnt/gis-dataset-brasil/master/uf/topojson/uf.json';

// Dados de calor por estado (1=frio, 10=muito quente)
const HEAT_DATA = {
  'Rio de Janeiro':   { score: 9.8, viagens: 4210, hoteis: 1830, tendencia: '+12%', top: ['Copacabana', 'Búzios', 'Angra dos Reis'] },
  'São Paulo':        { score: 9.5, viagens: 5890, hoteis: 2400, tendencia: '+8%',  top: ['São Paulo', 'Campos do Jordão', 'Ilhabela'] },
  'Bahia':            { score: 9.2, viagens: 3650, hoteis: 1420, tendencia: '+18%', top: ['Salvador', 'Porto Seguro', 'Morro de São Paulo'] },
  'Ceará':            { score: 8.7, viagens: 2980, hoteis: 1100, tendencia: '+22%', top: ['Fortaleza', 'Jericoacoara', 'Canoa Quebrada'] },
  'Pernambuco':       { score: 8.3, viagens: 2210, hoteis: 890,  tendencia: '+15%', top: ['Recife', 'Olinda', 'Porto de Galinhas'] },
  'Santa Catarina':   { score: 8.1, viagens: 2560, hoteis: 980,  tendencia: '+11%', top: ['Florianópolis', 'Balneário Camboriú', 'Bombinhas'] },
  'Minas Gerais':     { score: 7.8, viagens: 2100, hoteis: 820,  tendencia: '+9%',  top: ['Belo Horizonte', 'Ouro Preto', 'Tiradentes'] },
  'Rio Grande do Sul': { score: 7.2, viagens: 1890, hoteis: 710, tendencia: '+7%',  top: ['Porto Alegre', 'Gramado', 'Canela'] },
  'Paraná':           { score: 7.0, viagens: 1750, hoteis: 680,  tendencia: '+6%',  top: ['Curitiba', 'Foz do Iguaçu', 'Morretes'] },
  'Amazonas':         { score: 7.5, viagens: 1420, hoteis: 540,  tendencia: '+25%', top: ['Manaus', 'Anavilhanas', 'Encontro das Águas'] },
  'Pará':             { score: 6.8, viagens: 1280, hoteis: 480,  tendencia: '+14%', top: ['Belém', 'Marajó', 'Alter do Chão'] },
  'Goiás':            { score: 6.2, viagens: 1100, hoteis: 420,  tendencia: '+5%',  top: ['Goiânia', 'Chapada dos Veadeiros', 'Caldas Novas'] },
  'Mato Grosso':      { score: 6.5, viagens: 980,  hoteis: 370,  tendencia: '+19%', top: ['Cuiabá', 'Pantanal', 'Chapada dos Guimarães'] },
  'Mato Grosso do Sul':{ score: 6.3, viagens: 920,  hoteis: 350, tendencia: '+16%', top: ['Campo Grande', 'Bonito', 'Pantanal Sul'] },
  'Maranhão':         { score: 5.8, viagens: 840,  hoteis: 310,  tendencia: '+10%', top: ['São Luís', 'Lençóis Maranhenses', 'Alcântara'] },
  'Rio Grande do Norte':{ score: 7.9, viagens: 1650, hoteis: 640, tendencia: '+20%',top: ['Natal', 'Pipa', 'Genipabu'] },
  'Alagoas':          { score: 7.6, viagens: 1380, hoteis: 520,  tendencia: '+17%', top: ['Maceió', 'Maragogi', 'Penedo'] },
  'Sergipe':          { score: 5.5, viagens: 680,  hoteis: 260,  tendencia: '+8%',  top: ['Aracaju', 'Canindé de São Francisco'] },
  'Piauí':            { score: 5.2, viagens: 590,  hoteis: 220,  tendencia: '+12%', top: ['Teresina', 'Serra da Capivara', 'Delta do Parnaíba'] },
  'Paraíba':          { score: 6.0, viagens: 860,  hoteis: 320,  tendencia: '+9%',  top: ['João Pessoa', 'Campina Grande', 'Conde'] },
  'Espírito Santo':   { score: 6.4, viagens: 1020, hoteis: 390,  tendencia: '+7%',  top: ['Vitória', 'Guarapari', 'Domingos Martins'] },
  'Tocantins':        { score: 4.8, viagens: 520,  hoteis: 190,  tendencia: '+11%', top: ['Palmas', 'Jalapão', 'Ilha do Bananal'] },
  'Rondônia':         { score: 4.2, viagens: 420,  hoteis: 160,  tendencia: '+6%',  top: ['Porto Velho', 'Guajará-Mirim'] },
  'Roraima':          { score: 4.0, viagens: 310,  hoteis: 120,  tendencia: '+15%', top: ['Boa Vista', 'Monte Roraima'] },
  'Acre':             { score: 3.8, viagens: 280,  hoteis: 100,  tendencia: '+8%',  top: ['Rio Branco', 'Cruzeiro do Sul'] },
  'Amapá':            { score: 4.1, viagens: 320,  hoteis: 125,  tendencia: '+10%', top: ['Macapá', 'Oiapoque'] },
  'Distrito Federal': { score: 7.3, viagens: 1620, hoteis: 630,  tendencia: '+6%',  top: ['Brasília', 'Chapada dos Veadeiros'] },
};

const colorScale = scaleLinear()
  .domain([1, 5, 8, 10])
  .range(['#bfdbfe', '#fde68a', '#f97316', '#dc2626']);

const TOP_RANKING = Object.entries(HEAT_DATA)
  .sort((a, b) => b[1].score - a[1].score)
  .slice(0, 8);

function Thermometer({ value }) {
  const pct = (value / 10) * 100;
  const color = colorScale(value);
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-3 h-20 bg-gray-200 rounded-full overflow-hidden">
        <div className="absolute bottom-0 w-full rounded-full transition-all" style={{ height: `${pct}%`, background: color }} />
      </div>
      <span className="text-lg font-bold" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  );
}

export default function TravelMap() {
  const [tooltip, setTooltip] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const getStateName = geo => geo.properties?.NM_ESTADO || geo.properties?.name || '';

  const filteredData = Object.entries(HEAT_DATA).filter(([, d]) => {
    if (filter === 'hot') return d.score >= 8;
    if (filter === 'rising') return parseFloat(d.tendencia) >= 15;
    return true;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mapa de Calor — Viagens & Hotelaria</h2>
          <p className="text-gray-400 text-sm mt-1">Termômetro de demanda turística por estado brasileiro</p>
        </div>
        <div className="flex gap-2">
          {[['all', 'Todos'], ['hot', '🔥 Em Alta'], ['rising', '📈 Crescendo']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === v ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-6">
        <span className="text-sm font-medium text-gray-500">Intensidade:</span>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-gray-400">Baixa</span>
          <div className="flex-1 h-4 rounded-full" style={{ background: 'linear-gradient(to right, #bfdbfe, #fde68a, #f97316, #dc2626)' }} />
          <span className="text-xs text-gray-400">Alta</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-200 inline-block" /> 1–4</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-300 inline-block" /> 5–7</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> 8–9</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> 10</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative">
          {tooltip && (
            <div className="absolute z-10 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg pointer-events-none shadow-lg"
              style={{ top: 16, left: '50%', transform: 'translateX(-50%)' }}>
              <strong>{tooltip.name}</strong> · Score: {tooltip.score?.toFixed(1)} · Tendência: {tooltip.tendencia}
            </div>
          )}
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [-53, -14], scale: 680 }}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const name = getStateName(geo);
                  const data = HEAT_DATA[name];
                  const isSelected = selected === name;
                  const fill = data ? colorScale(data.score) : '#e5e7eb';
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#fff"
                      strokeWidth={0.8}
                      style={{
                        default: { fill, outline: 'none', opacity: isSelected ? 1 : 0.9 },
                        hover: { fill, outline: 'none', opacity: 1, cursor: 'pointer', filter: 'brightness(1.1)' },
                        pressed: { fill, outline: 'none' },
                      }}
                      onMouseEnter={() => setTooltip({ name, ...data })}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => setSelected(name === selected ? null : name)}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
          <p className="text-center text-xs text-gray-400 mt-2">Clique em um estado para ver detalhes</p>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Detalhe do estado selecionado */}
          {selected && HEAT_DATA[selected] && (
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{selected}</h3>
                  <p className="text-xs text-gray-400">Análise detalhada</p>
                </div>
                <Thermometer value={HEAT_DATA[selected].score} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{HEAT_DATA[selected].viagens.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Viagens/mês</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{HEAT_DATA[selected].hoteis.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Hotéis ativos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">{HEAT_DATA[selected].tendencia} vs. mês anterior</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" /> Destinos em alta
                </p>
                <div className="flex flex-wrap gap-1">
                  {HEAT_DATA[selected].top.map(t => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ranking */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FireIcon className="w-4 h-4 text-orange-500" /> Top Destinos
            </h3>
            <div className="space-y-2">
              {TOP_RANKING.map(([state, data], i) => (
                <div key={state}
                  onClick={() => setSelected(state === selected ? null : state)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selected === state ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                  <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{state}</p>
                    <p className="text-xs text-green-500">{data.tendencia}</p>
                  </div>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${data.score * 10}%`, background: colorScale(data.score) }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: colorScale(data.score) }}>{data.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Estado mais quente', value: 'Rio de Janeiro', sub: 'Score 9.8', icon: FireIcon, color: 'red' },
          { label: 'Maior crescimento', value: 'Ceará', sub: '+22% este mês', icon: ArrowTrendingUpIcon, color: 'green' },
          { label: 'Mais hotéis ativos', value: 'São Paulo', sub: '2.400 unidades', icon: BuildingOfficeIcon, color: 'blue' },
          { label: 'Destino surpresa', value: 'Amazonas', sub: '+25% crescimento', icon: MapPinIcon, color: 'purple' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <c.icon className={`w-5 h-5 mb-2 text-${c.color}-500`} />
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className="font-bold text-gray-900 mt-1">{c.value}</p>
            <p className="text-xs text-gray-500">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
