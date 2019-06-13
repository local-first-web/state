import React, { MouseEventHandler, useContext } from 'react'
import cx from 'classnames'
import { actions } from '../actions'
import { VisibilityFilter, VisibilityFilterKey } from '../types'
import { StoreContext } from 'src/context'

export const VisibilityFilters = () => {
  const { state, dispatch } = useContext(StoreContext)

  const activeFilter = state.visibilityFilter

  return (
    <ul className="filters">
      {Object.keys(VisibilityFilter).map(filterKey => {
        const currentFilter = VisibilityFilter[filterKey as VisibilityFilterKey]

        const selected = currentFilter === activeFilter

        const onClick: MouseEventHandler = e => {
          e.preventDefault()
          dispatch!(actions.setFilter(currentFilter))
        }

        return (
          <li key={`visibility-filter-${currentFilter}`}>
            {/* linter doesn't like not having an href */}
            {/* eslint-disable-next-line */}
            <a
              className={cx({ selected })}
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
