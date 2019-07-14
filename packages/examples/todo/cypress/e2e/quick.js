// type definitions for Cypress object "cy"
/// <reference types="cypress" />

// type definitions for custom commands like "createDefaultTodos"
/// <reference types="../support" />

// check this file using TypeScript if available
// @ts-check

const user = cy
let TODO1 = 'buy some cheese'
let TODO2 = 'feed the cat'
let TODO3 = 'book a doctors appointment'

const NO_WAIT = { timeout: 10 }

// This test suite is designed to be quick and dirty, for use when actively developing.
// The tests ARE NOT INDEPENDENT. They're only broken into individual tests so that they're
// shown separately in the runner. They all need to be executed in the order provided; you
// can't use `.only` or `.skip`

describe('TodoMVC - React/Apollo - Quick', () => {
  before(() => {
    // the page is only loaded once
    user.visit('/')
  })
  it('loads correctly', () => {
    // check for heading
    user.get('h1').should('have.text', 'todos')
  })
  it("doesn't show main or footer when there are no tasks", () => {
    user
      .get('.main')
      .should('not.be.visible')
      .get('.footer')
      .should('not.be.visible')
  })
  it("won't add a blank task", () => {
    user
      .get('label', NO_WAIT)
      .should('not.exist')
      .addTask(' ')
      .get('label', NO_WAIT)
      .should('not.exist')
  })

  it('creates three tasks', () => {
    user
      .getByPlaceholderText('What needs to be done?')
      .click()
      .type(`${TODO1}{enter}`)
      .type(`${TODO2}{enter}`)
      .type(`${TODO3}{enter}`)
    // check for number of tasks
    user
      .get('label')
      .should('have.length', 3)
      .should(labels => {
        const labelText = labels.toArray().map(label => label.innerText)
        expect(labelText).to.deep.equal([TODO1, TODO2, TODO3])
      })
  })

  it('shows the correct number of tasks in the footer', () => {
    user
      .getByText('items left')
      .should('be.visible')
      .should('have.text', '3 items left')
  })

  it('marks a task complete', () => {
    user
      .getByText(TODO2)
      .siblings('input')
      .check()

    // check that second task is marked complete
    user
      .getByText(TODO2)
      .should('have.css', 'text-decoration')
      .should('match', /line-through/)

    // check task count label
    user
      .getByText('items left')
      .should('be.visible')
      .should('have.text', '2 items left')
  })

  it('filters to active tasks', () => {
    user
      .getByText('Active')
      .click()
      .get('label')
      .should('have.length', 2)
  })

  it('deletes a task', () => {
    user
      .getByText(TODO3)
      .siblings('button.destroy')
      .invoke('show')
      .click()
      .get('label')
      .should('have.length', 1)
      .should('have.text', TODO1)
  })

  it('filters to completed tasks', () => {
    user
      .getByText('Completed')
      .click()
      .get('label')
      .should('have.length', 1)
      .should('have.text', TODO2)
  })

  it('clears completed tasks', () => {
    user
      .getByText('Clear completed')
      .click()
      .get('label')
      .should('have.length', 0)
  })

  it('shows all tasks', () => {
    user
      .getByText('All')
      .click()
      .get('label')
      .should('have.length', 1)
  })

  it("doesn't show clear completed button when there are no completed tasks", () => {
    user
      .queryByText('Clear completed', NO_WAIT) //
      .should('not.exist')
  })

  it('persists its data', function() {
    function testState() {
      user.get('label').should('have.length', 2)
      user
        .get('li:eq(0)')
        .should('contain', TODO1)
        .and('not.have.class', 'completed')
      user
        .get('li:eq(1)')
        .should('contain', TODO2)
        .and('have.class', 'completed')
    }

    // add a task and mark it done
    user
      .createTodo(TODO2)
      .find('.toggle')
      .check()

    // check state before reloading
    user
      .then(testState) //
      .wait(1000) // need to give storage time to get past debounce

    // reload and check state again
    user.reload().then(testState)
  })

  it('supports editing', () => {
    user
      .get('label:eq(0)')
      .as('tasklabel')
      .dblclick()
      .parent()
      .find('.toggle')
      .should('not.be.visible')

    user
      .get('@tasklabel') //
      .should('not.be.visible')

    user
      .get('.edit:visible')
      .clear()
      .type('buy some sausages')
      .blur()

    user
      .get('@tasklabel')
      .should('contain', 'buy some sausages')
      .get('label:eq(1)')
      .should('contain', TODO2)
  })

  it('trims entered text', function() {
    user
      .get('label:eq(1)')
      .parent()
      .as('secondTodo')
      .find('label')
      .dblclick()
    user
      .get('.edit:visible')
      .clear()
      .type('    go home    ')
      .type('{enter}')
    user
      .get('label:eq(0)')
      .should('contain', 'buy some sausages')
      .get('label:eq(1)')
      .should('contain', 'go home')
  })

  it('removes the item if an empty text string was entered', function() {
    user
      .get('label:eq(0)')
      .parent()
      .find('label')
      .dblclick()
    user
      .get('.edit:visible')
      .clear()
      .type(' ')
      .type('{enter}')
    user.get('label:eq(0)').should('contain', 'go home')
    user.get('label').should('have.length', 1)
  })

  it('cancels edits on escape', function() {
    user
      .get('label:eq(0)')
      .parent()
      .find('label')
      .dblclick()
    user
      .get('.edit:visible')
      .clear()
      .type('foo{esc}')
    user.get('label:eq(0)').should('contain', 'go home')
  })

  it('cleans up', function() {
    user
      .getByText('Clear completed')
      .click()
      .get('label')
      .should('have.length', 0)
  })
})
