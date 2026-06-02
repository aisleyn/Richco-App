import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  noPad?: boolean
}

export function AppLayout({ children, noPad }: Props) {
  return (
    <div className="min-h-screen w-full bg-bg-base dark:bg-bg-base-dark text-slate-800 dark:text-slate-100">
      <div className={`mx-auto max-w-6xl pb-20 md:pb-0 ${noPad ? '' : 'px-4 md:px-6'} overflow-x-hidden`}>
        {children}
      </div>
    </div>
  )
}
