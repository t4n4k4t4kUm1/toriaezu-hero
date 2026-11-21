// 画面の上に重ねて出す小窓（ダイアログ）
import type { ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* 中身をクリックしたときは閉じない */}
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
