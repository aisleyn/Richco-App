import { useState, useEffect } from 'react'
import { Plus, Trash2, Settings } from 'lucide-react'
import {
  getShiftRosterRows,
  getShiftRosterColumns,
  createShiftRosterRow,
  updateShiftRosterRow,
  deleteShiftRosterRow,
  createShiftRosterColumn,
  deleteShiftRosterColumn,
  type ShiftRosterRow,
  type ShiftRosterColumn,
} from '../../services/supabase'

interface Props {
  projectId: string
  projectName: string
  isAdmin: boolean
}

export function ShiftRosterTable({ projectId, projectName, isAdmin }: Props) {
  const [rows, setRows] = useState<ShiftRosterRow[]>([])
  const [columns, setColumns] = useState<ShiftRosterColumn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnName: string } | null>(null)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'date' | 'select'>('text')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [fetchedRows, fetchedColumns] = await Promise.all([
        getShiftRosterRows(projectId),
        getShiftRosterColumns(projectId),
      ])

      const defaultColumns: ShiftRosterColumn[] = [
        { project_id: projectId, column_name: 'Employee', column_type: 'text', order: 0 },
        { project_id: projectId, column_name: 'Date', column_type: 'date', order: 1 },
        { project_id: projectId, column_name: 'Start Time', column_type: 'text', order: 2 },
        { project_id: projectId, column_name: 'End Time', column_type: 'text', order: 3 },
      ]

      setRows(fetchedRows)
      setColumns(fetchedColumns.length > 0 ? fetchedColumns : defaultColumns)
      setIsLoading(false)
    }
    load()
  }, [projectId])

  async function handleAddRow() {
    const newRow: Omit<ShiftRosterRow, 'id' | 'created_at' | 'updated_at'> = {
      project_id: projectId,
      shift_type: 'day',
      custom_data: {},
    }
    const created = await createShiftRosterRow(newRow)
    if (created) {
      setRows([...rows, created])
    }
  }

  async function handleDeleteRow(rowId: string) {
    await deleteShiftRosterRow(rowId)
    setRows(rows.filter(r => r.id !== rowId))
  }

  async function handleCellChange(rowId: string, columnName: string, value: any) {
    const row = rows.find(r => r.id === rowId)
    if (!row) return

    const updated: Partial<ShiftRosterRow> = {
      custom_data: {
        ...row.custom_data,
        [columnName]: value,
      },
    }

    const success = await updateShiftRosterRow(rowId, updated)
    if (success) {
      setRows(rows.map(r =>
        r.id === rowId ? { ...r, custom_data: { ...r.custom_data, [columnName]: value } } : r
      ))
      setEditingCell(null)
    }
  }

  async function handleShiftTypeChange(rowId: string, shiftType: 'day' | 'night') {
    const success = await updateShiftRosterRow(rowId, { shift_type: shiftType })
    if (success) {
      setRows(rows.map(r => (r.id === rowId ? { ...r, shift_type: shiftType } : r)))
    }
  }

  async function handleGeolocationChange(rowId: string) {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const geolocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
          const success = await updateShiftRosterRow(rowId, { geolocation })
          if (success) {
            setRows(rows.map(r => (r.id === rowId ? { ...r, geolocation } : r)))
          }
        },
        (error) => console.error('Geolocation error:', error)
      )
    }
  }

  async function handleCommentsChange(rowId: string, comments: string) {
    const success = await updateShiftRosterRow(rowId, { comments })
    if (success) {
      setRows(rows.map(r => (r.id === rowId ? { ...r, comments } : r)))
    }
  }

  async function handleAddColumn() {
    if (!newColumnName.trim()) return

    const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order || 0)) : 0
    const newColumn: Omit<ShiftRosterColumn, 'id' | 'created_at'> = {
      project_id: projectId,
      column_name: newColumnName,
      column_type: newColumnType,
      order: maxOrder + 1,
    }

    const created = await createShiftRosterColumn(newColumn)
    if (created) {
      setColumns([...columns, created])
      setNewColumnName('')
      setShowAddColumn(false)
    }
  }

  async function handleDeleteColumn(columnId: string) {
    await deleteShiftRosterColumn(columnId)
    setColumns(columns.filter(c => c.id !== columnId))
  }

  if (isLoading) {
    return <div className="text-slate-400 text-center py-8">Loading shifts...</div>
  }

  const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0))

  return (
    <div className="space-y-4">
      {/* Shift rows */}
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-slate-400 text-center py-8">No shifts yet</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="bg-bg-elevated dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4"
            >
              {/* Row header with shift type and delete */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <select
                    value={row.shift_type}
                    onChange={(e) => handleShiftTypeChange(row.id!, e.target.value as 'day' | 'night')}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="day">Day Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                  <button
                    onClick={() => setExpandedRow(row.id && expandedRow === row.id ? null : row.id || null)}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {expandedRow === row.id ? 'Hide details' : 'Show details'}
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteRow(row.id!)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete shift"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Main grid - Always visible columns */}
              <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(sortedColumns.length, 4)}, 1fr)` }}>
                {sortedColumns.slice(0, 4).map((col) => (
                  <div key={col.id}>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      {col.column_name}
                    </label>
                    {editingCell?.rowId === row.id && editingCell?.columnName === col.column_name ? (
                      <input
                        autoFocus
                        type={col.column_type === 'date' ? 'date' : 'text'}
                        value={row.custom_data?.[col.column_name] || ''}
                        onChange={(e) => handleCellChange(row.id!, col.column_name, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-white"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingCell({ rowId: row.id!, columnName: col.column_name })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-white text-left hover:bg-slate-100 dark:hover:bg-slate-550 transition-colors"
                      >
                        {row.custom_data?.[col.column_name] || '—'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Expanded details */}
              {expandedRow === row.id && (
                <div className="border-t border-slate-200 dark:border-slate-600 pt-4 space-y-4">
                  {/* Additional columns */}
                  {sortedColumns.length > 4 && (
                    <div className="grid gap-3 grid-cols-2">
                      {sortedColumns.slice(4).map((col) => (
                        <div key={col.id}>
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                            {col.column_name}
                          </label>
                          {editingCell?.rowId === row.id && editingCell?.columnName === col.column_name ? (
                            <input
                              autoFocus
                              type={col.column_type === 'date' ? 'date' : 'text'}
                              value={row.custom_data?.[col.column_name] || ''}
                              onChange={(e) => handleCellChange(row.id!, col.column_name, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-white"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingCell({ rowId: row.id!, columnName: col.column_name })}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-white text-left hover:bg-slate-100 dark:hover:bg-slate-550 transition-colors"
                            >
                              {row.custom_data?.[col.column_name] || '—'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Geolocation */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">Geolocation</label>
                    <button
                      onClick={() => handleGeolocationChange(row.id!)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-550 transition-colors"
                    >
                      {row.geolocation ? `Lat: ${row.geolocation.latitude.toFixed(4)}, Lng: ${row.geolocation.longitude.toFixed(4)}` : 'Capture Location'}
                    </button>
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">Comments</label>
                    <textarea
                      value={row.comments || ''}
                      onChange={(e) => handleCommentsChange(row.id!, e.target.value)}
                      placeholder="Add shift notes or comments..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-white resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add row button */}
      <button
        onClick={handleAddRow}
        className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:border-slate-400 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Add Shift
      </button>

      {/* Column management (admin only) */}
      {isAdmin && (
        <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings size={16} />
              Manage Columns
            </h3>
          </div>

          {showAddColumn ? (
            <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg space-y-3 mb-4">
              <input
                autoFocus
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name (e.g., 'Supervisor', 'Zone', 'Tasks')"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-white"
              />
              <select
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select / Dropdown</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  className="flex-1 px-3 py-2 bg-brand-green text-slate-900 font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
                >
                  Create Column
                </button>
                <button
                  onClick={() => {
                    setShowAddColumn(false)
                    setNewColumnName('')
                  }}
                  className="flex-1 px-3 py-2 bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-550 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="w-full py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Custom Column
            </button>
          )}

          {/* Existing columns list */}
          <div className="space-y-2 mt-4">
            {sortedColumns.map((col) => (
              <div
                key={col.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 p-3 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{col.column_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{col.column_type}</p>
                </div>
                {!['Employee', 'Date', 'Start Time', 'End Time'].includes(col.column_name) && (
                  <button
                    onClick={() => handleDeleteColumn(col.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete column"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
