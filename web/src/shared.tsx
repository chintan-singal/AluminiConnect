import { useEffect, useState, type ReactNode } from 'react'
export type Member = {
  id: number
  name: string
  email?: string
  batch: number
  role: string
  status: string
  field: string
  city: string
  visible: number
  mentorTopic: string
}
export type Booking = {
  status: string
  revision: number
  queuePosition: number | null
}
export type EventItem = {
  id: number
  title: string
  kind: string
  startsAt: string
  venue: string
  capacity: number
  available: number
  description: string
  mentorName: string | null
  mentorId?: number | null
  booking: Booking
}
export type Message = {
  _id: string
  senderId: number
  recipientId: number
  senderName?: string
  recipientName?: string
  body: string
}
export type Notice = {
  _id: string
  title: string
  body: string
  authorName: string
}
export type Job = {
  _id: string
  title: string
  company: string
  location: string
  workMode: string
  type: string
  field: string
  description: string
  skills: string[]
  salaryRange: string
  posterId: number
  posterName: string
  closesAt: string
  synthetic?: boolean
  status?: string
}
export type Page<T> = { items: T[]; next: string | null }
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code.toLowerCase().replaceAll('_', ' '))
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const res = await fetch('/api' + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data.code || 'Request failed')
  }
  return res.status === 204 ? (undefined as T) : res.json()
}
export function useData<T>(path: string, version: number) {
  const [result, set] = useState<{ path: string; data?: T; error?: string }>({
    path,
  })
  useEffect(() => {
    let active = true
    api<T>(path)
      .then((data) => {
        if (active) set({ path, data })
      })
      .catch((e) => {
        if (active) set({ path, error: e.message })
      })
    return () => {
      active = false
    }
  }, [path, version])
  return result.path === path ? result : { path }
}
export function Result<T>({
  result,
  children,
}: {
  result: { data?: T; error?: string }
  children: (value: T) => ReactNode
}) {
  if (result.error) return <p role="alert">{result.error}</p>
  if (result.data === undefined) return <p role="status">Loading…</p>
  return <>{children(result.data)}</>
}
export type Run = (task: () => Promise<void>) => Promise<void>
export function fields(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form)) as Record<string, string>
}
export function day(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}
export function when(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(new Date(value))
}
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="panel section-panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
