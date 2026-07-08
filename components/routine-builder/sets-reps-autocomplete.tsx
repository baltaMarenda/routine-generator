"use client"

import { useState, useEffect, useRef } from 'react'

interface SetsRepsAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const SERIES = [1, 2, 3, 4]
const REPS = [4, 6, 8, 10, 12, 15]

// Generate all sets x reps combinations, e.g. 1x4, 1x6, ... 4x15
const SETS_REPS_OPTIONS: string[] = SERIES.flatMap(series =>
  REPS.map(reps => `${series}x${reps}`)
)

export function SetsRepsAutocomplete({
  value,
  onChange,
  placeholder = "3x12",
  className = ""
}: SetsRepsAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!isFocused) return
    if (value.length > 0) {
      const normalized = value.toLowerCase().replace(/\s/g, '')
      const filtered = SETS_REPS_OPTIONS.filter(opt =>
        opt.toLowerCase().startsWith(normalized)
      ).slice(0, 8)
      setSuggestions(filtered)
      setIsOpen(filtered.length > 0)
      setHighlightedIndex(0)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [value, isFocused])

  const handleSelect = (option: string) => {
    onChange(option)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative w-1/2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsFocused(true)
          if (value.length > 0 && suggestions.length > 0) setIsOpen(true)
        }}
        onBlur={() => setTimeout(() => { setIsFocused(false); setIsOpen(false) }, 150)}
        placeholder={placeholder}
        className={className}
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-max min-w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-72 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === highlightedIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
