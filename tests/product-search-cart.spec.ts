// spec: specs/product-search-cart-test-plan.md
// seed: tests/seed.spec.ts

import { expect } from '@playwright/test';
import { test } from './fixtures/test';
import { searchTerms } from './test-data/product-search';

test.describe('Product Search and Cart', () => {
  test('Search, inspect, and add a product to the cart', async ({ productSearch, productDetails, cart }) => {
    // 1. Navigate to the home page and open the Products page.
    await productSearch.open();
    await expect(productSearch.searchInput).toBeVisible();

    // 2. Search for the configured product name.
    await productSearch.searchFor(searchTerms.productName);
    await expect(productSearch.page).toHaveURL(new RegExp(`search=${encodeURIComponent(searchTerms.productName)}`));
    await expect(productSearch.searchedProductsHeading).toBeVisible();
    await expect(productSearch.productCard(searchTerms.productName)).toBeVisible();

    // 3. Open the Products page and search using each case and partial-name variant.
    for (const variant of searchTerms.variants) {
      await productSearch.open();
      await productSearch.searchFor(variant);
      await expect(productSearch.productCard(searchTerms.productName)).toBeVisible();
    }

    // 4. Search with no matching product.
    await productSearch.open();
    await productSearch.searchFor(searchTerms.noMatch);
    await expect(productSearch.page).toHaveURL(new RegExp(`search=${encodeURIComponent(searchTerms.noMatch)}`));
    await expect(productSearch.allProductCards).toHaveCount(0);

    // 5. Search for the product and select View Product on the matching result.
    await productSearch.searchFor(searchTerms.productName);
    await productSearch.openProduct(searchTerms.productName);
    await expect(productDetails.page).toHaveURL(/\/product_details\/\d+$/);
    await expect(productDetails.productName(searchTerms.productName)).toHaveText(searchTerms.productName);

    // 6. Inspect the product information block.
    await expect(productDetails.category).toContainText(/\S+/);
    await expect(productDetails.availability).toContainText(/\S+/);
    await expect(productDetails.condition).toContainText(/\S+/);
    await expect(productDetails.brand).toContainText(/\S+/);
    await expect(productDetails.price).toContainText(/\S+/);
    await expect(productDetails.quantity).toHaveValue('1');
    await expect(productDetails.addToCartButton).toBeVisible();

    // 7. Capture the displayed price and add the product with the default quantity.
    const capturedPrice = await productDetails.priceValue();
    await productDetails.addToCart();
    await expect(productDetails.addedConfirmation).toBeVisible();
    await expect(productDetails.viewCartLink).toBeVisible();
    await productDetails.openCart();

    // 8. Inspect the cart row for the added product.
    const cartRow = cart.rowFor(searchTerms.productName);
    await expect(cart.table).toBeVisible();
    await expect(cart.rowsFor(searchTerms.productName)).toHaveCount(1);
    const unit = await cart.unitPriceValue(cartRow);
    const qty = await cart.quantityValue(cartRow);
    expect(unit).toBe(capturedPrice);
    expect(qty).toBe(1);
    expect(await cart.lineTotalValue(cartRow)).toBe(unit * qty);

    // 9. Add the same product again, continue shopping, and open the cart.
    await productSearch.open();
    await productSearch.searchFor(searchTerms.productName);
    await productSearch.openProduct(searchTerms.productName);
    await productDetails.addToCart();
    await productDetails.continueShopping();
    await productDetails.openCartFromNavigation();

    // 10. Verify that both additions share one row and the total is computed from quantity.
    const duplicateCartRow = cart.rowFor(searchTerms.productName);
    await expect(cart.rowsFor(searchTerms.productName)).toHaveCount(1);
    const duplicateQty = await cart.quantityValue(duplicateCartRow);
    const duplicateUnit = await cart.unitPriceValue(duplicateCartRow);
    expect(duplicateQty).toBe(2);
    expect(await cart.lineTotalValue(duplicateCartRow)).toBe(duplicateUnit * duplicateQty);
  });
});