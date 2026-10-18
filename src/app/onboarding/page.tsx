import { completeOnboarding } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ message: string }> }) {
  const { message } = await searchParams;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Welcome to StudySync</CardTitle>
          <CardDescription>Let's personalize your experience before you start.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={completeOnboarding} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="academicLevel">Academic Level / Year</Label>
              <Input id="academicLevel" name="academicLevel" required placeholder="e.g., 3rd Year College, Grade 12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue="Asia/Manila" required />
            </div>
            {message && <p className="text-sm text-red-500">{message}</p>}
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Complete Setup</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}