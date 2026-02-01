We follow the MIT/Stanford style of design.

The essence of this style can be captured by the phrase ``the right thing.'' To such a designer it is important to get all of the following characteristics right:

* Simplicity-the design must be simple, both in implementation and interface. It is more important for the interface to be simple than the implementation.
* Correctness-the design must be correct in all observable aspects. Incorrectness is simply not allowed.
* Consistency-the design must not be inconsistent. A design is allowed to be slightly less simple and less complete to avoid inconsistency. Consistency is as important as correctness.
* Completeness-the design must cover as many important situations as is practical. All reasonably expected cases must be covered. Simplicity is not allowed to overly reduce completeness.

Our architectural choices are made to follow these principles.

Clean Hexagonal Architecture, isolates core business logic (the hexagon) from external concerns (databases, UIs, APIs) to create highly maintainable, testable systems.

We follow SOLID principles to ensure our code is modular, flexible, and easy to maintain.

Class-based object-oriented programming (OOP) is used to encapsulate data and behavior, promoting code reuse and organization.

Naming conventions:
No abbreviations or shortened words. Everything must be fully spelled out.
No one letter names, this includes loop counters.
Descriptive names for variables, functions, classes, and modules that clearly convey their purpose.
Consistent casing style (e.g., camelCase for variables and functions, PascalCase for classes).
Avoid using reserved keywords or names that may cause confusion.

Dependency Management:
All external libraries and frameworks must be versioned deterministically using a lock file (e.g., package-lock.json for npm).
All versions numbers must be explicitly specified, avoiding the use of wildcards.