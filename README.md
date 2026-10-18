# StudySync

**Status: Work in Progress**  
_This project is not yet intended for production, but it is available for testing, preview, and code review. It is deployed and hosted on Vercel._

StudySync is a smart study planner and focus web app designed to help students organize tasks, manage free time, and study effectively. It features an automated planner, a Pomodoro-style focus timer, and a local AI assistant that can generate flashcards and answer questions based on uploaded PDF notes.

## Live Demo

Available on Vercel: [study-sync-time.vercel.app] (https://study-sync-time.vercel.app)

## Tech Stack

- **Framework:** Next.js App Router (Next 15+, React 19)
- **Language:** TypeScript
- **Database & Auth:** Supabase (with Row Level Security)
- **Styling:** Tailwind CSS, shadcn/ui, Framer Motion
- **Local AI:** Ollama (`qwen2.5:7b-instruct`)
- **PDF Parsing:** `pdf-parse`

## Core Features

- **Smart Planner:** Automatically schedules study tasks into available free-time blocks based on priority, due dates, and estimated durations.
- **Focus Mode:** A timestamp-based study timer with break intervals that tracks daily study minutes and streaks.
- **Local AI Assistant:** Users can upload PDF notes to a local Ollama instance to automatically generate flashcards or chat with their documents contextually.
- **Optimistic UI:** Fast, flicker-free task management using React's `useOptimistic` and Server Actions.

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Duanemaster/StudySync.git](https://github.com/Duanemaster/StudySync.git)
   cd StudySync
   ```
