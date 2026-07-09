from abc import abstractmethod

from rest_framework import status
from rest_framework.response import Response

from marketing.mixins.order_mixins import OrderMixin


class PackItemServiceMixin(OrderMixin):

    @abstractmethod
    def get_form_data(self):
        ...

    @abstractmethod
    def get_serializer(self):
        ...

    @abstractmethod
    def get_service_object(self, pack_item_id):
        ...

    def post(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id', None)
        order_id = kwargs.get('order_id', None)
        pack_item_id = kwargs.get('pack_item_id', None)
        version = self.get_order_version_or_raise_http404(order_id, version_id)
        form_data = self.get_form_data()
        pack_item_ids = request.data.get('pack_item_ids', [pack_item_id,])

        serializer_class = self.get_serializer()

        serializer = serializer_class(data={**form_data, 'pack_item': pack_item_id})
        if serializer.is_valid():
            for pack_item in pack_item_ids:
                object = self.get_service_object(pack_item)
                serializer = serializer_class(data={**form_data, 'pack_item': object.pack_item_id}, instance=object)
                if serializer.is_valid():
                    serializer.save()
            http_response = Response({'success': True})

        else:
            http_response = Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        return http_response



