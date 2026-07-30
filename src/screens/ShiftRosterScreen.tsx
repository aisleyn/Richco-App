import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ShiftRosterTable } from '../components/shifts/ShiftRosterTable'
import { useAppStore } from '../store/appStore'
import { isUserAdmin } from '../services/crew'
import { getShiftRosterRows, getShiftRosterColumns, getProjects, type Project } from '../services/supabase'
import type { ShiftRosterRow, ShiftRosterColumn } from '../services/supabase'

interface ProjectWithShifts {
  id: string
  name: string
  client?: string
  rows: ShiftRosterRow[]
  columns: ShiftRosterColumn[]
}

export function ShiftRosterScreen() {
  const { currentUserEmail } = useAppStore()
  const [projects, setProjects] = useState<ProjectWithShifts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadData() {
      const admin = await isUserAdmin(currentUserEmail)
      setIsAdmin(admin)

      // Fetch projects from Supabase
      const fetchedProjects = await getProjects('active')

      const projectsWithShifts: ProjectWithShifts[] = fetchedProjects.map(p => ({
        id: p.id,
        name: p.name,
        client: p.client,
        rows: [],
        columns: [],
      }))

      // Fetch shifts and columns for each project
      for (const project of projectsWithShifts) {
        const rows = await getShiftRosterRows(project.id)
        const columns = await getShiftRosterColumns(project.id)

        // Use default columns if none exist
        if (columns.length === 0) {
          project.columns = [
            { project_id: project.id, column_name: 'Employee', column_type: 'text', order: 0 },
            { project_id: project.id, column_name: 'Date', column_type: 'date', order: 1 },
            { project_id: project.id, column_name: 'Start Time', column_type: 'text', order: 2 },
            { project_id: project.id, column_name: 'End Time', column_type: 'text', order: 3 },
          ]
        } else {
          project.columns = columns
        }

        project.rows = rows
      }

      setProjects(projectsWithShifts)
      setExpandedProjects(new Set(projectsWithShifts.map(p => p.id)))
      setIsLoading(false)
    }

    loadData()
  }, [currentUserEmail])

  function toggleProject(projectId: string) {
    const updated = new Set(expandedProjects)
    if (updated.has(projectId)) {
      updated.delete(projectId)
    } else {
      updated.add(projectId)
    }
    setExpandedProjects(updated)
  }

  return (
    <AppLayout>
      <div className="pt-6 pb-2">
        <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold">Shift Roster</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Next 30 days · View and manage shifts</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Loading shift rosters...</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-slate-400">No projects found</div>
      ) : (
        <div className="space-y-4 mt-6 pb-8">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-surface dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md"
            >
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-slate-900 dark:text-slate-100 font-semibold">{project.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{project.rows.length} shifts scheduled</p>
                </div>
                {expandedProjects.has(project.id) ? (
                  <ChevronUp size={20} className="text-slate-400" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400" />
                )}
              </button>

              {expandedProjects.has(project.id) && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                  <ShiftRosterTable
                    projectId={project.id}
                    projectName={project.name}
                    isAdmin={isAdmin}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
