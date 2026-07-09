from abc import abstractmethod

from rest_framework.exceptions import PermissionDenied

from marketing.models import OrderInquiry, OrderCostingVersion
from rest_framework import permissions


class OrderInquiryPermissionMixin:

    def get_order_inquiry(self):
        if hasattr(super(), 'get_object'):
            order_inquiry = self.get_object()
            if isinstance(order_inquiry, OrderInquiry):
                return order_inquiry
        raise NotImplemented("Function not implemented. Please implement get_order_inquiry method")

    def check_permissions(self, request):
        if hasattr(super(), 'check_permissions'):
            super().check_permissions(request)

        if request.method not in permissions.SAFE_METHODS:
            order_inquiry = self.get_order_inquiry()

            if order_inquiry.state != OrderInquiry.OPEN_STATE:
                raise PermissionDenied("Order Inquiry is not editable")


class ObjectStatePermissionMixin:

    @property
    @abstractmethod
    def editable_states(self):
        ...

    @abstractmethod
    def get_object_current_state(self):
        ...

    def check_permissions(self, request):
        if hasattr(super(), 'check_permissions'):
            super().check_permissions(request)

        if request.method not in permissions.SAFE_METHODS:

            if self.get_object_current_state() not in self.editable_states:
                raise PermissionDenied("Invalid operation. Editing is not allowed in current state.")

