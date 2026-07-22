import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createDailyChecklist } from '../../services/supabase'
import type { ChecklistItemData } from '../../services/supabase'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormItem extends Omit<ChecklistItemData, 'id' | 'daily_checklist_id' | 'created_at'> {
  _temp_id: string
}

export function CreateChecklistForm({ isOpen, onClose, onSuccess }: Props) {
  const [checklistDate, setChecklistDate] = useState('')
  const [items, setItems] = useState<FormItem[]>([
    { _temp_id: '1', title: '', description: '', order_num: 1 },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddItem = () => {
    setItems([...items, { _temp_id: Date.now().toString(), title: '', description: '', order_num: items.length + 1 }])
  }

  const handleItemChange = (idx: number, field: string, value: any) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    setItems(updated)
  }

  const handleRemoveItem = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order_num: i + 1 }))
    setItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!checklistDate || items.some(i => !i.title)) {
      setError('Please fill in date and all item titles')
      return
    }

    setLoading(true)
    try {
      const cleanItems = items.map(({ _temp_id, ...item }) => item)

      const result = await createDailyChecklist(cleanItems, checklistDate)

      if (result) {
        setChecklistDate('')
        setItems([{ _temp_id: '1', title: '', description: '', order_num: 1 }])
        onSuccess?.()
        onClose()
      } else {
        setError('Failed to create checklist')
      }
    } catch (err) {
      console.error('Error creating checklist:', err)
      setError('Failed to create checklist')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Daily Checklist</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-200">
              Checklist Date *
            </label>
            <input
              type="date"
              value={checklistDate}
              onChange={(e) => setChecklistDate(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Checklist Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={item._temp_id} className="border border-slate-300 dark:border-slate-600 rounded p-3 mb-2 space-y-2">
                <input
                  type="text"
                  placeholder="Item title *"
                  value={item.title}
                  onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 font-semibold bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={item.description || ''}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  rows={2}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Remove Item
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-600">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold"
            >
              {loading ? 'Creating...' : 'Create Checklist'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
