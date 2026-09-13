import { type Locator, type Page } from '@playwright/test';

export class ProductDetailsPage {
  constructor(readonly page: Page) {}

  private get info(): Locator {
    return this.page.locator('.product-information');
  }

  get category(): Locator {
    return this.info.getByText(/Category:/);
  }

  get availability(): Locator {
    return this.info.getByText(/Availability:/);
  }

  get condition(): Locator {
    return this.info.getByText(/Condition:/);
  }

  get brand(): Locator {
    return this.info.getByText(/Brand:/);
  }

  get price(): Locator {
    return this.info.getByText(/Rs\.\s*[\d,]+/).first();
  }

  get quantity(): Locator {
    return this.page.getByRole('spinbutton');
  }

  get addToCartButton(): Locator {
    return this.page.getByRole('button', { name: /Add to cart/ });
  }

  get addedConfirmation(): Locator {
    return this.page.getByRole('heading', { name: 'Added!' });
  }

  get viewCartLink(): Locator {
    return this.page.getByRole('link', { name: 'View Cart' });
  }

  get continueShoppingButton(): Locator {
    return this.page.getByRole('button', { name: 'Continue Shopping' });
  }

  get cartNavigationLink(): Locator {
    return this.page.getByRole('link', { name: /Cart/ }).first();
  }

  productName(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 2 });
  }

  async priceValue(): Promise<number> {
    const text = (await this.price.innerText()).trim();
    const match = text.match(/Rs\.\s*([\d,]+)/);
    if (!match) throw new Error(`No rupee amount found in: ${text}`);
    return Number(match[1].replace(/,/g, ''));
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  async openCart(): Promise<void> {
    await this.viewCartLink.click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }

  async openCartFromNavigation(): Promise<void> {
    await this.cartNavigationLink.click();
  }
}