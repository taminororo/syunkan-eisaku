import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  Briefcase,
  Dices,
  FileQuestion,
  GraduationCap,
  MessageCircle,
  Newspaper,
  Plane,
  UtensilsCrossed,
} from 'lucide-react'
import type { Situation } from '../constants'

const ICONS: Record<Situation, LucideIcon> = {
  '日常会話': MessageCircle,
  'ビジネス・会議': Briefcase,
  '旅行・空港・ホテル': Plane,
  'レストラン・買い物': UtensilsCrossed,
  '学校・大学': GraduationCap,
  'ニュース・時事': Newspaper,
  '自由テーマ': Dices,
}

type Props = { situation: Situation | string } & LucideProps

export function SituationIcon({ situation, className, ...rest }: Props) {
  const Icon = situation in ICONS ? ICONS[situation as Situation] : FileQuestion
  return <Icon className={className} aria-hidden {...rest} />
}
