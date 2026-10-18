import Link from 'next/link'
import { BrainCircuit, Mail, Lock, User, AlertCircle, ArrowRight, GraduationCap } from 'lucide-react'
import { signup } from './actions' // Palitan ng { register } kung yun ang name ng action mo
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedParams = await searchParams;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-5 font-sans relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md relative z-10 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl mb-5 shadow-lg shadow-indigo-200">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Create an account</h1>
          <p className="text-slate-500 font-medium mt-2">Start organizing your study life today.</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          {resolvedParams?.error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{resolvedParams.error}</p>
            </div>
          )}

          <form action={signup} className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input 
                  name="displayName" 
                  type="text" 
                  placeholder="e.g., Duane" 
                  required 
                  className="pl-11 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Academic Level</label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input 
                  name="academicLevel" 
                  type="text" 
                  placeholder="e.g., College / Grade 12" 
                  required 
                  className="pl-11 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input 
                  name="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  required 
                  className="pl-11 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  minLength={6}
                  className="pl-11 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 group">
              Sign Up <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>
          
          <div className="mt-6 text-center pt-6 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
                Log in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}