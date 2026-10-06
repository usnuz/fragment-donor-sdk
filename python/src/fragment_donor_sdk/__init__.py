"""Fragment Donor: independent, server-side API client; no service auth."""

from .client import (
    ApiError,
    ApiResponse,
    FloodWaitError,
    FragmentDonorClient,
    MalformedResponseError,
    PurchaseOutcomeUnknownError,
    PurchaseResponse,
    ServiceUnavailableError,
    TransportError,
    TransportRequest,
    TransportResponse,
    UserInfoResponse,
    ValidationError,
    WalletBalanceResponse,
    WalletCredentials,
)

__version__ = "0.1.1"
__all__ = [
    "ApiError",
    "ApiResponse",
    "FloodWaitError",
    "FragmentDonorClient",
    "MalformedResponseError",
    "PurchaseOutcomeUnknownError",
    "PurchaseResponse",
    "ServiceUnavailableError",
    "TransportError",
    "TransportRequest",
    "TransportResponse",
    "UserInfoResponse",
    "ValidationError",
    "WalletBalanceResponse",
    "WalletCredentials",
]
