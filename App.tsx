import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import { BattleControls } from './components/BattleControls'
import { BattleHand } from './components/BattleHand'
import { PhaseBar } from './components/PhaseBar'
import { PlayerPanel } from './components/PlayerPanel'
import { GameProvider, useGame } from './game/GameContext'
import { demoDefinitions, demoSetup } from './game/demoData'
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

type PlayerSession = {
  signedIn: boolean
  playerTag: string
}

const SESSION_STORAGE_KEY = 'hoodmon.player.session.v1'

function loadSession(): PlayerSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return { signedIn: false, playerTag: '' }
    const parsed = JSON.parse(raw) as Partial<PlayerSession>
    return {
      signedIn: parsed.signedIn === true,
      playerTag: typeof parsed.playerTag === 'string' ? parsed.playerTag : '',
    }
  } catch {
    return { signedIn: false, playerTag: '' }
  }
}

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
  const [session, setSession] = useState<PlayerSession>(() => loadSession())
  const [view, setView] = useState<View>(() => loadSession().signedIn ? 'battle' : 'home')
  const [showSignIn, setShowSignIn] = useState(false)
  const [selectedCard, setSelectedCard] = useState<SeriesCard | null>(null)
  const [deck, setDeck] = useState<DeckState>(() => loadDeck())

  useEffect(() => {
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck))
  }, [deck])

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  }, [session])

  const signIn = (playerTag: string) => {
    setSession({ signedIn: true, playerTag })
    setShowSignIn(false)
    setView('battle')
  }

  const signOut = () => {
    setSession({ signedIn: false, playerTag: '' })
    setView('home')
  }

  const page = (() => {
    switch (view) {
      case 'collection':
        return <CollectionPage onOpen={setSelectedCard} />
      case 'deck':
        return <DeckBuilder deck={deck} setDeck={setDeck} onOpen={setSelectedCard} />
      case 'battle':
        return session.signedIn
          ? null
          : <HomePage onNavigate={setView} onOpen={setSelectedCard} onSignIn={() => setShowSignIn(true)} />
      case 'rules':
        return <RulesPage />
      default:
        return <HomePage onNavigate={setView} onOpen={setSelectedCard} onSignIn={() => setShowSignIn(true)} />
    }
  })()

  return (
    <div className="site-shell">
      <AppHeader
        active={view}
        session={session}
        onNavigate={setView}
        onSignIn={() => setShowSignIn(true)}
        onSignOut={signOut}
      />
      {session.signedIn && (
        <div className={view === 'battle' ? 'preserved-battle active' : 'preserved-battle'}>
          <BattlePage playerTag={session.playerTag} />
        </div>
      )}
      {view !== 'battle' && page}
      {!session.signedIn && view === 'battle' && page}
      <footer className="site-footer">
        <span>HOODMON TCG · SERIES 1</span>
        <span>110 CARD DIGITAL LIBRARY</span>
        <span>AWAKEN THE BOND</span>
      </footer>
      <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} onSignIn={signIn} />}
    </div>
  )
}

function AppHeader({
  active,
  session,
  onNavigate,
  onSignIn,
  onSignOut,
}: {
  active: View
  session: PlayerSession
  onNavigate: (view: View) => void
  onSignIn: () => void
  onSignOut: () => void
}) {
  const nav: Array<[View, string]> = session.signedIn
    ? [
        ['battle', 'BATTLE'],
        ['collection', 'CARDS'],
        ['deck', 'DECK BUILDER'],
        ['rules', 'RULES'],
      ]
    : [
        ['home', 'HOME'],
        ['collection', 'CARDS'],
        ['rules', 'RULES'],
      ]

  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => onNavigate(session.signedIn ? 'battle' : 'home')}>
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
      <div className="header-actions">
        {session.signedIn ? (
          <div className="player-chip">
            <span>PLAYER</span><b>{session.playerTag}</b>
            <button onClick={onSignOut}>SIGN OUT</button>
          </div>
        ) : (
          <button className="header-sign-in" onClick={onSignIn}>SIGN IN</button>
        )}
        <div className="series-badge"><b>110</b><span>SERIES 1</span></div>
      </div>
    </header>
  )
}

function HomePage({ onNavigate, onOpen, onSignIn }: { onNavigate: (view: View) => void; onOpen: (card: SeriesCard) => void; onSignIn: () => void }) {
  const featureIds = ['HDM-001', 'HDM-063', 'HDM-078', 'HDM-094']
  const featured = featureIds.map((id) => series1Cards.find((card) => card.id === id)!).filter(Boolean)

  return (
    <main className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SERIES 1 · COMPLETE DIGITAL CARD LIBRARY</span>
          <h1>AWAKEN<br /><em>THE BOND.</em></h1>
          <p>Build a 40-card Hoodmon Deck, bring a separate 6-card Task Deck, choose your Tamer, and battle for 4 Objective Stars.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={onSignIn}>SIGN IN TO THE ARENA</button>
            <button className="secondary-action" onClick={() => onNavigate('collection')}>VIEW ALL 110 CARDS</button>
          </div>
        </div>
        <div className="hero-stack" aria-label="Featured Hoodmon cards">
          {featured.map((card, index) => (
            <button key={card.id} className={`hero-card hero-card-${index + 1}`} onClick={() => onOpen(card)}>
              <img src={card.image} alt={`${card.id} ${card.name}`} />
            </button>
          ))}
        </div>
      </section>

      <section className="stat-grid">
        <StatCard value="2,500" label="STARTING LP" />
        <StatCard value="5" label="STARTING BOND" />
        <StatCard value="10" label="BOND CAP" />
        <StatCard value="4" label="OBJECTIVE STARS TO WIN" />
      </section>

      <section className="feature-grid">
        <Feature title="110 Improved Cards" text="Every Series 1 card asset in the current remaster is included in the app library." action="Browse collection" onClick={() => onNavigate('collection')} />
        <Feature title="Persistent Deck Builder" text="Build Main, Task, and Tamer sections. Your current deck saves in your browser automatically." action="Build now" onClick={() => onNavigate('deck')} />
        <Feature title="Player Arena" text="Signed-in players now land directly in battle, with guided phases, Tasks, evolution, reactions, knockout promotion, and victory state." action="Enter arena" onClick={onSignIn} />
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
        <img loading="lazy" src={card.image} alt={`${card.id} ${card.name}`} />
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
                <img src={card.image} alt="" />
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

function BattlePage({ playerTag }: { playerTag: string }) {
  return (
    <main className="page battle-page">
      <div className="battle-home-heading"><div><span className="eyebrow">PLAYER HOME · LIVE BATTLE</span><h1>STREET BATTLE</h1></div><div className="battle-player-welcome">WELCOME BACK <b>{playerTag}</b></div></div>
      <GameProvider definitions={demoDefinitions} setup={demoSetup} storageKey={`hoodmon.match.v4.${playerTag.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`}>
        <BattleTable />
      </GameProvider>
    </main>
  )
}

function BattleTable() {
  const { state } = useGame()
  const [selectedHandCard, setSelectedHandCard] = useState<string | null>(null)
  const [draggingHandCard, setDraggingHandCard] = useState<string | null>(null)
  const interactionCard = draggingHandCard ?? selectedHandCard

  return (
    <section className={`app-shell viewport-${state.viewportOwner.toLowerCase()}`}>
      <header className="battle-topbar">
        <div className="brand"><span className="crown">♛</span><div><h2>HOODMON</h2><small>STREET GRID BATTLE ENGINE</small></div></div>
        <div className="match-meta"><span>ROUND <b>{state.round}</b></span><span>TURN <b>{state.turnNumber}</b></span><span>STATUS <b>{state.status}</b></span></div>
      </header>
      <PhaseBar />
      <PlayerPanel playerId="P2" opponent />
      <div className="center-mark"><span>AWAKEN THE BOND</span></div>
      <PlayerPanel
        playerId="P1"
        handCardId={interactionCard}
        acceptHandDrops
        onCardPlayed={() => { setSelectedHandCard(null); setDraggingHandCard(null) }}
      />
      <BattleControls />
      <aside className="event-log">
        <h3>BATTLE FEED</h3>
        {[...state.eventLog].reverse().slice(0, 8).map((line, i) => <div key={`${line}-${i}`}>{line}</div>)}
      </aside>
      <BattleHand
        playerId="P1"
        selectedCardId={selectedHandCard}
        onSelectedCardChange={setSelectedHandCard}
        onDraggingCardChange={setDraggingHandCard}
      />
    </section>
  )
}

function RulesPage() {
  return (
    <main className="page rules-page">
      <PageTitle eyebrow="OFFICIAL v2.0 · SEPTEMBER 2026" title="CORE RULES" subtitle="Current standard implemented by the digital battle engine" />
      <section className="rules-grid">
        <RuleBlock number="01" title="SETUP"><p>Each player uses a <b>40-card Hoodmon Deck</b>, separate <b>6-card Task Deck</b>, and <b>1 Tamer</b>. Draw <b>5 cards</b>, mulligan a no-Basic hand, then place <b>1 Basic Active</b> and optionally <b>1 Basic Reserve</b> for free. Start at <b>2,500 LP</b>, <b>5 Bond</b>, and <b>0 Stars</b>.</p></RuleBlock>
        <RuleBlock number="02" title="BOND"><p>Gain <b>+1 Bond</b> during your Bond Phase, up to <b>10</b>. Unspent Bond carries over. Normal deployment and evolution pay the printed Bond Cost.</p></RuleBlock>
        <RuleBlock number="03" title="BOARD"><p>Each player has <b>1 Active Hoodmon</b>, up to <b>3 Reserves</b>, <b>3 Magic/Equipment</b> zones, <b>2 Trap</b> zones, <b>1 Field</b>, and a <b>3-slot Task Card Zone</b>.</p></RuleBlock>
        <RuleBlock number="04" title="COMMANDS"><p>Each ready Hoodmon normally has <b>1 Command</b>. The Active may Battle or Task. Reserve Hoodmon may Task and use legal skills, but cannot normally Battle.</p></RuleBlock>
        <RuleBlock number="05" title="EVOLUTION"><p>No normal evolution during <b>Round 1</b>. From Round 2, Active or Reserve Hoodmon may evolve during Main by using the correct next-stage card from hand and paying its printed Bond Cost. Damage does not automatically heal.</p></RuleBlock>
        <RuleBlock number="06" title="TASKS"><p>Each player begins with <b>1 face-up Task</b>. Either player may attempt either face-up Task using a ready Active or Reserve Hoodmon. Major/Crisis Tasks normally award an Objective Star.</p></RuleBlock>
        <RuleBlock number="07" title="COMBAT"><p>Printed attack damage is used as written; <b>ATK is not automatically added</b>. Attacks normally target the opposing Active Hoodmon. Direct Tamer attacks are legal only when no opposing Active Hoodmon exists.</p></RuleBlock>
        <RuleBlock number="08" title="TURN"><p><b>Refresh → Draw → Bond → Main → Command → End.</b> Reaction windows open after attacks, Task attempts, evolution, or effects that allow a response.</p></RuleBlock>
        <RuleBlock number="09" title="VICTORY"><p>Win by reducing the opposing Tamer to <b>0 LP</b>, reaching <b>4 Objective Stars</b>, or making the opponent draw from an empty Hoodmon Deck.</p></RuleBlock>
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

function SignInModal({ onClose, onSignIn }: { onClose: () => void; onSignIn: (playerTag: string) => void }) {
  const [playerTag, setPlayerTag] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const tag = playerTag.trim()
    if (!tag) return
    onSignIn(tag.slice(0, 24))
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="sign-in-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <span className="brand-crown">♛</span>
        <span className="eyebrow">PLAYER SESSION</span>
        <h2>ENTER THE HOODMON ARENA</h2>
        <p>This build uses a local player profile while full account authentication is connected later. Your player tag stays on this device.</p>
        <label>
          <span>PLAYER TAG</span>
          <input autoFocus value={playerTag} onChange={(event) => setPlayerTag(event.target.value)} maxLength={24} placeholder="Enter your name or tag" />
        </label>
        <div className="sign-in-actions">
          <button type="button" className="secondary-action" onClick={onClose}>CANCEL</button>
          <button className="primary-action" disabled={!playerTag.trim()}>SIGN IN & BATTLE</button>
        </div>
      </form>
    </div>
  )
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
        <img src={card.image} alt={`${card.id} ${card.name}`} />
        <div className="modal-meta"><span>{card.id} · {card.kind}</span><h2>{card.name}</h2><p>{card.family}</p></div>
      </div>
    </div>
  )
}
