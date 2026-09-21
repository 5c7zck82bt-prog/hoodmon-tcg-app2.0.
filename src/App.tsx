import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { BattleControls } from './components/BattleControls'
import { CardArt } from './components/CardArt'
import { PhaseBar } from './components/PhaseBar'
import { PlayerPanel } from './components/PlayerPanel'
import { GameProvider, useGame } from './game/GameContext'
import { demoDefinitions, demoSetup, seedDemoBoard } from './game/demoData'
import { series1Cards, type SeriesCard } from './data/series1Cards'
import './styles.css'

type View = 'home' | 'collection' | 'deck' | 'battle' | 'rules'
type DeckSection = 'main' | 'task' | 'tamer'

type DeckState = {
  main: string[]
  task: string[]
  tamer: string[]
}

const EMPTY_DECK: DeckState = { main: [], task: [], tamer: [] }
const DECK_STORAGE_KEY = 'hoodmon.series1.deck.v1'

function loadDeck(): DeckState {
  try {
    const raw = localStorage.getItem(DECK_STORAGE_KEY)
    if (!raw) return EMPTY_DECK
    const parsed = JSON.parse(raw) as Partial<DeckState>
    return {
      main: Array.isArray(parsed.main) ? parsed.main : [],
      task: Array.isArray(parsed.task) ? parsed.task : [],
      tamer: Array.isArray(parsed.tamer) ? parsed.tamer : [],
    }
  } catch {
    return EMPTY_DECK
  }
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [selectedCard, setSelectedCard] = useState<SeriesCard | null>(null)
  const [deck, setDeck] = useState<DeckState>(() => loadDeck())

  useEffect(() => {
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck))
  }, [deck])

  const page = (() => {
    switch (view) {
      case 'collection':
        return <CollectionPage onOpen={setSelectedCard} />
      case 'deck':
        return <DeckBuilder deck={deck} setDeck={setDeck} onOpen={setSelectedCard} />
      case 'battle':
        return <BattlePage />
      case 'rules':
        return <RulesPage />
      default:
        return <HomePage onNavigate={setView} onOpen={setSelectedCard} />
    }
  })()

  return (
    <div className="site-shell">
      <AppHeader active={view} onNavigate={setView} />
      {page}
      <footer className="site-footer">
        <span>HOODMON TCG · SERIES 1</span>
        <span>110 CARD DIGITAL LIBRARY</span>
        <span>AWAKEN THE BOND</span>
      </footer>
      <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  )
}

function AppHeader({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  const nav: Array<[View, string]> = [
    ['home', 'HOME'],
    ['collection', 'CARDS'],
    ['deck', 'DECK BUILDER'],
    ['battle', 'BATTLE'],
    ['rules', 'RULES'],
  ]

  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => onNavigate('home')}>
        <span className="brand-crown">♛</span>
        <span><b>HOODMON</b><small>TCG DIGITAL ARENA</small></span>
      </button>
      <nav className="main-nav" aria-label="Main navigation">
        {nav.map(([view, label]) => (
          <button key={view} className={active === view ? 'active' : ''} onClick={() => onNavigate(view)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="series-badge"><b>110</b><span>SERIES 1</span></div>
    </header>
  )
}

function HomePage({ onNavigate, onOpen }: { onNavigate: (view: View) => void; onOpen: (card: SeriesCard) => void }) {
  const featureIds = ['HDM-001', 'HDM-063', 'HDM-078', 'HDM-094']
  const featured = featureIds.map((id) => series1Cards.find((card) => card.id === id)!).filter(Boolean)

  return (
    <main className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SERIES 1 · COMPLETE DIGITAL CARD LIBRARY</span>
          <h1>AWAKEN<br /><em>THE BOND.</em></h1>
          <p>Build a 40-card Hoodmon Deck, bring a separate 6-card Task Deck, choose your Tamer, and battle for 3 Objective Stars.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => onNavigate('deck')}>BUILD A DECK</button>
            <button className="secondary-action" onClick={() => onNavigate('collection')}>VIEW ALL 110 CARDS</button>
          </div>
        </div>
        <div className="hero-stack" aria-label="Featured Hoodmon cards">
          {featured.map((card, index) => (
            <button key={card.id} className={`hero-card hero-card-${index + 1}`} onClick={() => onOpen(card)}>
              <CardArt card={card} />
            </button>
          ))}
        </div>
      </section>

      <section className="stat-grid">
        <StatCard value="2,500" label="STARTING LP" />
        <StatCard value="5" label="STARTING BOND" />
        <StatCard value="10" label="BOND CAP" />
        <StatCard value="3" label="OBJECTIVE STARS TO WIN" />
      </section>

      <section className="feature-grid">
        <Feature title="110 Improved Cards" text="Every Series 1 card asset in the current remaster is included in the app library." action="Browse collection" onClick={() => onNavigate('collection')} />
        <Feature title="Persistent Deck Builder" text="Build Main, Task, and Tamer sections. Your current deck saves in your browser automatically." action="Build now" onClick={() => onNavigate('deck')} />
        <Feature title="Battle Engine" text="The FSM engine handles turns, Bond, phases, attacks, reaction windows, Task progress, and victory state." action="Open battle" onClick={() => onNavigate('battle')} />
      </section>
    </main>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return <div className="stat-card"><b>{value}</b><span>{label}</span></div>
}

function Feature({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return (
    <article className="feature-card">
      <span className="feature-crown">♛</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button onClick={onClick}>{action} →</button>
    </article>
  )
}

function CollectionPage({ onOpen }: { onOpen: (card: SeriesCard) => void }) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('ALL')
  const [kind, setKind] = useState('ALL')
  const families = useMemo(() => ['ALL', ...Array.from(new Set(series1Cards.map((card) => card.family)))], [])
  const kinds = ['ALL', 'Tamer', 'Hoodmon', 'Magic', 'Trap', 'Field', 'Task']
  const cards = useMemo(() => series1Cards.filter((card) => {
    const needle = query.trim().toLowerCase()
    const matchesQuery = !needle || card.name.toLowerCase().includes(needle) || card.id.toLowerCase().includes(needle)
    const matchesFamily = family === 'ALL' || card.family === family
    const matchesKind = kind === 'ALL' || card.kind === kind
    return matchesQuery && matchesFamily && matchesKind
  }), [query, family, kind])

  return (
    <main className="page">
      <PageTitle eyebrow="SERIES 1 CARD DATABASE" title="THE HOODMON VAULT" subtitle={`${cards.length} of 110 cards shown`} />
      <section className="filter-bar">
        <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search card name or HDM number…" /></label>
        <select value={family} onChange={(e) => setFamily(e.target.value)}>{families.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((item) => <option key={item}>{item}</option>)}</select>
      </section>
      <section className="card-grid">
        {cards.map((card) => <CardTile key={card.id} card={card} onOpen={onOpen} />)}
      </section>
    </main>
  )
}

function CardTile({ card, onOpen, action }: { card: SeriesCard; onOpen: (card: SeriesCard) => void; action?: ReactNode }) {
  return (
    <article className="card-tile">
      <button className="card-image-button" onClick={() => onOpen(card)}>
        <CardArt card={card} loading="lazy" />
      </button>
      <div className="card-tile-meta">
        <div><span>{card.id}</span><b>{card.name}</b><small>{card.kind} · {card.family}</small></div>
        {action}
      </div>
    </article>
  )
}

function DeckBuilder({ deck, setDeck, onOpen }: { deck: DeckState; setDeck: Dispatch<SetStateAction<DeckState>>; onOpen: (card: SeriesCard) => void }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('ALL')
  const [activeSection, setActiveSection] = useState<DeckSection>('main')

  const cards = useMemo(() => series1Cards.filter((card) => {
    const needle = query.trim().toLowerCase()
    const q = !needle || card.name.toLowerCase().includes(needle) || card.id.toLowerCase().includes(needle)
    const k = kind === 'ALL' || card.kind === kind
    return q && k
  }), [query, kind])

  const sectionForCard = (card: SeriesCard): DeckSection => card.kind === 'Tamer' ? 'tamer' : card.kind === 'Task' ? 'task' : 'main'
  const limitFor = (section: DeckSection) => section === 'main' ? 40 : section === 'task' ? 6 : 1

  const addCard = (card: SeriesCard) => {
    const section = sectionForCard(card)
    setActiveSection(section)
    setDeck((current) => {
      if (current[section].length >= limitFor(section)) return current
      if (section === 'tamer') return { ...current, tamer: [card.id] }
      const copies = current[section].filter((id) => id === card.id).length
      if (copies >= 3) return current
      return { ...current, [section]: [...current[section], card.id] }
    })
  }

  const removeCard = (section: DeckSection, cardId: string) => {
    setDeck((current) => {
      const copy = [...current[section]]
      const index = copy.lastIndexOf(cardId)
      if (index >= 0) copy.splice(index, 1)
      return { ...current, [section]: copy }
    })
  }

  const clearDeck = () => setDeck(EMPTY_DECK)
  const section = deck[activeSection]
  const grouped = Array.from(new Set(section)).map((id) => ({ card: series1Cards.find((item) => item.id === id)!, copies: section.filter((entry) => entry === id).length })).filter((item) => item.card)

  return (
    <main className="page deck-page">
      <PageTitle eyebrow="40 MAIN · 6 TASK · 1 TAMER" title="DECK BUILDER" subtitle="Up to 3 copies of a card in a section" />
      <div className="deck-workspace">
        <section className="deck-catalog">
          <div className="filter-bar compact">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a card…" /></label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {['ALL','Tamer','Hoodmon','Magic','Trap','Field','Task'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="deck-card-grid">
            {cards.map((card) => (
              <CardTile key={card.id} card={card} onOpen={onOpen} action={<button className="add-card" onClick={() => addCard(card)}>＋</button>} />
            ))}
          </div>
        </section>

        <aside className="deck-panel">
          <div className="deck-panel-header"><div><span className="eyebrow">CURRENT BUILD</span><h2>STREET DECK</h2></div><button className="text-button" onClick={clearDeck}>CLEAR</button></div>
          <div className="deck-meters">
            <DeckMeter label="MAIN" count={deck.main.length} limit={40} />
            <DeckMeter label="TASK" count={deck.task.length} limit={6} />
            <DeckMeter label="TAMER" count={deck.tamer.length} limit={1} />
          </div>
          <div className="deck-tabs">
            {(['main','task','tamer'] as DeckSection[]).map((name) => <button key={name} className={activeSection === name ? 'active' : ''} onClick={() => setActiveSection(name)}>{name.toUpperCase()}</button>)}
          </div>
          <div className="deck-list">
            {grouped.length === 0 && <div className="empty-deck">No cards in this section yet.</div>}
            {grouped.map(({ card, copies }) => (
              <div className="deck-list-row" key={card.id}>
                <CardArt card={card} alt="" />
                <div><b>{card.name}</b><span>{card.id} · {card.kind}</span></div>
                <strong>×{copies}</strong>
                <button onClick={() => removeCard(activeSection, card.id)}>−</button>
              </div>
            ))}
          </div>
          <div className="deck-status">
            <span className={deck.main.length === 40 && deck.task.length === 6 && deck.tamer.length === 1 ? 'ready' : ''}>
              {deck.main.length === 40 && deck.task.length === 6 && deck.tamer.length === 1 ? '✓ DECK SIZE COMPLETE' : 'BUILD REQUIREMENTS IN PROGRESS'}
            </span>
          </div>
        </aside>
      </div>
    </main>
  )
}

function DeckMeter({ label, count, limit }: { label: string; count: number; limit: number }) {
  const pct = Math.min(100, (count / limit) * 100)
  return <div className="deck-meter"><span><b>{label}</b>{count}/{limit}</span><div><i style={{ width: `${pct}%` }} /></div></div>
}

function BattlePage() {
  return (
    <main className="page battle-page">
      <PageTitle eyebrow="LOCAL FACE-TO-FACE ENGINE" title="STREET BATTLE" subtitle="FSM battle engine prototype wired to the current Series 1 visual build" />
      <GameProvider definitions={demoDefinitions} setup={demoSetup} seed={seedDemoBoard}>
        <BattleTable />
      </GameProvider>
    </main>
  )
}

function BattleTable() {
  const { state } = useGame()
  return (
    <section className={`app-shell viewport-${state.viewportOwner.toLowerCase()}`}>
      <header className="battle-topbar">
        <div className="brand"><span className="crown">♛</span><div><h2>HOODMON</h2><small>STREET GRID BATTLE ENGINE</small></div></div>
        <div className="match-meta"><span>ROUND <b>{state.round}</b></span><span>TURN <b>{state.turnNumber}</b></span><span>STATUS <b>{state.status}</b></span></div>
      </header>
      <PhaseBar />
      <PlayerPanel playerId="P2" opponent />
      <div className="center-mark"><span>AWAKEN THE BOND</span></div>
      <PlayerPanel playerId="P1" />
      <BattleControls />
      <aside className="event-log">
        <h3>ENGINE LOG</h3>
        {[...state.eventLog].reverse().slice(0, 8).map((line, i) => <div key={`${line}-${i}`}>{line}</div>)}
      </aside>
    </section>
  )
}

function RulesPage() {
  return (
    <main className="page rules-page">
      <PageTitle eyebrow="QUICK REFERENCE" title="CORE RULES" subtitle="Digital implementation reference used by this app build" />
      <section className="rules-grid">
        <RuleBlock number="01" title="SETUP"><p>Each player uses a <b>40-card Hoodmon Deck</b>, a separate <b>6-card Task Deck</b>, and <b>1 Tamer</b>. Standard play begins at <b>2,500 LP</b> and <b>5 Bond</b>.</p></RuleBlock>
        <RuleBlock number="02" title="BOND"><p>Gain <b>+1 Bond</b> during your Bond Phase, up to a maximum of <b>10</b>. Spend Bond to deploy, evolve, and pay printed card costs.</p></RuleBlock>
        <RuleBlock number="03" title="BOARD"><p>Each player normally has <b>1 Active Hoodmon</b> and up to <b>3 Reserve Hoodmon</b>, plus personal Field, Magic/Equipment, Trap, Task, Deck, Discard, and Banished zones.</p></RuleBlock>
        <RuleBlock number="04" title="EVOLUTION"><p>Normal evolution begins on <b>Round 2</b> unless a card specifically overrides that restriction. Series 1 supports progression through higher stages where printed.</p></RuleBlock>
        <RuleBlock number="05" title="TURN"><p>The digital engine advances through <b>Refresh → Draw → Bond → Main → Command → End</b>. Reaction windows open when an effect or attack allows a response.</p></RuleBlock>
        <RuleBlock number="06" title="VICTORY"><p>Reduce the opposing Tamer to <b>0 LP</b> or earn the required <b>3 Objective Stars</b> through Tasks and card effects.</p></RuleBlock>
      </section>
    </main>
  )
}

function RuleBlock({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <article className="rule-block"><span>{number}</span><h3>{title}</h3>{children}</article>
}

function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <header className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></header>
}

function CardModal({ card, onClose }: { card: SeriesCard | null; onClose: () => void }) {
  useEffect(() => {
    if (!card) return
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [card, onClose])

  if (!card) return null
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="card-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <CardArt card={card} />
        <div className="modal-meta"><span>{card.id} · {card.kind}</span><h2>{card.name}</h2><p>{card.family}</p></div>
      </div>
    </div>
  )
}
