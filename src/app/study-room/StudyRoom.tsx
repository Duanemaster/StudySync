'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  UploadCloud,
  Sparkles,
  BookOpen,
  BrainCircuit,
  Terminal,
  MessageSquare,
  Layers,
  Send,
  Check,
  Flame,
  Coffee,
  SkipForward,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { markTaskAsDone } from '@/app/tasks/actions'
import { logFocusSession, extractPdfText, generateFlashcards, chatWithDocument } from './actions'

export type StudyTask = {
  id: string
  title: string
  type: string
  due_date: string
  estimated_mins: number | null
  subjects: { name: string; color: string | null } | null
}

type Stats = { todayMins: number; weekMins: number; streak: number; available: boolean }

const BREAK_MINS = 5
const LONG_BREAK_MINS = 15
const FOCUS_OPTIONS = [15, 25, 45, 60]

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.1
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // ignore
  }
}

export default function StudyRoom({
  tasks: initialTasks,
  initialTaskId,
  plannedMins,
  stats,
}: {
  tasks: StudyTask[]
  initialTaskId: string | null
  plannedMins: number | null
  stats: Stats
}) {
  // ---------- Task ----------
  const [tasks, setTasks] = useState<StudyTask[]>(initialTasks)
  const [selectedId, setSelectedId] = useState<string>(
    initialTaskId && initialTasks.some((t) => t.id === initialTaskId) ? initialTaskId : ''
  )
  const [notice, setNotice] = useState('')
  const [isDonePending, startTransition] = useTransition()
  const selected = tasks.find((t) => t.id === selectedId) ?? null

  // ---------- Timer ----------
  const initialFocus = plannedMins ? Math.min(Math.max(plannedMins, 5), 120) : 25
  const focusOptions = Array.from(new Set([...FOCUS_OPTIONS, initialFocus])).sort((a, b) => a - b)

  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [focusMins, setFocusMins] = useState(initialFocus)
  const [secondsLeft, setSecondsLeft] = useState(initialFocus * 60)
  const [running, setRunning] = useState(false)
  const [sessionsDone, setSessionsDone] = useState(0)
  const [todayMins, setTodayMins] = useState(stats.todayMins)
  const endAtRef = useRef<number | null>(null)

  const breakMins = sessionsDone > 0 && sessionsDone % 4 === 0 ? LONG_BREAK_MINS : BREAK_MINS
  const totalSeconds = mode === 'focus' ? focusMins * 60 : breakMins * 60
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0

  function handleComplete() {
    beep()
    if (mode === 'focus') {
      const n = sessionsDone + 1
      setSessionsDone(n)
      setTodayMins((t) => t + focusMins)
      void logFocusSession(selectedId || null, focusMins).catch(() => {})
      setMode('break')
      setSecondsLeft((n % 4 === 0 ? LONG_BREAK_MINS : BREAK_MINS) * 60)
    } else {
      setMode('focus')
      setSecondsLeft(focusMins * 60)
    }
  }

  const completeRef = useRef(handleComplete)
  useEffect(() => {
    completeRef.current = handleComplete
  })

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.round(((endAtRef.current ?? 0) - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        clearInterval(id)
        setRunning(false)
        completeRef.current()
      }
    }, 250)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    document.title = running
      ? `${formatTime(secondsLeft)} | ${mode === 'focus' ? 'Focus' : 'Break'}`
      : 'Focus Mode'
    return () => {
      document.title = 'Focus Mode'
    }
  }, [running, secondsLeft, mode])

  function toggleTimer() {
    if (running) {
      setRunning(false)
    } else {
      endAtRef.current = Date.now() + secondsLeft * 1000
      setRunning(true)
    }
  }

  function resetTimer() {
    setRunning(false)
    setSecondsLeft(totalSeconds)
  }

  function skipBreak() {
    setRunning(false)
    setMode('focus')
    setSecondsLeft(focusMins * 60)
  }

  function changeFocus(mins: number) {
    if (running) return
    setFocusMins(mins)
    if (mode === 'focus') setSecondsLeft(mins * 60)
  }

  function handleMarkDone() {
    if (!selected) return
    const id = selected.id
    const title = selected.title
    startTransition(async () => {
      const res = await markTaskAsDone(id)
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id))
        setSelectedId('')
        setNotice(`"${title}" marked as done. Nice work!`)
      } else {
        setNotice(res.error ?? 'Could not update the task. Please try again.')
      }
    })
  }

  // ---------- AI Assistant (Connected to Ollama) ----------
  const [appState, setAppState] = useState<'upload' | 'options' | 'flashcards' | 'chat'>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [documentText, setDocumentText] = useState('')
  
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [activeCardId, setActiveCardId] = useState<number | null>(null)
  
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setAiError('')
    
    const formData = new FormData()
    formData.append('file', file)

    const res = await extractPdfText(formData)
    
    if (res.success && res.data) {
      setDocumentText(res.data)
      setAppState('options')
      setChatMessages([
        { role: 'ai', content: `Document "${file.name}" loaded successfully! What would you like to ask?` }
      ])
    } else {
      setAiError(res.error ?? 'Failed to read PDF file.')
    }
    
    setIsProcessing(false)
  }

  const handleGenerateFlashcards = async () => {
    if (!documentText) return
    
    setIsProcessing(true)
    setAiError('')
    
    const res = await generateFlashcards(documentText)
    
    if (res.success && res.data) {
      setFlashcards(res.data)
      setAppState('flashcards')
    } else {
      setAiError(res.error ?? 'Ollama failed to generate flashcards. Ensure your local model is running.')
    }
    
    setIsProcessing(false)
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const newMessages = [...chatMessages, { role: 'user', content: chatInput }]
    setChatMessages(newMessages)
    setChatInput('')
    setIsProcessing(true)

    // Filter out initial welcome message if needed, or pass them all
    const mappedHistory = newMessages
      .filter(m => m.role !== 'ai' || m.content !== chatMessages[0]?.content) 
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))

    const res = await chatWithDocument(mappedHistory, documentText)

    if (res.success && res.data) {
      setChatMessages([...newMessages, { role: 'ai', content: res.data.content }])
    } else {
      setChatMessages([...newMessages, { role: 'ai', content: '❌ Error: ' + (res.error ?? 'Failed to connect to Ollama.') }])
    }
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/planner"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800"
            title="Back to Smart Planner"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-600" /> Focus Mode
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row h-full">
        {/* Left Panel: AI Assistant */}
        <div className="flex-1 p-4 md:p-6 lg:p-10 flex flex-col overflow-y-auto min-h-[60vh] lg:min-h-0 relative">
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Terminal className="w-6 h-6 text-indigo-600" />AI Assistant
            </h2>
           
          </div>

          {aiError && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {aiError}
            </div>
          )}

          {appState === 'upload' && (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50 p-6 text-center">
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Sparkles className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
                  <h3 className="text-lg font-bold text-indigo-900">Reading Document...</h3>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Upload PDF or Notes</h3>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 h-12"
                  >
                    Browse Files
                  </Button>
                </>
              )}
            </div>
          )}

          {appState === 'options' && (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-slate-200 rounded-3xl bg-white p-6 md:p-10 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Document Ready!</h3>
              <p className="text-slate-500 font-medium mb-8">What would you like to do with this file?</p>
              
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse mb-4" />
                  <p className="text-indigo-900 font-bold">Ollama is thinking...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                  <Button onClick={handleGenerateFlashcards} className="h-16 text-md font-bold rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                    <Layers className="w-5 h-5 mr-2" /> Generate Flashcards
                  </Button>
                  <Button onClick={() => setAppState('chat')} className="h-16 text-md font-bold rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                    <MessageSquare className="w-5 h-5 mr-2" /> Chat with PDF
                  </Button>
                </div>
              )}
            </div>
          )}

          {appState === 'flashcards' && (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" /> AI Generated Flashcards
                </h3>
                <Button variant="outline" size="sm" onClick={() => setAppState('options')} className="h-8 rounded-lg font-bold text-slate-500">
                  Back
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {flashcards.map((card) => (
                  <div key={card.id} onClick={() => setActiveCardId(activeCardId === card.id ? null : card.id)} className="relative h-48 w-full perspective-1000 cursor-pointer group">
                    <div className={`w-full h-full duration-500 preserve-3d relative ${activeCardId === card.id ? 'rotate-y-180' : ''}`}>
                      <div className="absolute w-full h-full backface-hidden bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col justify-center items-center text-center overflow-auto">
                        <p className="font-bold text-indigo-950">{card.question}</p>
                      </div>
                      <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col justify-center items-center text-center overflow-auto">
                        <p className="font-bold text-emerald-950">{card.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {appState === 'chat' && (
            <div className="flex-1 flex flex-col h-full bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
              <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600" /> Ollama Chat
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setAppState('options')} className="h-8 rounded-lg font-bold text-slate-500">
                  Back
                </Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] p-3 rounded-2xl text-sm font-medium bg-white border border-slate-200 text-slate-500 rounded-bl-none shadow-sm flex gap-1">
                      <span className="animate-bounce">●</span><span className="animate-bounce" style={{animationDelay: '0.2s'}}>●</span><span className="animate-bounce" style={{animationDelay: '0.4s'}}>●</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white border-t border-slate-200">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <Input 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    placeholder="Ask something about the notes..." 
                    className="flex-1 rounded-xl bg-slate-50 h-11" 
                    disabled={isProcessing}
                  />
                  <Button type="submit" disabled={isProcessing || !chatInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 w-11 rounded-xl p-0 shrink-0">
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Task + Timer + Stats (on top for mobile) */}
        <div className="order-first lg:order-last w-full lg:w-96 bg-white lg:bg-slate-50 p-4 md:p-6 flex flex-col gap-4 border-b lg:border-b-0 lg:border-l border-slate-200 shrink-0">
          {/* TASK */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-500 uppercase tracking-wider text-xs">Studying</h3>

            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value)
                setNotice('')
              }}
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Free study (no task)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.subjects?.name ? `${t.subjects.name} • ` : ''}
                  {t.title}
                </option>
              ))}
            </select>

            {selected && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selected.subjects?.color || '#cbd5e1' }}
                  />
                  <p className="font-bold text-slate-900">{selected.title}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                  <span className="capitalize">{selected.type}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selected.due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'Asia/Manila',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {selected.estimated_mins ?? 30} mins est.
                  </span>
                </div>
                <Button
                  onClick={handleMarkDone}
                  disabled={isDonePending}
                  variant="outline"
                  className="w-full h-10 rounded-xl font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <Check className="w-4 h-4 mr-1.5" /> {isDonePending ? 'Saving...' : 'Mark as done'}
                </Button>
              </div>
            )}

            {notice && <p className="text-sm font-semibold text-emerald-600">{notice}</p>}
          </div>

          {/* TIMER */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 text-center shadow-sm">
            <h3 className="font-bold text-slate-500 uppercase tracking-wider text-xs md:text-sm mb-4 flex items-center justify-center gap-2">
              {mode === 'focus' ? 'Focus Timer' : (<><Coffee className="w-4 h-4" /> Break Time</>)}
            </h3>

            {mode === 'focus' && (
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                {focusOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => changeFocus(m)}
                    disabled={running}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      focusMins === m
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            )}

            <div className="text-5xl md:text-7xl font-black text-slate-800 tracking-tighter mb-4 tabular-nums">
              {formatTime(secondsLeft)}
            </div>

            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full rounded-full transition-all duration-300 ${mode === 'focus' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={toggleTimer}
                className={`h-12 md:h-14 px-6 md:px-8 rounded-2xl font-bold text-base md:text-lg transition-all ${
                  running ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {running ? (
                  <><Pause className="w-5 h-5 mr-2" /> Pause</>
                ) : (
                  <><Play className="w-5 h-5 mr-2" /> {mode === 'focus' ? 'Start' : 'Start break'}</>
                )}
              </Button>
              <Button onClick={resetTimer} variant="outline" className="h-12 w-12 md:h-14 md:w-14 rounded-2xl border-slate-200" title="Reset">
                <RotateCcw className="w-5 h-5" />
              </Button>
              {mode === 'break' && (
                <Button onClick={skipBreak} variant="outline" className="h-12 w-12 md:h-14 md:w-14 rounded-2xl border-slate-200" title="Skip break">
                  <SkipForward className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Today</p>
              <p className="text-xl font-extrabold mt-1">{todayMins}m</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sessions</p>
              <p className="text-xl font-extrabold mt-1">{sessionsDone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Streak</p>
              <p className="text-xl font-extrabold mt-1 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" /> {stats.streak}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  )
}