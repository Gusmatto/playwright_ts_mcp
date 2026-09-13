import { expect, type Locator, type Page } from '@playwright/test';

export class ProductSearchPage {
  constructor(readonly page: Page) {}

  get searchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Search Product' });
  }

  get searchButton(): Locator {
    return this.page.locator('#submit_search');
  }

  get searchedProductsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Searched Products' });
  }

  get allProductCards(): Locator {
    return this.page.locator('.productinfo');
  }

  productCard(productName: string): Locator {
    return this.allProductCards.filter({ hasText: productName }).first();
  }

  async open(): Promise<void> {
    await this.page.goto('https://www.automationexercise.com/products', {
      waitUntil: 'domcontentloaded',
    });
  }

  async searchFor(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.searchButton.click();
  }

  async openProduct(productName: string): Promise<void> {
    await expect(this.productCard(productName)).toBeVisible();
    await this.page.getByRole('link', { name: /View Product/ }).first().click();
  }
}