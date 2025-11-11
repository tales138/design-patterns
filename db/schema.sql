CREATE TABLE IF NOT EXISTS cart_items (
  cart_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  PRIMARY KEY (cart_id, product_id)
);
