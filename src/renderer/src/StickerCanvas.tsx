import { useEffect, useRef } from 'react'
import type { Sticker } from '../../shared/types'
import { composeSticker, loadImage } from './compose'

interface Props {
  projectId: string
  sticker: Sticker
  onOverflow?: (overflow: boolean) => void
}

// 画像+文字の合成プレビュー。文字だけの変更では画像生成を呼ばない。
export function StickerCanvas({ projectId, sticker, onOverflow }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let cancelled = false
    const draw = async () => {
      const canvas = ref.current
      if (!canvas) return
      const base = sticker.imagePath
        ? await loadImage(await window.stamp.readImage(projectId, sticker.imagePath))
        : null
      if (cancelled) return
      const r = composeSticker(canvas, base, sticker.text, sticker.textStyle)
      onOverflow?.(r.overflow)
    }
    draw().catch(() => undefined)
    return () => { cancelled = true }
  }, [projectId, sticker.imagePath, sticker.text, sticker.textStyle, onOverflow])
  return <canvas ref={ref} />
}
