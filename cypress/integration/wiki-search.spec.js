
describe('aspecto wiki demo', () => {
    it('login', () => {
        cy.visit('http://localhost:3002');

        cy.get('#email').type('wikipedia-demo@aspecto.io');
        cy.get('#password').type('Aspecto123');
        cy.get('button').click();
    });
});
