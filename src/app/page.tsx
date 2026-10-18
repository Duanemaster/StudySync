import { redirect } from 'next/navigation'

export default function Home() {
  // Awtomatikong dadalhin ang user sa dashboard
  // Kung hindi pa naka-login, sasaluhin ito ng middleware at dadalhin sa /login
  redirect('/dashboard')
}