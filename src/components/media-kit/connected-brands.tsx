import Image from 'next/image'
import type { MediaKitConfig } from '@/types/media-kit'

interface ConnectedBrandsProps {
  config: MediaKitConfig
}

export function ConnectedBrands({ config }: ConnectedBrandsProps) {
  return (
    <section className="connected-brands">
      <div className="brands-grid">
        {config.connectedTo.map((brand, idx) => (
          <div key={idx} className="brand">
            <img src={brand.logo} alt={brand.name} />
            <p>{brand.name}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
