"""
Visualization utilities for LIFO.AI Demo System
"""

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional


def setup_plotting_style():
    """Setup consistent plotting style"""
    try:
        plt.style.use('seaborn-v0_8')
    except:
        try:
            plt.style.use('seaborn')
        except:
            print("⚠️ Using default matplotlib style")
    
    sns.set_palette("husl")


def create_dashboard(results: Dict[str, Any], title: str = "LIFO.AI Analysis Dashboard") -> None:
    """
    Create a comprehensive dashboard from results
    
    Args:
        results: Dictionary containing analysis results
        title: Dashboard title
    """
    setup_plotting_style()
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle(title, fontsize=16, fontweight='bold')
    
    # Implementation will depend on the specific results structure
    # This is a placeholder for the actual implementation
    
    plt.tight_layout()
    plt.show()


def plot_results(data: pd.DataFrame, 
                plot_type: str = "bar",
                x_col: str = None,
                y_col: str = None,
                title: str = "Results Plot") -> None:
    """
    Create various types of plots from data
    
    Args:
        data: DataFrame containing data to plot
        plot_type: Type of plot ('bar', 'line', 'scatter', 'hist')
        x_col: Column name for x-axis
        y_col: Column name for y-axis
        title: Plot title
    """
    setup_plotting_style()
    
    plt.figure(figsize=(10, 6))
    
    if plot_type == "bar":
        if x_col and y_col:
            plt.bar(data[x_col], data[y_col])
            plt.xlabel(x_col)
            plt.ylabel(y_col)
        else:
            plt.bar(range(len(data)), data.iloc[:, 0])
    
    elif plot_type == "line":
        if x_col and y_col:
            plt.plot(data[x_col], data[y_col])
            plt.xlabel(x_col)
            plt.ylabel(y_col)
        else:
            plt.plot(data.iloc[:, 0])
    
    elif plot_type == "scatter":
        if x_col and y_col:
            plt.scatter(data[x_col], data[y_col])
            plt.xlabel(x_col)
            plt.ylabel(y_col)
    
    elif plot_type == "hist":
        if x_col:
            plt.hist(data[x_col], bins=20)
            plt.xlabel(x_col)
        else:
            plt.hist(data.iloc[:, 0], bins=20)
    
    plt.title(title)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()


def create_score_visualization(scores: List[Dict[str, Any]]) -> None:
    """
    Create visualization for scoring results
    
    Args:
        scores: List of scoring result dictionaries
    """
    if not scores:
        print("No scores to visualize")
        return
    
    setup_plotting_style()
    
    df = pd.DataFrame(scores)
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('LIFO.AI Scoring Results Analysis', fontsize=16, fontweight='bold')
    
    # Score distribution
    if 'composite_score' in df.columns:
        axes[0, 0].hist(df['composite_score'], bins=20, alpha=0.7, color='blue')
        axes[0, 0].set_title('Score Distribution')
        axes[0, 0].set_xlabel('Composite Score')
        axes[0, 0].set_ylabel('Frequency')
    
    # Urgency levels
    if 'recommendation' in df.columns:
        recommendation_counts = df['recommendation'].value_counts()
        axes[0, 1].bar(recommendation_counts.index, recommendation_counts.values)
        axes[0, 1].set_title('Recommendation Distribution')
        axes[0, 1].set_ylabel('Count')
        axes[0, 1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    # Example usage
    sample_data = pd.DataFrame({
        'category': ['A', 'B', 'C', 'D'],
        'score': [0.8, 0.6, 0.4, 0.2],
        'count': [10, 15, 20, 25]
    })
    
    plot_results(sample_data, 'bar', 'category', 'score', 'Sample Results')