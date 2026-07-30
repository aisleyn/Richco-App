import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  noPad?: boolean
}

export function AppLayout({ children, noPad }: Props) {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-white text-slate-800 dark:text-slate-800">
      <div className={`mx-auto pb-20 md:pb-0 md:ml-80 md:mr-80 ${noPad ? '' : 'px-4 md:px-6'} overflow-x-hidden`}>
        {children}
      </div>
    </div>
  )
}
