'use client'

import { useState } from 'react'
import type { MediaKitConfig } from '@/types/media-kit'

interface ValuePropositionsProps {
  config: MediaKitConfig
}

export function ValuePropositions({ config }: ValuePropositionsProps) {
  const [flipped, setFlipped] = useState<number[]>([])

  const toggleFlip = (idx: number) => {
    setFlipped(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  return (
    <section className="value-propositions">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        {config.valuePropositions.map((vp, idx) => (
          <div
            key={idx}
            className={`flip-card ${flipped.includes(idx) ? 'flipped' : ''}`}
            onClick={() => toggleFlip(idx)}
          >
            <div className="flip-card-front">
              <h3>{vp.title}</h3>
            </div>
            <div className="flip-card-back">
              <p>{vp.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
