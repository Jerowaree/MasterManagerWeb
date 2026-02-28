import { describe, expect, it } from 'vitest';
import { parseInventoryRows } from './excel-utils';

describe('parseInventoryRows', () => {
  it('maps rows and returns items', () => {
    const rows = [
      {
        Codigo: 'SKU-001',
        Nombre: 'Producto A',
        Categoria: 'Bebidas',
        Precio: '12.50',
        StockMinimo: '5',
      },
    ];

    const result = parseInventoryRows(rows);
    expect(result.errors.length).toBe(0);
    expect(result.items.length).toBe(1);
    expect(result.items[0].productId).toBe('SKU-001');
    expect(result.items[0].price).toBe(12.5);
    expect(result.items[0].minStock).toBe(5);
  });

  it('returns errors when required fields are missing', () => {
    const rows = [{ Nombre: 'Producto B', Precio: '10' }];
    const result = parseInventoryRows(rows);
    expect(result.items.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });
});
