from rest_framework.generics import get_object_or_404

from marketing.models import ActualPOClub
from marketing.permissions.costing_permissions import ObjectStatePermissionMixin


class POClubPermissionMixin(ObjectStatePermissionMixin):
    editable_states = []

    def get_po_club(self):
        po_club_id = self.kwargs.get('po_club_id')
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        return po_club

    def get_object_current_state(self):
        po_club = self.get_po_club()
        return po_club.state
