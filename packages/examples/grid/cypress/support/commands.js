import '@testing-library/cypress/add-commands'
import { codes } from 'keycode'

const keycode = name => ({ keyCode: codes[name], which: codes[name] })

const child = { prevSubject: true }
Cypress.Commands.add('firstCell', () => cy.get('.ag-cell:first').click())
Cypress.Commands.add('columns', () => cy.get('.ag-header-cell'))
Cypress.Commands.add('rows', () => cy.get('.ag-center-cols-viewport .ag-row'))

Cypress.Commands.add(
  'clickNew',
  () =>
    cy
      .queryByText('New')
      .click()
      .wait(500) // give page time to reload
)

Cypress.Commands.add('edit', () =>
  cy
    .get('.ag-cell-focus')
    .trigger('keydown', keycode('f2'))
    .get('.ag-cell-focus input')
)

Cypress.Commands.add('up', () => cy.get('.ag-cell-focus').type('{uparrow}'))
Cypress.Commands.add('right', () => cy.get('.ag-cell-focus').type('{rightarrow}'))
Cypress.Commands.add('down', () => cy.get('.ag-cell-focus').type('{downarrow}'))
Cypress.Commands.add('left', () => cy.get('.ag-cell-focus').type('{leftarrow}'))
