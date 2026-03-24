import Dexie, { type EntityTable } from 'dexie'
import type { AnswerRecord } from './types'

class AppDB extends Dexie {
  answers!: EntityTable<AnswerRecord, 'id'>

  constructor() {
    super('SyunkanEisakuDB')
    this.version(1).stores({ answers: '++id, problemId, timestamp' })
    this.version(2).stores({ answers: '++id, situation, level, timestamp' })
    this.version(3).stores({ answers: '++id, situation, level, timestamp' })
  }
}

export const db = new AppDB()
