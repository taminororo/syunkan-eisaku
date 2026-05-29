// 状況描写英作文のお題画像カタログ。
// id は /scenes/{id}.jpg と一対一（バックエンドの許可リストとも一致させること）。
export interface Scene {
  id: string
  label: string // UI用の短いラベル（答えにならない程度の場所名）
  file: string
}

export const SCENES: Scene[] = [
  { id: 'cafe', label: 'カフェ', file: '/scenes/cafe.jpg' },
  { id: 'airport', label: '空港', file: '/scenes/airport.jpg' },
  { id: 'meeting', label: '会議室', file: '/scenes/meeting.jpg' },
  { id: 'conversation', label: '公園での会話', file: '/scenes/conversation.jpg' },
  { id: 'classroom', label: '教室', file: '/scenes/classroom.jpg' },
  { id: 'news', label: 'ニュース視聴', file: '/scenes/news.jpg' },
  { id: 'park', label: '公園', file: '/scenes/park.jpg' },
]
