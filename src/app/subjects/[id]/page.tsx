import { createClient } from '@/utils/supabase/server'
import { createTopic } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function SubjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: subject } = await supabase.from('subjects').select('*').eq('id', id).single()
  if (!subject) notFound()

  const { data: topics } = await supabase.from('topics').select('*').eq('subject_id', id).order('created_at', { ascending: true })

  const addTopicWithId = createTopic.bind(null, id)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/subjects" className="text-sm text-indigo-600 hover:underline">← Back to Subjects</Link>
        <h1 className="text-3xl font-bold mt-2 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: subject.color }}></div>
          {subject.name}
        </h1>
        <p className="text-gray-600 mt-1">{subject.description}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add New Topic</CardTitle></CardHeader>
        <CardContent>
          <form action={addTopicWithId} className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Topic Name</label>
              <Input name="name" required placeholder="e.g., Pipelining" />
            </div>
            <div className="space-y-2 w-32">
              <label className="text-sm font-medium">Difficulty (1-5)</label>
              <Input name="difficulty" type="number" min="1" max="5" defaultValue="3" required />
            </div>
            <div className="space-y-2 w-32">
              <label className="text-sm font-medium">Est. Mins</label>
              <Input name="estimatedMins" type="number" min="5" defaultValue="30" required />
            </div>
            <Button type="submit">Add Topic</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Topics List</h2>
        {topics?.map(topic => (
          <Card key={topic.id} className="p-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium">{topic.name}</h3>
              <p className="text-sm text-gray-500">Difficulty: {topic.difficulty} / 5 • {topic.estimated_mins} mins</p>
            </div>
            <div className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full capitalize">
              {topic.status.replace('_', ' ')}
            </div>
          </Card>
        ))}
        {topics?.length === 0 && <p className="text-gray-500">No topics added yet.</p>}
      </div>
    </div>
  )
}