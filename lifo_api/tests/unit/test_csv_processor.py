"""
Unit tests for CSV processor service
"""

from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException as CSVValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.secure_csv_processor import SecureCSVProcessor as CSVProcessor


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    session = AsyncMock(spec=AsyncSession)
    return session


@pytest.fixture
def csv_processor(mock_db_session):
    """Create CSV processor instance."""
    return CSVProcessor(mock_db_session)


class TestCSVProcessor:
    """Test CSV processor functionality."""

    def test_decode_csv_content_utf8(self, csv_processor):
        """Test UTF-8 CSV content decoding."""
        content = b"sku,name\nTEST-001,Test Product"
        result = csv_processor._decode_csv_content(content)
        assert result == "sku,name\nTEST-001,Test Product"

    def test_decode_csv_content_invalid_encoding(self, csv_processor):
        """Test invalid encoding handling."""
        content = b"\xff\xfe\x00\x00"  # Invalid UTF-8
        with pytest.raises(ValueError, match="Unable to decode CSV file"):
            csv_processor._decode_csv_content(content)

    def test_parse_csv_structure_valid(self, csv_processor):
        """Test parsing valid CSV structure."""
        csv_content = "sku,product_name,quantity\nTEST-001,Test Product,10"
        result = csv_processor._parse_csv_structure(csv_content)

        assert result["headers"] == ["sku", "product_name", "quantity"]
        assert result["data_rows"] == [["TEST-001", "Test Product", "10"]]
        assert result["total_rows"] == 1

    def test_parse_csv_structure_empty(self, csv_processor):
        """Test parsing empty CSV."""
        csv_content = "sku,product_name"
        with pytest.raises(
            ValueError, match="CSV must contain at least a header row and one data row"
        ):
            csv_processor._parse_csv_structure(csv_content)

    def test_parse_csv_structure_quoted_values(self, csv_processor):
        """Test parsing CSV with quoted values."""
        csv_content = 'sku,product_name,description\nTEST-001,"Test Product","A test, product"'
        result = csv_processor._parse_csv_structure(csv_content)

        assert result["headers"] == ["sku", "product_name", "description"]
        assert result["data_rows"] == [["TEST-001", "Test Product", "A test, product"]]

    @pytest.mark.asyncio
    async def test_validate_sku_valid(self, csv_processor):
        """Test SKU validation with valid input."""
        result = await csv_processor._validate_sku("TEST-001", "sku", 1)
        assert result == "TEST-001"

    @pytest.mark.asyncio
    async def test_validate_sku_empty(self, csv_processor):
        """Test SKU validation with empty input."""
        with pytest.raises(ValueError, match="SKU cannot be empty"):
            await csv_processor._validate_sku("", "sku", 1)

    @pytest.mark.asyncio
    async def test_validate_sku_too_long(self, csv_processor):
        """Test SKU validation with too long input."""
        long_sku = "A" * 51  # 51 characters
        with pytest.raises(ValueError, match="SKU must be between 3 and 50 characters"):
            await csv_processor._validate_sku(long_sku, "sku", 1)

    @pytest.mark.asyncio
    async def test_validate_quantity_valid(self, csv_processor):
        """Test quantity validation with valid input."""
        result = await csv_processor._validate_quantity("10.5", "quantity", 1)
        assert result == 10.5

    @pytest.mark.asyncio
    async def test_validate_quantity_negative(self, csv_processor):
        """Test quantity validation with negative input."""
        with pytest.raises(ValueError, match="Quantity cannot be negative"):
            await csv_processor._validate_quantity("-5", "quantity", 1)

    @pytest.mark.asyncio
    async def test_validate_quantity_invalid_format(self, csv_processor):
        """Test quantity validation with invalid format."""
        with pytest.raises(ValueError, match="Invalid quantity format"):
            await csv_processor._validate_quantity("invalid", "quantity", 1)

    @pytest.mark.asyncio
    async def test_validate_price_valid(self, csv_processor):
        """Test price validation with valid input."""
        result = await csv_processor._validate_price("10.99", "price", 1)
        assert float(result) == 10.99

    @pytest.mark.asyncio
    async def test_validate_price_negative(self, csv_processor):
        """Test price validation with negative input."""
        with pytest.raises(ValueError, match="Price cannot be negative"):
            await csv_processor._validate_price("-5.00", "price", 1)

    @pytest.mark.asyncio
    async def test_validate_date_valid_formats(self, csv_processor):
        """Test date validation with various valid formats."""
        valid_dates = ["2024-12-31", "31/12/2024", "12/31/2024", "2024-12-31 23:59:59"]

        for date_str in valid_dates:
            result = await csv_processor._validate_date(date_str, "date", 1)
            assert result.year == 2024
            assert result.month == 12
            assert result.day == 31

    @pytest.mark.asyncio
    async def test_validate_date_invalid_format(self, csv_processor):
        """Test date validation with invalid format."""
        with pytest.raises(ValueError, match="Invalid date format"):
            await csv_processor._validate_date("invalid-date", "date", 1)

    @pytest.mark.asyncio
    async def test_validate_category_valid(self, csv_processor):
        """Test category validation with valid input."""
        result = await csv_processor._validate_category("dairy", "category", 1)
        assert result == "dairy"

    @pytest.mark.asyncio
    async def test_validate_category_empty(self, csv_processor):
        """Test category validation with empty input."""
        result = await csv_processor._validate_category("", "category", 1)
        assert result == "general"  # Default category

    @pytest.mark.asyncio
    async def test_validate_category_invalid(self, csv_processor):
        """Test category validation with invalid input."""
        result = await csv_processor._validate_category("invalid_category", "category", 1)
        assert result == "general"  # Falls back to default

    def test_generate_csv_template_inventory(self, csv_processor):
        """Test CSV template generation for inventory."""
        template = csv_processor.generate_csv_template("inventory")

        # Check that template contains expected headers
        assert "sku,product_name" in template
        assert "quantity,cost_price,selling_price,expiry_date" in template

        # Check that template has sample data
        lines = template.strip().split("\n")
        assert len(lines) >= 3  # Header + at least 2 sample rows

    def test_generate_csv_template_invalid_type(self, csv_processor):
        """Test CSV template generation with invalid type."""
        with pytest.raises(ValueError, match="Unsupported processing type"):
            csv_processor.generate_csv_template("invalid_type")

    @pytest.mark.asyncio
    async def test_validate_csv_data_missing_required_columns(self, csv_processor):
        """Test CSV validation with missing required columns."""
        parsed_data = {
            "headers": ["sku", "product_name"],  # Missing required columns
            "data_rows": [["TEST-001", "Test Product"]],
            "total_rows": 1,
        }

        with pytest.raises(CSVValidationError, match="Missing required columns"):
            await csv_processor._validate_csv_data(parsed_data, "inventory", "test-store")

    @pytest.mark.asyncio
    async def test_validate_business_rules_expired_product(self, csv_processor):
        """Test business rules validation with expired product."""
        from datetime import datetime, timedelta

        # Create row with expired date
        expired_date = datetime.now() - timedelta(days=1)
        row_data = {
            "sku": "TEST-001",
            "product_name": "Test Product",
            "quantity": 10,
            "cost_price": 1.0,
            "selling_price": 2.0,
            "expiry_date": expired_date.date(),
        }

        result = await csv_processor._validate_business_rules(
            row_data, "inventory", "test-store", 1
        )

        assert len(result["warnings"]) > 0
        assert any("expired" in warning["warning"].lower() for warning in result["warnings"])

    @pytest.mark.asyncio
    async def test_validate_business_rules_low_margin(self, csv_processor):
        """Test business rules validation with low margin."""
        row_data = {
            "sku": "TEST-001",
            "product_name": "Test Product",
            "quantity": 10,
            "cost_price": 2.0,
            "selling_price": 1.0,  # Selling price lower than cost
            "expiry_date": "2024-12-31",
        }

        result = await csv_processor._validate_business_rules(
            row_data, "inventory", "test-store", 1
        )

        assert len(result["warnings"]) > 0
        assert any("price" in warning["warning"].lower() for warning in result["warnings"])
