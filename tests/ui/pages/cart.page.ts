import { type Locator, type Page } from '@playwright/test';

export class CartPage {
  constructor(readonly page: Page) {}

  get table(): Locator {
    return this.page.getByRole('table');
  }

  rowsFor(productName: string): Locator {
    return this.table.getByRole('row').filter({ hasText: productName });
  }

  rowFor(productName: string): Locator {
    return this.rowsFor(productName).first();
  }

  unitPrice(row: Locator): Locator {
    return row.getByRole('cell').nth(2);
  }

  quantity(row: Locator): Locator {
    return row.getByRole('cell').nth(3);
  }

  lineTotal(row: Locator): Locator {
    return row.getByRole('cell').nth(4);
  }

  private parseRupees(text: string): number {
    const match = text.match(/Rs\.\s*([\d,]+)/);
    if (!match) throw new Error(`No rupee amount found in: ${text}`);
    return Number(match[1].replace(/,/g, ''));
  }

  async unitPriceValue(row: Locator): Promise<number> {
    return this.parseRupees(await this.unitPrice(row).innerText());
  }

  async quantityValue(row: Locator): Promise<number> {
    return Number((await this.quantity(row).innerText()).trim());
  }

  async lineTotalValue(row: Locator): Promise<number> {
    return this.parseRupees(await this.lineTotal(row).innerText());
  }
}