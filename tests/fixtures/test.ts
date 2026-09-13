import { test as base } from '@playwright/test';
import { CartPage } from '../ui/pages/cart.page';
import { ProductDetailsPage } from '../ui/pages/product-details.page';
import { ProductSearchPage } from '../ui/pages/product-search.page';

type Fixtures = {
  productSearch: ProductSearchPage;
  productDetails: ProductDetailsPage;
  cart: CartPage;
};

export const test = base.extend<Fixtures>({
  productSearch: async ({ page }, use) => {
    await use(new ProductSearchPage(page));
  },
  productDetails: async ({ page }, use) => {
    await use(new ProductDetailsPage(page));
  },
  cart: async ({ page }, use) => {
    await use(new CartPage(page));
  },
});
