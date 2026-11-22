import json
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


def log_device_event(event, *, device=None, camera=None, reason=None):
    school = camera.school if camera else device.school if device else None
    data = {
        "event": event,
        "occurred_at": timezone.now().isoformat(),
        "device_id": str(device.pk) if device else None,
        "camera_id": str(camera.pk) if camera else None,
        "school_id": str(school.pk) if school else None,
        "organization_id": str(school.organization_id) if school else None,
        "reason": reason,
    }
    logger.warning("%s", json.dumps(data))
