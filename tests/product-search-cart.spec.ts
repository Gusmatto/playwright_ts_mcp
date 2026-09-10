import { test, expect } from '@playwright/test';

const baseUrl = 'https://www.automationexercise.com';
const productName = 'Blue Top';
const noMatchTerm = 'No Such Product 999';
const searchVariants = [productName, productName.toUpperCase(), productName.toLowerCase(), 'Blue'];

function parseRupees(text: string): number {
  const match = text.match(/Rs\.\s*(\d+)/);
  if (!match) {
    throw new Error(`Expected a rupee amount in: ${text}`);
  }
  return Number(match[1]);
}

async function searchForProduct(page: Parameters<typeof test>[0] extends never ? never : any, searchTerm: string) {
  await page.goto(`${baseUrl}/products`);
  await page.getByRole('textbox', { name: 'Search Product' }).fill(searchTerm);
  await page.locator('#submit_search').click();
}

async function openProductDetails(page: any) {
  await searchForProduct(page, productName);
  await page.locator('a[href^="/product_details/"]').first().click();
  await expect(page).toHaveURL(/\/product_details\/\d+/);
}

async function addProductToCart(page: any) {
  await page.getByRole('button', { name: /Add to cart/ }).click();
  await expect(page.getByRole('heading', { name: 'Added!' })).toBeVisible();
}

test.describe('Product Search and Cart', () => {
  test('Search for a product by name', async ({ page }) => {
    // 1. Navigate to the home page and open the Products page.
    await page.goto(`${baseUrl}/`);
    await page.getByRole('link', { name: /Products/ }).click();
    await expect(page.getByRole('textbox', { name: 'Search Product' })).toBeVisible();

    // 2. Search for the configured product name.
    await page.getByRole('textbox', { name: 'Search Product' }).fill(productName);
    await page.locator('#submit_search').click();
    await expect(page).toHaveURL(/\/products\?search=Blue%20Top/);
    await expect(page.getByRole('heading', { name: 'Searched Products' })).toBeVisible();
    await expect(page.locator('.productinfo').filter({ hasText: productName }).first()).toBeVisible();
  });

  for (const searchTerm of searchVariants) {
    test(`Search matches product variant: ${searchTerm}`, async ({ page }) => {
      // 1. Open the Products page and search using the variant.
      await searchForProduct(page, searchTerm);

      // 2. Verify the target product is present in the results.
      await expect(page.locator('.productinfo').filter({ hasText: productName }).first()).toBeVisible();
    });
  }

  test('Search with no matching product', async ({ page }) => {
    // 1. Open the Products page and search for the configured no-match term.
    await searchForProduct(page, noMatchTerm);
    await expect(page).toHaveURL(/\/products\?search=No%20Such%20Product%20999/);

    // 2. Verify no product card is displayed in the results.
    await expect(page.locator('.productinfo').filter({ hasText: noMatchTerm })).toHaveCount(0);
  });

  test('View product details from a search result', async ({ page }) => {
    // 1. Search for the product and select View Product on the matching result.
    await searchForProduct(page, productName);
    await page.locator('a[href^="/product_details/"]').first().click();
    await expect(page).toHaveURL(/\/product_details\/\d+/);
    const productDetails = page.locator('.product-information');
    await expect(productDetails.getByRole('heading', { name: productName })).toBeVisible();

    // 2. Inspect the product information block.
    await expect(productDetails).toContainText('Category:');
    await expect(productDetails).toContainText('Availability:');
    await expect(productDetails).toContainText('Condition:');
    await expect(productDetails).toContainText('Brand:');
    await expect(productDetails).toContainText(/Rs\.\s*\d+/);
    await expect(page.getByRole('spinbutton')).toHaveValue('1');
    await expect(page.getByRole('button', { name: /Add to cart/ })).toBeVisible();
  });

  test('Add a product to the cart and verify contents', async ({ page }) => {
    // 1. Open the product details page and capture the displayed price.
    await openProductDetails(page);
    const productDetails = page.locator('.product-information');
    const detailsPrice = parseRupees(await productDetails.innerText());

    // 2. Add to cart with the default quantity.
    await addProductToCart(page);
    await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Cart' })).toBeVisible();

    // 3. Open the cart from the confirmation.
    await page.getByRole('link', { name: 'View Cart' }).click();
    await expect(page).toHaveURL(/\/view_cart/);
    await expect(page.locator('#cart_info_table')).toBeVisible();

    // 4. Inspect the cart row for the added product.
    const cartRow = page.locator('#cart_info_table tbody tr').filter({ hasText: productName });
    await expect(cartRow).toHaveCount(1);
    const unitPrice = parseRupees(await cartRow.locator('.cart_price').innerText());
    const quantity = Number(await cartRow.locator('.cart_quantity button').innerText());
    const lineTotal = parseRupees(await cartRow.locator('.cart_total').innerText());
    expect(unitPrice).toBe(detailsPrice);
    expect(quantity).toBe(1);
    expect(lineTotal).toBe(unitPrice * quantity);
  });

  test('Add the same product twice', async ({ page }) => {
    // 1. Add the product to the cart, continue shopping, and add the same product again.
    await openProductDetails(page);
    const detailsPrice = parseRupees(await page.locator('.product-information').innerText());
    await addProductToCart(page);
    await page.getByRole('button', { name: 'Continue Shopping' }).click();
    await addProductToCart(page);

    // 2. Open the cart and verify the aggregated row.
    await page.getByRole('link', { name: 'View Cart' }).click();
    const matchingRows = page.locator('#cart_info_table tbody tr').filter({ hasText: productName });
    await expect(matchingRows).toHaveCount(1);
    const cartRow = matchingRows.first();
    const unitPrice = parseRupees(await cartRow.locator('.cart_price').innerText());
    const quantity = Number(await cartRow.locator('.cart_quantity button').innerText());
    const lineTotal = parseRupees(await cartRow.locator('.cart_total').innerText());
    expect(unitPrice).toBe(detailsPrice);
    expect(quantity).toBe(2);
    expect(lineTotal).toBe(unitPrice * quantity);
  });
});
