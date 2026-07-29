import { useEffect, useState } from 'react'
import {
  defaultMeasurementTools,
  parseMeasurementTools,
  toggleMeasurementTool,
  type MeasurementTool,
} from '../services/measurementEngine'

const MEASUREMENT_TOOLS_STORAGE_KEY =
  'today-table.measurement-tools.v1'
const MEASUREMENT_TOOLS_CHANGE_EVENT =
  'today-table:measurement-tools-changed'

function readMeasurementTools() {
  const stored = window.localStorage.getItem(
    MEASUREMENT_TOOLS_STORAGE_KEY,
  )

  if (!stored) {
    return [...defaultMeasurementTools]
  }

  try {
    return parseMeasurementTools(JSON.parse(stored))
  } catch {
    return [...defaultMeasurementTools]
  }
}

function useMeasurementPreferences() {
  const [selectedTools, setSelectedTools] =
    useState<MeasurementTool[]>(
      readMeasurementTools,
    )

  useEffect(() => {
    function reloadTools() {
      setSelectedTools(readMeasurementTools())
    }

    window.addEventListener(
      'storage',
      reloadTools,
    )
    window.addEventListener(
      MEASUREMENT_TOOLS_CHANGE_EVENT,
      reloadTools,
    )

    return () => {
      window.removeEventListener(
        'storage',
        reloadTools,
      )
      window.removeEventListener(
        MEASUREMENT_TOOLS_CHANGE_EVENT,
        reloadTools,
      )
    }
  }, [])

  function saveTools(tools: MeasurementTool[]) {
    const nextTools = parseMeasurementTools(tools)

    window.localStorage.setItem(
      MEASUREMENT_TOOLS_STORAGE_KEY,
      JSON.stringify(nextTools),
    )
    setSelectedTools(nextTools)
    window.dispatchEvent(
      new Event(MEASUREMENT_TOOLS_CHANGE_EVENT),
    )
  }

  function toggleTool(tool: MeasurementTool) {
    saveTools(
      toggleMeasurementTool(selectedTools, tool),
    )
  }

  return {
    selectedTools,
    saveTools,
    toggleTool,
  }
}

export default useMeasurementPreferences
