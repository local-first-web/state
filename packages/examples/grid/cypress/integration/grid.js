import { codes } from 'keycode'

const keycode = name => ({ keyCode: codes[name], which: codes[name] })

describe('grid', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('.ag-cell:first').as('firstCell')
    cy.get('.ag-center-cols-viewport .ag-row').as('rows')
    cy.get('.ag-header-cell').as('cols')
    cy.queryByText('New').as('newButton')
    cy.queryByText('Join').as('joinButton')
  })

  describe('on first load', () => {
    it('accepts input', () => {
      cy.get('@firstCell')
        .click()
        .trigger('keydown', keycode('f2'))
        .get('.ag-cell-focus input')
        .type('qrs')
        .type('{enter}')
      cy.get('@firstCell').should('contain.text', 'qrs')
    })

    it('expands to the right', () => {
      // confirm that we start with 3 columns
      cy.get('@cols').should('have.length', 3)

      // start in first cell, hit right arrow three times
      cy.get('@firstCell').type('{rightarrow}')
      cy.get('.ag-cell-focus').type('{rightarrow}')
      cy.get('.ag-cell-focus').type('{rightarrow}')

      // confirm that we now have 4 columns
      cy.get('@cols').should('have.length', 4)
    })

    it('expands downwards', () => {
      // confirm that we start with 3 rows
      cy.get('@rows').should('have.length', 3)

      // start in first cell, hit down arrow three times
      cy.get('@firstCell').type('{downarrow}')
      cy.get('.ag-cell-focus').type('{downarrow}')
      cy.get('.ag-cell-focus').type('{downarrow}')

      // confirm that we now have four cells
      cy.get('@rows').should('have.length', 4)
    })
  })

  describe('after creating store', () => {
    beforeEach(() => {
      // create a new document
      cy.get('@newButton')
        .click()
        .wait(500) // give page time to reload
    })

    it('accepts input', () => {
      // enter some text in the first cell, then hit enter
      cy.get('@firstCell')
        .click()
        .trigger('keydown', keycode('f2'))
        .get('.ag-cell-focus input')
        .type('qrs')
        .type('{enter}')

      // check that the text is in the cell
      cy.get('@firstCell').should('contain.text', 'qrs')
    })
  })
})
//
