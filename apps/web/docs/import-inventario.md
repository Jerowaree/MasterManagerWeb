# Importacion de Inventario (Excel)

## Formato recomendado

Usa una hoja con encabezados similares a los siguientes (no son sensibles a mayusculas):

- Codigo o SKU
- Nombre o Producto
- Categoria
- Precio
- StockMinimo (opcional)
- StockInicial (opcional)
- CostoInicial (opcional)
- BranchId / SucursalId (opcional)

## Reglas

- Campos obligatorios: Codigo, Nombre, Categoria, Precio.
- Si hay StockInicial > 0, se recomienda incluir BranchId.
- Maximo de filas por archivo: 500.

## Uso en UI

1. Ir a Inventario.
2. Click en `Importar Excel`.
3. Seleccionar archivo .xlsx/.xls.
4. El sistema procesa y crea productos en lotes.

## Notas

- Los campos numericos aceptan coma o punto como separador decimal.
- Si hay errores, se mostrara un mensaje y no se importara el archivo.
