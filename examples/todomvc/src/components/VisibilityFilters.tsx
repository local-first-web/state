import React, { MouseEventHandler } from 'react'
import cn from 'classnames'
import { useSelector, useDispatch } from 'react-redux'

import { setFilter } from '../redux/actions'
import { VisibilityFilter, VisibilityFilterKey } from '../types'

export const VisibilityFilters = () => {
  const activeFilter = useSelector((state: any) => state.visibilityFilter)
  const dispatch = useDispatch()

  return (
    <ul className="filters">
      {Object.keys(VisibilityFilter).map(filterKey => {
        const currentFilter = VisibilityFilter[filterKey as VisibilityFilterKey]

        const selected = currentFilter === activeFilter

        const onClick: MouseEventHandler = e => {
          e.preventDefault()
          dispatch(setFilter(currentFilter))
        }

        return (
          <li key={`visibility-filter-${currentFilter}`}>
            {/* linter doesn't like not having an href */}
            {/* eslint-disable-next-line */}
            <a
              className={cn({ selected })}
              onClick={onClick}
              style={{ cursor: 'pointer' }}
            >
              {currentFilter}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
