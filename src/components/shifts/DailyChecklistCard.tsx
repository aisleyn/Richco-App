import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { getTodayChecklist, getChecklistItems, getCrewChecklistSubmissions, submitChecklistItem } from '../../services/supabase'
import type { DailyChecklistData, ChecklistItemData, ChecklistSubmissionData } from '../../services/supabase'

interface Props {
  crewMemberId: number
  isLoading?: boolean
}

export function DailyChecklistCard({ crewMemberId, isLoading = false }: Props) {
  const [checklist, setChecklist] = useState<DailyChecklistData | null>(null)
  const [items, setItems] = useState<ChecklistItemData[]>([])
  const [submissions, setSubmissions] = useState<ChecklistSubmissionData[]>([])
  const [expandedIncomplete, setExpandedIncomplete] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(isLoading)

  useEffect(() => {
    fetchChecklist()
  }, [])

  const fetchChecklist = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const checklistData = await getTodayChecklist()
      setChecklist(checklistData)

      if (checklistData?.id) {
        const [itemsData, submissionsData] = await Promise.all([
          getChecklistItems(checklistData.id),
          getCrewChecklistSubmissions(crewMemberId, today),
        ])
        setItems(itemsData)
        setSubmissions(submissionsData)
      }
    } catch (err) {
      console.error('Error fetching checklist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleItem = async (item: ChecklistItemData) => {
    if (!item.id) return

    const today = new Date().toISOString().split('T')[0]
    const existing = submissions.find(s => s.checklist_item_id === item.id)
    const newIsComplete = !existing?.is_complete

    // If marking incomplete, expand to show reason field
    if (!newIsComplete) {
      setExpandedIncomplete(item.id)
    } else {
      setExpandedIncomplete(null)
    }

    setSaving(item.id)
    try {
      const result = await submitChecklistItem({
        checklist_item_id: item.id,
        crew_member_id: crewMemberId,
        checklist_date: today,
        is_complete: newIsComplete,
        reason_text: existing?.reason_text,
      })

      if (result) {
        setSubmissions(prev => {
          const filtered = prev.filter(s => s.checklist_item_id !== item.id)
          return [...filtered, result]
        })
      }
    } catch (err) {
      console.error('Error toggling item:', err)
    } finally {
      setSaving(null)
    }
  }

  const handleReasonChange = (itemId: string, reason: string) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.checklist_item_id === itemId
          ? { ...s, reason_text: reason }
          : s
      )
    )
  }

  const handleReasonBlur = async (item: ChecklistItemData, reason: string | undefined) => {
    if (!item.id) return

    const today = new Date().toISOString().split('T')[0]
    setSaving(item.id)
    try {
      const result = await submitChecklistItem({
        checklist_item_id: item.id,
        crew_member_id: crewMemberId,
        checklist_date: today,
        is_complete: false,
        reason_text: reason || undefined,
      })

      if (result) {
        setSubmissions(prev => {
          const filtered = prev.filter(s => s.checklist_item_id !== item.id)
          return [...filtered, result]
        })
      }
    } catch (err) {
      console.error('Error saving reason:', err)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="card p-4 text-muted">Loading checklist...</div>

  if (!checklist || !items || items.length === 0) {
    return null
  }

  const itemsSorted = [...items].sort((a, b) => a.order_num - b.order_num)
  const completedCount = submissions.filter(s => s.is_complete).length

  return (
    <div className="card bg-gradient-to-br from-success-light to-success-light border border-success-lighter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-primary">Daily Checklist</h3>
          <p className="text-sm text-secondary mt-1">
            {completedCount} of {itemsSorted.length} complete
          </p>
        </div>
        <CheckCircle2 size={24} className="text-success-base" />
      </div>

      <div className="space-y-2">
        {itemsSorted.map(item => {
          const submission = submissions.find(s => s.checklist_item_id === item.id)
          const isComplete = submission?.is_complete ?? false
          const isExpanded = expandedIncomplete === item.id
          const isSaving = saving === item.id

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-3 transition-all ${
                isComplete
                  ? 'bg-success-light border-success-lighter'
                  : isExpanded
                    ? 'bg-error-light border-error-lighter'
                    : 'bg-surface border-border-light'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isComplete}
                  onChange={() => handleToggleItem(item)}
                  disabled={isSaving}
                  className="mt-1 w-5 h-5 cursor-pointer disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className={`font-semibold text-primary ${isComplete ? 'line-through text-muted' : ''}`}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-sm text-secondary mt-1">{item.description}</div>
                  )}

                  {/* Reason field for incomplete items */}
                  {isExpanded && !isComplete && (
                    <div className="mt-3 pt-3 border-t border-error-lighter">
                      <label className="text-sm font-semibold block mb-2 text-primary flex items-start gap-2">
                        <AlertCircle size={16} className="text-error-base mt-0.5 shrink-0" />
                        Reason for non-completion:
                      </label>
                      <textarea
                        className="w-full p-2 border border-error-lighter rounded text-sm bg-surface text-primary disabled:opacity-50"
                        placeholder="Enter reason..."
                        value={submission?.reason_text || ''}
                        onChange={(e) => item.id && handleReasonChange(item.id, e.target.value)}
                        onBlur={() => handleReasonBlur(item, submission?.reason_text)}
                        disabled={isSaving}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
