import { getProjects, type Project } from './supabase'
import { jobSites } from '../data/mockData'

let projectCache: Project[] = []
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getProjectIdFromLocation(siteId: string): Promise<{ projectId?: string; projectName?: string }> {
  try {
    // Find site by ID
    const site = jobSites.find(s => s.id === siteId)
    if (!site) return {}

    // Load projects (with caching)
    const now = Date.now()
    if (!projectCache.length || now - cacheTime > CACHE_DURATION) {
      projectCache = await getProjects('active')
      cacheTime = now
    }

    // Match site location to project by name similarity or location field
    // Priority: location name contains site name, or project location matches site
    const siteName = site.name.toLowerCase()
    const matched = projectCache.find(p => {
      const projName = (p.name || '').toLowerCase()
      const projLocation = (p.location || '').toLowerCase()

      // Exact location match
      if (projLocation === siteName) return true
      // Project name contains site location (e.g., "Camp J" in "Camp J - Zone 1")
      if (siteName.includes(projName) || projName.includes(siteName.split('-')[0].trim())) return true
      return false
    })

    return {
      projectId: matched?.id,
      projectName: matched?.name,
    }
  } catch (err) {
    console.error('[ProjectMap] Failed to get project for location:', err)
    return {}
  }
}

export function clearProjectCache(): void {
  projectCache = []
  cacheTime = 0
}
