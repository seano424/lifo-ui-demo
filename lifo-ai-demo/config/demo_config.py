"""
Configuration settings for LIFO.AI Demo System
"""

# API Configuration
API_CONFIG = {
    'base_url': 'http://localhost:8000',
    'timeout': 30,
    'retry_attempts': 3,
    'retry_delay': 1.0
}

# Scoring Algorithm Configuration
SCORING_CONFIG = {
    'default_weights': {
        'expiry': 0.5,
        'velocity': 0.3,
        'margin': 0.2
    },
    'category_weights': {
        'fresh_produce': {'expiry': 0.7, 'velocity': 0.2, 'margin': 0.1},
        'dairy': {'expiry': 0.6, 'velocity': 0.3, 'margin': 0.1},
        'bakery_fresh': {'expiry': 0.8, 'velocity': 0.1, 'margin': 0.1},
        'frozen': {'expiry': 0.2, 'velocity': 0.4, 'margin': 0.4},
        'pantry_staples': {'expiry': 0.1, 'velocity': 0.4, 'margin': 0.5}
    }
}

# Demo Data Configuration
DEMO_DATA_CONFIG = {
    'sample_size': 100,
    'categories': ['fresh_produce', 'dairy', 'bakery_fresh', 'frozen', 'pantry_staples'],
    'price_range': (0.5, 50.0),
    'quantity_range': (1, 100),
    'expiry_range': (0, 365)
}

# Visualization Configuration
VIZ_CONFIG = {
    'figure_size': (12, 8),
    'dpi': 300,
    'color_palette': 'husl',
    'output_dir': '../outputs/visualizations/'
}

# Logging Configuration
LOG_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'handlers': ['console', 'file']
}