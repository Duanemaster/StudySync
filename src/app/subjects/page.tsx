import { createClient } from '@/utils/supabase/server'
import { connection } from 'next/server'
import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
import SubjectsManager from './SubjectsManager'

export default async function SubjectsPage() {
  await connection()
  const supabase = await createClient()

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-5 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              My Subjects
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Manage your courses and color-code your modules.
            </p>
          </div>
        </header>

        <SubjectsManager initialSubjects={subjects ?? []} />
      </div>
    </div>
  )
}