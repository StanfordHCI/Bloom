import datetime
import pytz

def get_current_iso_datetime() -> datetime.datetime:
    """
    Get the current datetime in ISO format in UTC timezone.
    Returns the datetime object.
    """
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)

def get_current_iso_datetime_str() -> str:
    """
    Get the current datetime in ISO format in UTC timezone.
    Returns the datetime as a string.
    """
    return get_current_iso_datetime().isoformat()

def parse_datetime(datetime_str: str) -> datetime.datetime:
    """
    Parse an ISO formatted datetime string to a datetime object.
    """
    return datetime.datetime.fromisoformat(datetime_str)

def parse_iso_to_timestamp(iso_str: str) -> int:
    return int(parse_datetime(iso_str).timestamp())

def localize_datetime(original_datetime: datetime.datetime, timezone: str) -> datetime.datetime:
    """
    Localize an ISO formatted datetime string to the current timezone.
    """
    local_tz = pytz.timezone(timezone)
    localized_datetime = original_datetime.astimezone(local_tz)
    return localized_datetime
    
def verbose_datetime(original_datetime: datetime.datetime) -> str:
    """
    Convert a datetime object to a verbose string representation.
    Example: "Mon, Jan 01, 2022 13:00"
    """
    return original_datetime.strftime("%a, %b %d, %Y %H:%M")

def verbose_date(original_datetime: datetime.datetime) -> str:
    """
    Convert a datetime object to a verbose date string representation.
    Example: "Mon, Jan 01, 2022"
    """
    return original_datetime.strftime("%a, %b %d, %Y")