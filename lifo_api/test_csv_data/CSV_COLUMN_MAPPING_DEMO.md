# CSV Column Mapping Demo - LIFO.AI

## Overview

The LIFO.AI CSV processor features **intelligent column mapping** that automatically handles variations in column names, making it easy for users to upload CSV files without worrying about exact formatting.

## Supported Column Name Variations

### Core Mapping Rules

1. **Case Insensitive**: `Product_Name`, `product_name`, `PRODUCT_NAME` all map to `product_name`
2. **Space Handling**: `Product Name`, `Product-Name`, `Product.Name` all map to `product_name`
3. **Underscore Normalization**: Converts spaces and special characters to underscores
4. **Common Aliases**: Multiple ways to specify the same field

### Column Mapping Table

| Standard Field     | Accepted Variations                         | Examples                                 |
| ------------------ | ------------------------------------------- | ---------------------------------------- |
| `sku`              | sku, SKU                                    | SKU, sku                                 |
| `product_name`     | product_name, productname, name             | "Product Name", "productName", "name"    |
| `category`         | category, Category                          | "Category", "CATEGORY"                   |
| `quantity`         | quantity, qty, Quantity                     | "Quantity", "qty", "QTY"                 |
| `expiry_date`      | expiry_date, expirydate, expiry             | "Expiry Date", "expiryDate", "expiry"    |
| `brand`            | brand, Brand                                | "Brand", "BRAND"                         |
| `cost_price`       | cost_price, costprice                       | "Cost Price", "costPrice", "costprice"   |
| `selling_price`    | selling_price, sellingprice, price          | "Selling Price", "sellingPrice", "price" |
| `manufacture_date` | manufacture_date, manufacturedate, mfg_date | "Manufacture Date", "mfg_date"           |
| `location_code`    | location_code, locationcode, location       | "Location Code", "location"              |
| `unit_type`        | unit_type, unittype                         | "Unit Type", "unitType"                  |

## Demo Files

### 1. `demo_flexible_columns.csv` - Standard Format

```csv
SKU,Product Name,Category,Quantity,Expiry Date,Brand,Cost Price,Selling Price,Location Code,Unit Type
```

**Features**: Standard format with spaces in column names

### 2. `demo_variation_1_camelcase.csv` - CamelCase

```csv
sku,productName,category,quantity,expiryDate,brand,costPrice,sellingPrice,locationCode,unitType
```

**Features**: CamelCase naming convention

### 3. `demo_variation_2_spaces.csv` - Spaced Names

```csv
SKU,Product Name,Category,Quantity,Expiry Date,Brand,Cost Price,Selling Price,Location Code,Unit Type
```

**Features**: Human-readable column names with spaces

### 4. `demo_variation_3_mixed.csv` - Mixed Aliases

```csv
Sku,name,Category,qty,expiry,Brand,costprice,price,Location,unit_type
```

**Features**: Uses short aliases like `name` (→ product_name), `qty` (→ quantity), `price` (→ selling_price)

### 5. `demo_variation_4_no_spaces.csv` - No Spaces

```csv
sku,productname,category,quantity,expirydate,brand,costprice,sellingprice,locationcode,unittype
```

**Features**: All lowercase, no spaces or underscores

### 6. `demo_variation_5_aliases.csv` - Common Aliases

```csv
sku,name,category,quantity,expiry,brand,costprice,price,location,unit_type
```

**Features**: Uses the most common aliases for fields

### 7. `demo_variation_6_mixed_case.csv` - Mixed Case

```csv
SKU,PRODUCT_NAME,Category,QTY,EXPIRY_DATE,Brand,Cost_Price,SELLING_PRICE,location_code,Unit_Type
```

**Features**: Mixed uppercase/lowercase with underscores

## Required vs Optional Fields

### Required Fields (Must be present)

- `sku` - Product SKU/identifier
- `product_name` (or `name`) - Product name
- `category` - Product category
- `quantity` (or `qty`) - Quantity amount
- `expiry_date` (or `expiry`) - Expiration date

### Optional Fields (With defaults)

- `brand` - Product brand (default: "Unknown")
- `cost_price` - Cost per unit (default: null)
- `selling_price` (or `price`) - Selling price (default: null)
- `manufacture_date` (or `mfg_date`) - Manufacturing date (default: null)
- `location_code` (or `location`) - Storage location (default: "MAIN")
- `unit_type` - Unit of measurement (default: "pcs")

## Testing the Column Mapping

You can test any of these demo files with the CSV upload endpoint:

```bash
curl -X POST "http://localhost:8000/api/v1/csv-upload/upload-and-create-batches" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@demo_flexible_columns.csv" \
  -F "store_id=YOUR_STORE_ID" \
  -F "chunk_size=50"
```

## Processing Features

### Smart Normalization

- Converts all column names to lowercase
- Replaces spaces, hyphens, dots with underscores
- Maps common variations to standard field names

### Validation

- Checks for required columns after normalization
- Provides helpful error messages for missing fields
- Warns about unrecognized columns

### Error Handling

- Graceful handling of misspelled column names
- Clear feedback on what columns are expected
- Suggestions for closest matches

## Examples of Successful Mappings

| Input Column   | Normalized To | Status      |
| -------------- | ------------- | ----------- |
| "Product Name" | product_name  | ✅ Required |
| "productName"  | product_name  | ✅ Required |
| "name"         | product_name  | ✅ Required |
| "Cost Price"   | cost_price    | ✅ Optional |
| "costprice"    | cost_price    | ✅ Optional |
| "price"        | selling_price | ✅ Optional |
| "expiry"       | expiry_date   | ✅ Required |
| "qty"          | quantity      | ✅ Required |
| "CATEGORY"     | category      | ✅ Required |

This intelligent mapping system allows users to upload CSV files in various formats without needing to rename columns, making the system very user-friendly and flexible.
