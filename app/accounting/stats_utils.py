"""Lightweight, dependency-free statistics helpers for the "Level 1"
analytics features (forecasting, anomaly detection, segmentation) --
pure Python arithmetic, no numpy/pandas/scikit-learn. Good enough for a
small business's data volume; revisit with a real ML stack only if the
data and accuracy needs actually outgrow this."""
import math


def linear_forecast(values: list) -> float:
    """Simple least-squares line through (index, value) pairs, extrapolated
    one period forward. Falls back to the plain average with 0/1 data
    points (a line needs at least 2)."""
    n = len(values)
    if n == 0:
        return 0.0
    if n == 1:
        return round(values[0], 2)

    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(values) / n
    numerator = sum((xs[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((xs[i] - x_mean) ** 2 for i in range(n))
    slope = numerator / denominator if denominator else 0.0
    intercept = y_mean - slope * x_mean
    forecast = slope * n + intercept  # next index is n (0-indexed, so n is one past the last)
    return round(max(forecast, 0.0), 2)


def mean_stddev(values: list):
    n = len(values)
    if n == 0:
        return 0.0, 0.0
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    return mean, math.sqrt(variance)
