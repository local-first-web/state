import { codes } from 'keycode'

const keycode = name => ({ keyCode: codes[name], which: codes[name] })

describe('grid', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })

  describe('on first load', () => {
    it('accepts input', () => {
      cy.get('.ag-cell:first')
        .click()
        .trigger('keydown', keycode('f2'))
        .get('.ag-cell-focus input')
        .type('qrs')
        .type('{enter}')
      cy.get('.ag-cell:first').should('contain.text', 'qrs')
    })

    it('expands to the right', () => {
      cy.get('.ag-header-cell').should('have.length', 3)

      cy.get('.ag-cell:first')
        .type('{rightarrow}')
        .get('.ag-cell-focus')
        .type('{rightarrow}')
        .get('.ag-cell-focus')
        .type('{rightarrow}')

      cy.get('.ag-header-cell').should('have.length', 4)
    })

    it('expands downwards', () => {
      cy.get('.ag-center-cols-viewport .ag-row').should('have.length', 3)

      cy.get('.ag-cell:first')
        .type('{downarrow}')
        .get('.ag-cell-focus')
        .type('{downarrow}')
        .get('.ag-cell-focus')
        .type('{downarrow}')

      cy.get('.ag-center-cols-viewport .ag-row').should('have.length', 4)
    })
  })

  describe.only('after creating store', () => {
    beforeEach(() => {
      cy.queryByText('New').click()
    })

    it('accepts input', () => {
      cy.get('.ag-cell:first')
        .click()
        .trigger('keydown', keycode('f2'))
        .get('.ag-cell-focus input')
        .type('qrs')
        .type('{enter}')
      cy.get('.ag-cell:first').should('contain.text', 'qrs')
    })
  })
})
//
