# AutomationExercise — Product Search and Cart Test Plan

## Application Overview

Functional coverage for product discovery and cart on https://www.automationexercise.com/.
Covers searching by name, case-insensitive matching, viewing product details, adding to
the cart, and verifying cart contents. Checkout and user registration are out of scope.

## Conventions

- All tests live in a single spec: `tests/product-search-cart.spec.ts`.
- Search term and no-match term come from a shared test data constant, not inline literals.
- Assert relationships (price carried from details to cart, total = unit price x quantity),
  not catalog values that can change.
- Prefer role-based locators. No fixed timeouts.

## Test Scenarios

### 1. Product Search and Cart

**Seed:** `tests/seed.spec.ts`
**File:** `tests/product-search-cart.spec.ts`

#### 1.1. Search for a product by name

**Steps:**
  1. Navigate to the home page and open the Products page.
     - expect: The Products page loads with the search textbox visible.
  2. Search for the configured product name.
     - expect: The URL contains the submitted search query.
     - expect: The Searched Products heading is displayed.
     - expect: A product card matching the search term is displayed.

#### 1.2. Search is case-insensitive and matches partial names

Data-driven: run the same assertions for each search variant
(exact name, uppercase, lowercase, first word only).

**Steps:**
  1. Open the Products page and search using the variant.
     - expect: The target product is present in the results.

#### 1.3. Search with no matching product

**Steps:**
  1. Open the Products page and search for the configured no-match term.
     - expect: The URL contains the submitted search query.
     - expect: No product card is displayed in the results.

#### 1.4. View product details from a search result

**Steps:**
  1. Search for the product and select View Product on the matching result.
     - expect: The URL matches a product details path with a numeric id.
     - expect: The product name on the details page equals the searched name.
  2. Inspect the product information block.
     - expect: Category, availability, condition and brand fields are present and non-empty.
     - expect: The price is displayed and non-empty.
     - expect: The quantity control is present and defaults to 1.
     - expect: The Add to cart button is visible.

#### 1.5. Add a product to the cart and verify contents

**Steps:**
  1. Open the product details page and capture the displayed price.
  2. Add to cart with the default quantity.
     - expect: The added-to-cart confirmation is displayed.
     - expect: A View Cart link is available in the confirmation.
  3. Open the cart from the confirmation.
     - expect: The cart page is displayed with a table of cart rows.
  4. Inspect the cart row for the added product.
     - expect: Exactly one row matches the product name.
     - expect: The unit price equals the price captured on the details page.
     - expect: The quantity is 1.
     - expect: The line total equals unit price multiplied by quantity.

#### 1.6. Add the same product twice

**Steps:**
  1. Add the product to the cart, continue shopping, and add the same product again.
  2. Open the cart.
     - expect: Exactly one row matches the product name.
     - expect: The quantity reflects both additions.
     - expect: The line total equals unit price multiplied by the displayed quantity.