from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# ==================== Dashboard Schemas ====================

class DashboardJourneyStats(BaseModel):
    total: int = 0
    in_progress: int = 0
    confirmed: int = 0
    completed: int = 0
    avg_duration_days: float = 0.0


class DashboardRevenueStats(BaseModel):
    total_sell: float = 0.0
    total_cost: float = 0.0
    profit_margin: float = 0.0
    margin_percent: float = 0.0  # profit_margin / total_sell * 100
    avg_transaction: float = 0.0


class DashboardCustomerStats(BaseModel):
    total: int = 0
    new_this_month: int = 0
    completed: int = 0
    pending: int = 0
    vip_count: int = 0  # tier: VIP or Gold
    repeat_customers: int = 0  # 2+ bookings


class DashboardBookingStats(BaseModel):
    pending: int = 0
    confirmed: int = 0
    failed: int = 0
    success_rate: float = 0.0  # confirmed / (confirmed + failed) * 100


class DashboardStatsResponse(BaseModel):
    journeys: DashboardJourneyStats
    revenue: DashboardRevenueStats
    customers: DashboardCustomerStats
    bookings: DashboardBookingStats
    period: str = "month"


class ActivityResponse(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardActivitiesResponse(BaseModel):
    activities: List[ActivityResponse]
    total: int = 0
