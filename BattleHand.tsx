import { useMemo, useState, type DragEvent } from 'react'
import { cardById } from '../data/series1Cards'
import { useGame } from '../game/GameContext'
import type { PlayerId } from '../game/engine/types'

interface BattleHandProps {
  playerId: PlayerId
  selectedCardId: string | null
  onSelectedCardChange: (cardId: string | null) => void
  onDraggingCardChange: (cardId: string | null) => void
}

export function BattleHand({ playerId, selectedCardId, onSelectedCardChange, onDraggingCardChange }: BattleHandProps) {
  const { state, definitions } = useGame()
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const player = state.players[playerId]
  const previewId = hoveredCardId ?? selectedCardId
  const preview = previewId ? cardById[previewId] : undefined
  const previewDefinition = previewId ? definitions[previewId] : undefined

  const instances = useMemo(() => {
    const seen: Record<string, number> = {}
    return player.hand.map((id) => {
      seen[id] = (seen[id] ?? 0) + 1
      return { id, key: `${id}-${seen[id]}` }
    })
  }, [player.hand])

  const startDrag = (event: DragEvent<HTMLButtonElement>, cardId: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/hoodmon-card-id', cardId)
    onDraggingCardChange(cardId)
    onSelectedCardChange(cardId)
  }

  const endDrag = () => onDraggingCardChange(null)

  return (
    <section className="battle-hand-shell" aria-label={`${playerId} hand`}>
      <div className="hand-heading">
        <div><span className="eyebrow">YOUR HAND</span><strong>{player.hand.length} CARDS</strong></div>
        <small>{state.currentPlayerTurn === playerId && state.currentPhase === 'Main' ? 'DRAG A CARD TO A GLOWING ZONE' : 'YOUR HAND STAYS VISIBLE · PLAYABLE ZONES GLOW WHEN LEGAL'}</small>
      </div>

      <div className="battle-hand-fan">
        {instances.length === 0 && <div className="empty-hand">NO CARDS IN HAND</div>}
        {instances.map(({ id, key }, index) => {
          const art = cardById[id]
          const definition = definitions[id]
          const selected = selectedCardId === id
          return (
            <button
              type="button"
              className={`hand-card ${selected ? 'selected' : ''}`}
              key={key}
              draggable
              onDragStart={(event) => startDrag(event, id)}
              onDragEnd={endDrag}
              onMouseEnter={() => setHoveredCardId(id)}
              onMouseLeave={() => setHoveredCardId(null)}
              onClick={() => onSelectedCardChange(selected ? null : id)}
              style={{ zIndex: index + 1 }}
              aria-label={`${definition?.name ?? id}${selected ? ', selected' : ''}`}
            >
              {art ? <img src={art.image} alt={definition?.name ?? id} draggable={false} /> : <span className="hand-card-fallback">{definition?.name ?? id}</span>}
              <span className="hand-card-cost">{definition?.bondCost ?? 0}</span>
            </button>
          )
        })}
      </div>

      {previewId && (
        <aside className="hand-preview">
          {preview ? <img src={preview.image} alt="" /> : <div className="preview-fallback">{previewDefinition?.name ?? previewId}</div>}
          <div>
            <span className="eyebrow">SELECTED / PREVIEW</span>
            <strong>{previewDefinition?.name ?? previewId}</strong>
            <small>{previewDefinition?.cardType.toUpperCase() ?? 'CARD'}{previewDefinition?.stageLevel ? ` · STAGE ${previewDefinition.stageLevel}` : ''} · COST {previewDefinition?.bondCost ?? 0}</small>
          </div>
        </aside>
      )}
    </section>
  )
}
