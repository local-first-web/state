describe('Todo: #56', () => {
  beforeEach(function() {
    cy.wait(100).visit('/')
  })

  // Test for http://github.com/local-first-web/state/issues/56

  it(`shouldn't crash following 'Clear completed'`, function() {
    // Create 2 todos
    cy.createTodo('a').as('A')
    cy.createTodo('b').as('B')

    // Check them both off
    cy.get('@A')
      .find('.toggle')
      .check()
    cy.get('@B')
      .find('.toggle')
      .check()

    // Clear completed
    cy.get('.clear-completed').click()

    // List should be empty
    cy.get('@A').should('not.exist')
    cy.get('@B').should('not.exist')

    // App should not be crashed
    cy.get('iframe').should('not.exist')

    // Reload
    cy.wait(1000)
      .reload()
      .wait(200)

    // List should still be empty
    cy.get('@A').should('not.exist')
    cy.get('@B').should('not.exist')

    // Add another todo
    cy.createTodo('c').as('C')

    cy.wait(1000)

    // App should not be crashed
    cy.get('iframe').should('not.exist')
  })
})
