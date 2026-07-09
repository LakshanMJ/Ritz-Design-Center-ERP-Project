from django.core.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404

from marketing.models import OrderInquiry, OrderCostingVersion, PurchaseOrder, ActualPOClub, ActualPOClub


class OrderMixin:

    def get_order_inquiry_or_raise_http404(self, order_id):
        order = get_object_or_404(OrderInquiry, pk=order_id)
        return order

    def get_order_version_or_raise_http404(self, order_id, version_id):
        return get_object_or_404(OrderCostingVersion, order_id=order_id, pk=version_id)

    def get_costing_version_or_raise_http404(self, version_id):
        return get_object_or_404(OrderCostingVersion, pk=version_id)

    def get_purchase_order_or_raise_http404(self, purchase_order_id):
        return get_object_or_404(PurchaseOrder, pk=purchase_order_id)

    def version_supplier_selectable(self, version):
        selectable = version.costing_supplier_selectable()
        if not selectable:
            raise PermissionDenied("Cannot edit supplier in current state.")
            # pass # TODO - uncomment this
        
    def get_po_club_or_raise_http404(self, po_club_id):
        return get_object_or_404(ActualPOClub, pk=po_club_id)

    def get_object_or_404(self, model, **kwargs):
        object = get_object_or_404(model, **kwargs)
        return object


