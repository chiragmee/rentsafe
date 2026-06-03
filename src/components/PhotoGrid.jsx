import { useRef, useState } from 'react'

export default function PhotoGrid({ photos = [], onAdd, onRemove, readonly = false, minPhotos = 0 }) {
  const cameraRef = useRef()
  const uploadRef = useRef()
  const [lightbox, setLightbox] = useState(null)

  function handleFiles(e) {
    Array.from(e.target.files).forEach((f) => onAdd(f))
    e.target.value = ''
  }

  return (
    <div>
      {/* Photo thumbnails */}
      <div className="flex flex-wrap gap-2 mt-2">
        {photos.map((src, i) => (
          <div key={i} className="relative group">
            <img
              src={src}
              alt={`photo ${i + 1}`}
              className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer"
              onClick={() => setLightbox(src)}
            />
            {!readonly && onRemove && (
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#E05252] text-white text-xs hidden group-hover:flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {!readonly && (
        <div className="flex gap-2 mt-2">
          {/* Camera */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:border-navy hover:text-navy transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Take Photo
          </button>

          {/* Gallery upload */}
          <button
            onClick={() => uploadRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:border-navy hover:text-navy transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Upload
          </button>
        </div>
      )}

      {/* Camera input — triggers device camera */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* Gallery input — opens file picker / gallery */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {minPhotos > 0 && photos.length < minPhotos && (
        <p className="text-xs text-[#E8A020] mt-1.5">
          Min {minPhotos} photo{minPhotos > 1 ? 's' : ''} required · {photos.length}/{minPhotos} taken
        </p>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="full" className="max-w-full max-h-full rounded" />
        </div>
      )}
    </div>
  )
}
