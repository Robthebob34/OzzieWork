"""Utility helpers for job geolocation and distance calculations."""
from __future__ import annotations

import json
import math
from typing import Optional, Tuple
from urllib import parse, request


USER_AGENT = "WorkingHolidayJobs/1.0 (contact: support@workingholidayjobs.example)"


def geocode_query(query: str, *, timeout: int = 5) -> Optional[Tuple[float, float]]:
    """Resolve a textual location into latitude/longitude using Nominatim."""
    if not query:
        return None

    url = "https://nominatim.openstreetmap.org/search?" + parse.urlencode(
        {"q": query, "format": "json", "limit": 1}
    )
    req = request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None

    if not payload:
        return None

    top_hit = payload[0]
    try:
        return float(top_hit["lat"]), float(top_hit["lon"])
    except (KeyError, ValueError, TypeError):
        return None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in kilometers between two lat/lon points."""
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c
