import '@testing-library/cypress/add-commands'
import { codes } from 'keycode'

const keycode = name => ({ keyCode: codes[name], which: codes[name] })

Cypress.Commands.add('firstCell', () => cy.get('.ag-cell:first').click())
Cypress.Commands.add('focusedCell', () => cy.get('.ag-cell-focus'))
Cypress.Commands.add('cell', (x, y) => cy.get(`.ag-row[row-id=${y}] .ag-cell[col-id=${x}]`).click())

Cypress.Commands.add('columns', () => cy.get('.ag-header-cell'))
Cypress.Commands.add('rows', () => cy.get('.ag-center-cols-viewport .ag-row'))
Cypress.Commands.add('selectedCells', () => cy.get('.ag-cell-range-selected'))

Cypress.Commands.add(
  'clickNew',
  () =>
    cy
      .queryByText('New')
      .click()
      .wait(500) // give page time to reload
)

Cypress.Commands.add('typeInCell', text => {
  let subject = cy
    .get('.ag-cell-focus')
    .trigger('keydown', keycode('f2'))
    .get('.ag-cell-focus input')
  if (text) subject = subject.type(text)
  return subject
})

// Cypress can't simulate copy/paste
// https://github.com/cypress-io/cypress/issues/2851

// Cypress.Commands.add('copy', text => cy.focusedCell().type('{ctrl}c'))
// Cypress.Commands.add('paste', text => cy.focusedCell().type('{ctrl}v'))

Cypress.Commands.add('enter', text => cy.focusedCell().type('{enter}'))

Cypress.Commands.add('up', () => cy.focusedCell().type('{uparrow}'))
Cypress.Commands.add('right', () => cy.focusedCell().type('{rightarrow}'))
Cypress.Commands.add('down', () => cy.focusedCell().type('{downarrow}'))
Cypress.Commands.add('left', () => cy.focusedCell().type('{leftarrow}'))

Cypress.Commands.add('shiftUp', () => cy.focusedCell().type('{shift}{uparrow}'))
Cypress.Commands.add('shiftRight', () => cy.focusedCell().type('{shift}{rightarrow}'))
Cypress.Commands.add('shiftDown', () => cy.focusedCell().type('{shift}{downarrow}'))
Cypress.Commands.add('shiftLeft', () => cy.focusedCell().type('{shift}{leftarrow}'))
