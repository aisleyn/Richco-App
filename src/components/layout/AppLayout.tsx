import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  noPad?: boolean
}

export function AppLayout({ children, noPad }: Props) {
  return (
    <div className={`min-h-screen bg-bg-base text-slate-800 pb-20 ${noPad ? '' : 'px-4'} overflow-x-hidden`}>
      {children}
    </div>
  )
}
