import { describe, it, expect } from 'vitest'
import { formatTime, paceStatus, SEGMENTS, TOTAL_SEC } from './pace'

describe('formatTime', () => {
  it('formats sub-minute and minute values as M:SS', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(125)).toBe('2:05')
    expect(formatTime(TOTAL_SEC)).toBe('4:00')
  })

  it('clamps negatives to 0:00 and floors fractional seconds', () => {
    expect(formatTime(-3)).toBe('0:00')
    expect(formatTime(9.9)).toBe('0:09')
  })
})

describe('paceStatus', () => {
  it('is "ok" with comfortable time left in the segment', () => {
    expect(paceStatus(5, 20)).toBe('ok')
    expect(paceStatus(30, 120)).toBe('ok')
  })

  it('is "warn" within the last 10s of the segment', () => {
    expect(paceStatus(15, 20)).toBe('warn')
    expect(paceStatus(119, 120)).toBe('warn')
  })

  it('is "over" past the segment deadline', () => {
    expect(paceStatus(25, 20)).toBe('over')
  })

  it('is "over" past the total even if the segment would allow it', () => {
    expect(paceStatus(250, 999)).toBe('over')
  })
})

describe('SEGMENTS', () => {
  it('spans the full 4 minutes contiguously', () => {
    expect(SEGMENTS[0].startSec).toBe(0)
    expect(SEGMENTS[SEGMENTS.length - 1].endSec).toBe(TOTAL_SEC)
    for (let i = 1; i < SEGMENTS.length; i++) {
      expect(SEGMENTS[i].startSec).toBe(SEGMENTS[i - 1].endSec)
    }
  })
})
