from service_po.service_po.serializers import *
from rest_framework import generics, status
from shared.permissions.view_permissions import HasPermission
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import render, get_object_or_404
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper

from shared.permissions.roles import MERCHANT_ADMIN_ROLE, MERCHANT_ROLE, FINANCE_ADMIN_ROLE, FINANCE_USER_ROLE, MERCHANT_ROLE, ADMIN_ROLE
from service_po.helpers.service_po_bom_generator import ServicePOGenerator
from marketing.models import ActualPOClub
from shared.models import PAYMENT_METHOD_TYPES, SHIPPING_MODE_TYPES, COSTING_MODE_TYPES
from marketing.models import ActualPOClub, OtherCostType, PackItemEmbellishmentService, PackItemWashService
from service_po.helpers.other_cost_service_po_bom_generator import OtherCostServicePOGenerator
from shared.utils import get_object_or_none
from django.db import transaction
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination


# Customer Views
class ServicePODeliveryList(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = GeneralServicePOServicetSerializer
    queryset = GeneralServicePOService.objects.filter()

    def get_queryset(self):
        #from django.db.models import F
        qs = super().get_queryset() 
        po_club_id = self.kwargs['po_club_id']
        wash_content_type = ContentType.objects.get_for_model(POPackItemWashService)
        embellishment_content_type = ContentType.objects.get_for_model(POPackItemEmbellishmentService)
        qs = qs.filter(general_service_po__po_club_id=po_club_id, entity_type__in=[wash_content_type, embellishment_content_type]).order_by('entity_type_id', 'id')#.order_by(F('service_detail__type'), F('service_detail__technique'), F('service_detail__id'))
        return qs


class ServicePODeliveryListUpdateView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = GeneralServicePOServicetSerializer
    queryset = GeneralServicePOService.objects.filter()

    def put(self, request, *args, **kwargs):
        data = {
            'status': 'success',
            'message': 'Delivery list updated successfully.'
        }
        has_errors = False
        errors = []
        return_status = status.HTTP_200_OK
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        with transaction.atomic():
            completed = request.data.get('completed', False)
            for general_service_po_service_delivery_data in request.data.get('general_service_po_services', []):
                sub_errors = {}
                general_service_po_service_id = general_service_po_service_delivery_data.pop('id', None)
                supplier_id = general_service_po_service_delivery_data.pop('supplier_id', None)
                general_service_po_service = get_object_or_none(GeneralServicePOService, {'pk': general_service_po_service_id})
                if general_service_po_service:
                    general_service_po = general_service_po_service.general_service_po
                    general_service_po_supplier_price = GeneralServicePOSupplierPrice.objects.filter(
                        general_service_po_supplier__supplier_id=supplier_id,
                        general_service_po_supplier__general_service_po=general_service_po,
                        entity_type=general_service_po_service.entity_type,
                        entity_id=general_service_po_service.entity_id
                    )
                    if len(general_service_po_supplier_price) == 1:
                        general_service_po_service.completed = completed
                        general_service_po_service.save()
                        for general_service_po_service_delivery in general_service_po_service.generalserviceposervicedelivery_set.all():
                            general_service_po_service_delivery_serializer = GeneralServicePOServiceDeliverySerializer(
                                general_service_po_service_delivery,
                                data={
                                    **general_service_po_service_delivery_data,
                                    'general_service_po_supplier_price': general_service_po_supplier_price.first().id,
                                },
                                partial=True
                            )
                            if general_service_po_service_delivery_serializer.is_valid():
                                general_service_po_service_delivery_serializer.update(
                                    instance=general_service_po_service_delivery,
                                    validated_data=general_service_po_service_delivery_serializer.validated_data
                                )
                            else:
                                has_errors = True
                                sub_errors = general_service_po_service_delivery_serializer.errors
                                break
                        if not general_service_po_service.generalserviceposervicedelivery_set.exists():
                            general_service_po_service_delivery_serializer = GeneralServicePOServiceDeliverySerializer(
                                data={
                                    **general_service_po_service_delivery_data,
                                    'general_service_po_supplier_price': general_service_po_supplier_price.first().id,
                                    'planned_send_quantity': general_service_po_service.quantity,
                                    'planned_send_quantity_units': MaterialUnitHelper.PIECES_UNIT,
                                },
                                partial=True
                            )
                            if general_service_po_service_delivery_serializer.is_valid():
                                general_service_po_service_delivery = general_service_po_service_delivery_serializer.save(
                                    general_service_po_service=general_service_po_service
                                )
                                general_service_po_delivery_po_allocation_serializer = GeneralServicePODeliveryPOAllocationSerializer(
                                    data={
                                        'general_service_po_service_delivery': general_service_po_service_delivery.id,
                                        'purchase_order': general_service_po_service.get_entity().po_pack_item.po_pack.purchase_order.id,
                                        'quantity': general_service_po_service.quantity,
                                        'quantity_units': MaterialUnitHelper.PIECES_UNIT
                                    }
                                )
                                if general_service_po_delivery_po_allocation_serializer.is_valid():
                                    general_service_po_delivery_po_allocation_serializer.save()
                                else:
                                    has_errors = True
                                    sub_errors = general_service_po_delivery_po_allocation_serializer.errors
                            else:
                                has_errors = True
                                sub_errors = general_service_po_service_delivery_serializer.errors

                    elif len(general_service_po_supplier_price) > 1:
                        has_errors = True
                        sub_errors['supplier_id'] = 'Multiple suppliers price found for the selected supplier. Please select a specific supplier.'
                    else:
                        has_errors = True
                        sub_errors['supplier_id'] = 'No supplier price found for the selected supplier.'
                else:
                    has_errors = True
                    sub_errors['id'] = 'pk not found.'
                
                errors.append(sub_errors)


            if has_errors:
                transaction.set_rollback(True)
                data = errors
                return_status = status.HTTP_400_BAD_REQUEST
        return Response(data=data, status=return_status)


class POClubServicePOSupplierListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        data = []
        prices = GeneralServicePOSupplierPrice.objects.filter(
            general_service_po_supplier__general_service_po__po_club=po_club
        ).distinct('general_service_po_supplier__supplier')

        for price in prices:
            data.append({
                # 'general_service_po_supplier_price_id': price.id,
                'supplier_id': price.general_service_po_supplier.supplier.id,
                'supplier_name': price.general_service_po_supplier.supplier.name
            })
        return Response(data)
    

class ServicePOSupplierListView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, general_service_po_service_id):
        data = []
        general_service_po_service = get_object_or_404(GeneralServicePOService, pk=general_service_po_service_id)

        prices = GeneralServicePOSupplierPrice.objects.filter(
            entity_type=ContentType.objects.get_for_model(general_service_po_service.get_entity()),
            entity_id=general_service_po_service.entity_id
        )
        for price in prices:
            data.append({
                'general_service_po_supplier_price_id': price.id,
                'supplier_id': price.general_service_po_supplier.supplier.id,
                'supplier_name': price.general_service_po_supplier.supplier.name
            })
        return Response(data)
    

class ServicePODeliverySaveView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def validate_data(self, data, required_quantity, order_quantity, price_breakdown):
        errors = {
            'order_quantity_error': None,
            'delivery_errors': {},
            'total_quantity_error': None,
            'price_breakdown_errors': {}
        }
        has_errors = False
        total_quantity = 0

        for index, row in enumerate(data):
            planned_send_date = row.get('planned_send_date')
            actual_send_date = row.get('actual_send_date')
            quantity = row.get('quantity')
            general_service_po_supplier_price = row.get('general_service_po_supplier_price_id')

            if index not in errors['delivery_errors']:
                errors['delivery_errors'][index] = {}

            if not planned_send_date:
                has_errors = True
                errors['delivery_errors'][index]['planned_send_date'] = 'Select plan send date.'

            if not actual_send_date:
                has_errors = True
                errors['delivery_errors'][index]['actual_send_date'] = 'Select actual send date.'

            if not general_service_po_supplier_price:
                has_errors = True
                errors['delivery_errors'][index]['general_service_po_supplier_price_id'] = 'Select supplier.'

            if quantity is None:
                has_errors = True
                errors['delivery_errors'][index]['quantity'] = 'Enter quantity'
            else:
                try:
                    quantity = int(quantity)
                    total_quantity += quantity
                except ValueError:
                    has_errors = True
                    errors['delivery_errors'][index]['quantity'] = 'Quantity must be a number.'

        if order_quantity and total_quantity:
            if order_quantity < total_quantity:
                has_errors = True
                errors['total_quantity_error'] = 'Total quantity cannot exceed required quantity.'
            
        if not order_quantity:
            has_errors = True
            errors['order_quantity_error'] = 'Enter order quantity.'

        for index, row in enumerate(price_breakdown):
            price = row.get('price')
            price_currency = row.get('price_currency')
            lead_time = row.get('lead_time')

            if not price:
                if index not in errors['price_breakdown_errors']:
                    errors['price_breakdown_errors'][index] = {}
                has_errors = True
                errors['price_breakdown_errors'][index]['price'] = 'Enter price.'

            if not price_currency:
                if index not in errors['price_breakdown_errors']:
                    errors['price_breakdown_errors'][index] = {}
                has_errors = True
                errors['price_breakdown_errors'][index]['price_currency'] = 'Select price currency.'

            if not lead_time:
                if index not in errors['price_breakdown_errors']:
                    errors['price_breakdown_errors'][index] = {}
                has_errors = True
                errors['price_breakdown_errors'][index]['lead_time'] = 'Enter lead time.'

        return has_errors, errors
    
    def delete_deliveries(self, deleted_ids):
        GeneralServicePOServiceDelivery.objects.filter(id__in=deleted_ids).delete()

    def update_prices(self, price_breakdown):
        for index, row in enumerate(price_breakdown):
            general_service_po_supplier_price = get_object_or_404(GeneralServicePOSupplierPrice, pk=row['id'])
            general_service_po_supplier_price.price = row.get('price')
            general_service_po_supplier_price.price_currency = row.get('price_currency')
            general_service_po_supplier_price.lead_time = row.get('lead_time')
            general_service_po_supplier_price.save()

    def post(self, request, general_service_po_service_id):
        from marketing.models import PurchaseOrder
        from service_po.models import GeneralServicePOServiceDelivery, GeneralServicePODeliveryPOAllocation
        general_service_po_service = get_object_or_404(GeneralServicePOService, pk=general_service_po_service_id)
        purchase_order = get_object_or_404(PurchaseOrder, pk=request.data['purchase_order_breakdown']['purchase_order_id'])
        required_quantity = request.data['purchase_order_breakdown']['required_quantity']['quantity']
        order_quantity = request.data['purchase_order_breakdown']['order_quantity']['quantity']
        price_breakdown = request.data['price_breakdown']
        completed = request.data['completed']
        data = request.data.get('generalserviceposervicedelivery_set')
        has_errors, errors = self.validate_data(data, required_quantity, order_quantity, price_breakdown)

        if not has_errors:
            deleted_delivery_ids = request.data['deleted_delivery_ids']
            self.delete_deliveries(deleted_delivery_ids)
            general_service_po_service.completed = completed
            general_service_po_service.save()
            self.update_prices(price_breakdown)

            for row in data:
                general_service_po_supplier_price = get_object_or_404(GeneralServicePOSupplierPrice, pk=row['general_service_po_supplier_price_id'])
                print(general_service_po_supplier_price)
                if row['id']:
                    general_service_po_delivery = get_object_or_404(GeneralServicePOServiceDelivery, pk=row['id'])
                    general_service_po_delivery.general_service_po_supplier_price = general_service_po_supplier_price
                    general_service_po_delivery.save()
                else:
                    general_service_po_delivery = GeneralServicePOServiceDelivery.objects.create(
                        general_service_po_service=general_service_po_service,
                        general_service_po_supplier_price=general_service_po_supplier_price,
                        planned_send_date=row['planned_send_date'],
                        planned_send_quantity=row['quantity'],
                        planned_send_quantity_units=MaterialUnitHelper.PIECES_UNIT,
                        actual_send_date=row['actual_send_date'],
                        actual_send_date_quantity=row['quantity'],
                        actual_send_date_quantity_units=MaterialUnitHelper.PIECES_UNIT
                    )

                general_service_po_delivery_po_allocation, created = GeneralServicePODeliveryPOAllocation.objects.get_or_create(
                    general_service_po_service_delivery=general_service_po_delivery,
                    purchase_order=purchase_order
                )
                general_service_po_delivery_po_allocation.quantity = row['quantity']
                general_service_po_delivery_po_allocation.quantity_units = MaterialUnitHelper.PIECES_UNIT
                general_service_po_delivery_po_allocation.save()
            data = GeneralServicePOServicetSerializer(general_service_po_service, many=False).data
            http_response = Response(data)
        else:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response
    

class ServicePODeliveryDetailView(APIView):
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, general_service_po_service_id):
        general_service_po_service = get_object_or_404(GeneralServicePOService, pk=general_service_po_service_id)
        data = GeneralServicePOServicetSerializer(general_service_po_service, many=False).data
        return Response(data)


class GeneratePOClubServicePOsView(APIView):

    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        user = request.user
        data = {
            'status': 'success'
        }
        errors = {}
        has_errors = False
        return_status = status.HTTP_200_OK
        po_club_id = kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        service_po_generator = ServicePOGenerator(po_club, user)
        has_errors, errors = service_po_generator.validate_po_club_services()
        if has_errors:
            data = errors
            return_status = status.HTTP_400_BAD_REQUEST
        else:
            service_po_generator.create_service_pos()
        return Response(data=data, status=return_status)


class GeneratePOClubOtherCostServicePOsView(APIView):

    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        from service_po.models import GeneralServicePOSupplier
        data = {
            'status': 'success'
        }
        errors = {}
        has_errors = False
        return_status = status.HTTP_200_OK
        po_club_id = kwargs.get('general_service_po_supplier_id', None)
        general_service_po_supplier = get_object_or_404(GeneralServicePOSupplier, pk=po_club_id)
        service_po_generator = OtherCostServicePOGenerator(general_service_po_supplier)
        has_errors, errors = service_po_generator.validate_po_club_services(general_service_po_supplier)
        if has_errors:
            data = errors
            return_status = status.HTTP_400_BAD_REQUEST
        else:
            service_po_generator.create_service_pos(request.user)
        return Response(data=data, status=return_status)


class POClubServicePOListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ServicePOSerializer
    
    def get_queryset(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        wash_service_ct = ContentType.objects.get_for_model(POPackItemWashService)
        embellishment_ct = ContentType.objects.get_for_model(POPackItemEmbellishmentService)
        service_po_ids = GeneralServicePOSupplierPrice.objects.filter(
            general_service_po_supplier__general_service_po__po_club=po_club, entity_type__in=[wash_service_ct, embellishment_ct]
        ).values_list('general_service_po_supplier__service_po', flat=True)
        queryset = ServicePO.objects.filter(
            id__in=service_po_ids
        )
        return queryset


class POClubOtherCostServicePOListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = OtherCostServicePOSerializer

    def get_queryset(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        ct = ContentType.objects.get_for_model(OtherCostType)
        po_club = get_object_or_404(ActualPOClub, pk=po_club_id)
        service_po_ids = GeneralServicePOSupplierPrice.objects.filter(
            general_service_po_supplier__general_service_po__po_club=po_club, entity_type=ct
        ).values_list('general_service_po_supplier__service_po', flat=True)
        queryset = ServicePO.objects.filter(
            id__in=service_po_ids
        )
        return queryset


class ServicePOSendToApproveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = (MERCHANT_ROLE, )

    def post(self, request, service_po_id):
        from shared.models import Role
        from shared.approvals.constants.approval_choices import SERVICE_PO_APPROVAL
        from shared.permissions.roles import SERVICE_PO_APPROVER
        service_po = get_object_or_404(ServicePO, pk=service_po_id)
        role = Role.objects.get(name=SERVICE_PO_APPROVER)
        service_po_approver_users = role.users.all()
        service_po.create_approval(service_po_approver_users, request.user, SERVICE_PO_APPROVAL)
        return Response({'status': True})


class ServicePOListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ServicePOMainSerializer
    queryset = ServicePO.objects.all().order_by('-id')
    
    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(serializer.data, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data)

        return Response(serializer.data)


class ServicePOUpdateView(generics.UpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ServicePOUpdateSerializer
    queryset = ServicePO.objects.all().order_by('id')
    lookup_field = 'pk'


class ServicePODetailView(generics.RetrieveAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = ServicePODetailSerializer
    queryset = ServicePO.objects.all().order_by('id')
    lookup_field = 'pk'


class ServicePOMetadataView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = PaymentTermSerializer

    def get(self, request, *args, **kwargs):

        delivery_mode_types = SHIPPING_MODE_TYPES
        payment_method_types = PAYMENT_METHOD_TYPES
        costing_mode_types = COSTING_MODE_TYPES
        serialized_delivery_mode_types = self.serializer_class(delivery_mode_types, many=True)
        serialized_payment_method_types = self.serializer_class(payment_method_types, many=True)
        serialized_costing_mode_types = self.serializer_class(costing_mode_types, many=True)

        return Response({'delivery_mode_types': serialized_delivery_mode_types.data,
                         'payment_method_types': serialized_payment_method_types.data,
                         'costing_mode_types': serialized_costing_mode_types.data})