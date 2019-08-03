describe('grid', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })
  it('accepts input', () => {
    cy.get('.ag-row-first > .ag-cell-range-left')
      .click()
      .type('123')

    // cy.contains('.ag-root-wrapper')
  })
})
