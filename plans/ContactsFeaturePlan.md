This is the plan for the CMS feature.

TDD: Write tests first, then implement the feature to make the tests pass.

1. Create a new table in the database to store contacts.
2. Create a new route in the server to handle requests for the contacts page. This route will only be accessible to authenticated users of level 2 and above.
3. Create a new Pug template for the contacts page.
4. Implement the logic in the route to fetch contacts from the database and render the contacts page with the fetched data.
5. Add functionality to allow users to add new contacts through a form on the contacts page.
6. Implement validation for the contact form to ensure that all required fields are filled out correctly.
7. Add functionality to allow users to edit existing contacts.