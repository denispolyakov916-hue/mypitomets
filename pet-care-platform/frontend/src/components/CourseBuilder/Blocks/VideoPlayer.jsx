/**
 * VideoPlayer - Продвинутый видео плеер для конструктора
 *
 * Поддерживает различные источники видео, настройки воспроизведения,
 * превью и интеграцию с внешними сервисами.
 */

import { useState, useRef } from 'react'
import ReactPlayer from 'react-player'
import { Play, Pause, Volume2, VolumeX, Maximize, Upload, Link as LinkIcon } from 'lucide-react'

/**
 * VideoPlayer - Компонент видео плеера
 */
function VideoPlayer({ content, settings, onChange, mode = 'edit' }) {
  const playerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [played, setPlayed] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const videoUrl = content?.video_url || ''
  const title = content?.title || ''
  const thumbnail = content?.thumbnail || ''
  const autoplay = settings?.autoplay || false
  const controls = settings?.controls !== false
  const showSubtitles = settings?.show_subtitles || false

  /**
   * Обработка загрузки видео
   */
  const handleDuration = (duration) => {
    setDuration(duration)
    if (content) {
      onChange({
        ...content,
        duration: Math.floor(duration)
      })
    }
  }

  /**
   * Обработка прогресса воспроизведения
   */
  const handleProgress = (progress) => {
    setPlayed(progress.played)
  }

  /**
   * Форматирование времени
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Переключение воспроизведения
   */
  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  /**
   * Переключение звука
   */
  const toggleMute = () => {
    setMuted(!muted)
  }

  /**
   * Изменение громкости
   */
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setMuted(newVolume === 0)
  }

  /**
   * Добавление видео по URL
   */
  const addVideoByUrl = () => {
    if (urlInput.trim()) {
      onChange({
        ...content,
        video_url: urlInput.trim(),
        title: title || 'Видео'
      })
      setUrlInput('')
      setShowUrlInput(false)
    }
  }

  /**
   * Обработка загрузки файла
   */
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // В реальном приложении здесь была бы загрузка на сервер
      const url = URL.createObjectURL(file)
      onChange({
        ...content,
        video_url: url,
        title: file.name,
        is_local: true
      })
    }
  }

  /**
   * Режим просмотра (для пользователя)
   */
  if (mode === 'view') {
    return (
      <div className="w-full">
        {videoUrl ? (
          <div className="relative bg-black rounded-lg overflow-hidden">
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              playing={autoplay && !isPlaying}
              volume={muted ? 0 : volume}
              controls={controls}
              width="100%"
              height="100%"
              onDuration={handleDuration}
              onProgress={handleProgress}
              config={{
                file: {
                  attributes: {
                    controlsList: 'nodownload'
                  }
                }
              }}
            />

            {title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white font-medium">{title}</h3>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🎥</div>
              <p>Видео не загружено</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  /**
   * Режим редактирования (для конструктора)
   */
  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Видео-плеер</h4>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
          >
            <LinkIcon size={14} />
            <span>URL</span>
          </button>

          <label className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 cursor-pointer text-sm">
            <Upload size={14} />
            <span>Файл</span>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Поле для ввода URL */}
      {showUrlInput && (
        <div className="flex space-x-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/video.mp4 или https://youtu.be/..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={addVideoByUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Добавить
          </button>
        </div>
      )}

      {/* Предпросмотр видео */}
      {videoUrl ? (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            playing={isPlaying}
            volume={muted ? 0 : volume}
            controls={controls}
            width="100%"
            height="300px"
            onDuration={handleDuration}
            onProgress={handleProgress}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload'
                }
              }
            }}
          />

          {/* Кастомные контролы (если controls отключены) */}
          {!controls && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3">
              <div className="flex items-center space-x-4 text-white">
                <button onClick={togglePlay} className="hover:text-blue-400">
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <div className="flex-1 flex items-center space-x-2">
                  <button onClick={toggleMute} className="hover:text-blue-400">
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <span className="text-sm">
                  {formatTime(played * duration)} / {formatTime(duration)}
                </span>

                <button className="hover:text-blue-400">
                  <Maximize size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🎥</div>
            <p>Выберите видео файл или добавьте URL</p>
            <p className="text-sm mt-1">Поддерживаются: MP4, WebM, YouTube, Vimeo</p>
          </div>
        </div>
      )}

      {/* Настройки видео */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название видео
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange({
              ...content,
              title: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Название видео"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL превью
          </label>
          <input
            type="url"
            value={thumbnail}
            onChange={(e) => onChange({
              ...content,
              thumbnail: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com/thumbnail.jpg"
          />
        </div>
      </div>

      {/* Настройки воспроизведения */}
      <div className="space-y-3">
        <h5 className="font-medium text-gray-900">Настройки воспроизведения</h5>

        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => onChange({
                ...settings,
                autoplay: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Автовоспроизведение</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={controls}
              onChange={(e) => onChange({
                ...settings,
                controls: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Показывать контролы</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showSubtitles}
              onChange={(e) => onChange({
                ...settings,
                show_subtitles: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Показывать субтитры</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer

