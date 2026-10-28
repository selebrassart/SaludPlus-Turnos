"use client"

import { useState, type Dispatch, type SetStateAction } from "react"

/**
 * Holds local optimistic state that resets whenever the server sends a new
 * value (after `router.refresh()`), using React's documented "adjust state
 * during render" pattern instead of an effect.
 */
export function useServerState<T>(source: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(source)
  const [previousSource, setPreviousSource] = useState(source)

  if (previousSource !== source) {
    setPreviousSource(source)
    setValue(source)
  }

  return [value, setValue]
}
