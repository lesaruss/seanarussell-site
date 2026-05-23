'use client'

import { useState } from 'react'
import type { MediaKitConfig } from '@/types/media-kit'

interface MediaAssetsProps {
  config: MediaKitConfig
}

export function MediaAssets({ config }: MediaAssetsProps) {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'press'>('photos')

  return (
    <section className="media-assets">
      <div className="media-tabs">
        <button
          className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          Photos
        </button>
        <button
          className={`tab-button ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          Videos
        </button>
        <button
          className={`tab-button ${activeTab === 'press' ? 'active' : ''}`}
          onClick={() => setActiveTab('press')}
        >
          Press
        </button>
      </div>

      {activeTab === 'photos' && (
        <div className="photos-grid">
          {config.media.photos.map((photo, idx) => (
            <div key={idx} className="photo-item">
              <img src={photo.src} alt={photo.alt} />
              <p>{photo.title}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="videos-grid">
          {config.media.videos.map((video, idx) => (
            <div key={idx} className="video-item">
              <iframe
                src={video.src}
                title={video.title}
                allowFullScreen
              />
              <p>{video.title}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'press' && (
        <div className="press-grid">
          {config.media.press.map((item, idx) => (
            <a key={idx} href={item.url} className="press-item">
              <p className="press-publication">{item.publication}</p>
              <h3>{item.headline}</h3>
              <span className="press-date">{item.date}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
