import { codes } from 'keycode'

const keycode = name => ({ keyCode: codes[name], which: codes[name] })

describe('grid', () => {
  beforeEach(() => cy.visit('/'))

  describe('on first load', () => {
    // enter some text in the first cell, then hit enter
    it('accepts input', () => {
      cy.firstCell()
        .typeInCell('qrs')
        .enter()

      // confirm that the text is in the cell
      cy.firstCell().should('contain.text', 'qrs')
    })

    it('expands to the right', () => {
      // confirm that we start with 3 columns
      cy.columns().should('have.length', 3)

      // start in first cell, hit right arrow 3 times
      cy.firstCell()
        .right()
        .right()
        .right()

      // confirm that we now have 4 columns
      cy.columns().should('have.length', 4)
    })

    it('expands downwards', () => {
      // confirm that we start with 3 rows
      cy.rows().should('have.length', 3)

      // start in first cell, hit down arrow 3 times
      cy.firstCell()
        .down()
        .down()
        .down()

      // confirm that we now have 4 cells
      cy.rows().should('have.length', 4)
    })

    it('allows selecting cells', () => {
      cy.selectedCells().should('have.length', 0)

      // start in first cell, hit shift-down twice
      cy.firstCell()
        .shiftDown()
        .shiftDown()

      // confirm number of selected cells
      cy.selectedCells().should('have.length', 3)
    })

    it('allows deleting rows', () => {
      // confirm number of rows
      cy.rows().should('have.length', 3)

      // select two rows
      cy.firstCell().shiftDown()

      cy.focusedCell().trigger('contextmenu')

      cy.get('.ag-menu')
        .queryByText('Delete 2 rows')
        .click()

      // confirm only one row left
      cy.rows().should('have.length', 1)
    })
  })

  describe('after creating store', () => {
    beforeEach(() => {
      // create a new document
      cy.clickNew()
    })

    it('accepts input', () => {
      // enter some text in the first cell, then hit enter
      cy.firstCell()
        .typeInCell('qrs')
        .enter()

      // confirm that the text is in the cell
      cy.firstCell().should('contain.text', 'qrs')
    })
  })
})
