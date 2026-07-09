from django.shortcuts import render, get_object_or_404, get_list_or_404
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination
from shared.utils import get_object_or_none, get_attributes, set_attrs, search_qs_from_global_filter_v2
from shared.permissions.roles import MERCHANT_ADMIN_ROLE, MERCHANT_ROLE, ALL_USER_ROLES, IE_USER_ROLE, TRANSPORT_ADMIN_ROLE, TRANSPORT_USER_ROLE
from transport.serializers import *
from rest_framework import generics, views, status
from rest_framework.response import Response
from shared.permissions.view_permissions import HasPermission
from django.db import transaction
from django.db.models import Q
from supplier_po.models import SupplierDeliveryDate
from supplier_po.supplier_po.serializers import SupplierPODeliveryInvoiceSerializer
from datetime import timedelta
from django.utils import timezone
from materials.models import UserDefinedMaterial
from django.db import transaction
from marketing.models import ActualPOClub, PurchaseOrderDelivery, PurchaseOrderDeliveryPack, POPack
from transport.scripts.transport_cost_calculators import ConsolidateDeliveries
from transport.models import TransportType

class VehicleTypeCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer

    def post(self, request, *args, **kwargs):
        if len(VehicleType.objects.filter(name=request.data['name']))>0:
            data = Response(data={'name': request.data['name'] + ' already exist'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            vehicle_type_serializer = VehicleTypeSerializer(data=request.data)
            if vehicle_type_serializer.is_valid():
                with transaction.atomic():
                    has_error = False
                    vehicle_type = VehicleType.objects.create(**vehicle_type_serializer.validated_data)
                    for transport_type_id in request.data.get('transport_types', []):
                        transport_type = get_object_or_none(TransportType, {'pk': transport_type_id})
                        if not transport_type == None:
                            vehicle_type.transport_types.add(transport_type)
                        else:
                            has_error = True
                            transaction.set_rollback(True)
                    if has_error:
                        data = Response(data={'transport_type': 'details not found'}, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        data = Response(data=VehicleTypeSerializer(vehicle_type).data, status=status.HTTP_200_OK)
            else:
                data = Response(data=vehicle_type_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return data


class VehicleTypeListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if 'include_inactive' in self.request.GET:
            include_inactive = self.request.GET['include_inactive'].lower()
            if include_inactive == 'false':
                queryset = queryset.filter(active=True)
        else:
            queryset = queryset.filter(active=True)
        return queryset


class VehicleTypeEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer

    def put(self, request, *args, **kwargs):
        
        return super().put(request, *args, **kwargs)

class VehicleTypeMetaDataView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = VehicleTypeMetaDataSerializer

    def get(self, request, *args, **kwargs):
        data = {
            'volume_units': MaterialVolumeUnitHelper.ALL_VOLUME_UNITS,
            'weight_units': MaterialWeightUnitHelper.ALL_WEIGHT_UNITS,
            'currencies': CurrencyHelper.CURRENCY_CHOICES,
            'transport_types': TransportType.objects.all(),
        }

        return Response(self.serializer_class(data).data)



class TransportTypeCreateView(generics.CreateAPIView):
    
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportType.objects.all()
    serializer_class = TransportTypeSerializer


class TransportTypeListVIew(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportType.objects.all()
    serializer_class = TransportTypeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if 'include_inactive' in self.request.GET:
            include_inactive = self.request.GET['include_inactive'].lower()
            if include_inactive == 'false':
                queryset = queryset.filter(active=True)
        else:
            queryset = queryset.filter(active=True)
        return queryset


class TransportTypeEditVIew(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportType.objects.all()
    serializer_class = TransportTypeSerializer


class TransportExWorkChargeNameCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportExWorkChargeName.objects.all()
    serializer_class = TransportExWorkChargeNameSerializer


class TransportExWorkChargeNameListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportExWorkChargeName.objects.all()
    serializer_class = TransportExWorkChargeNameSerializer


class TransportExWorkChargeNameEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportExWorkChargeName.objects.all()
    serializer_class = TransportExWorkChargeNameSerializer


class TransportExWorkChargeMetaDataView(generics.GenericAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        data={}
        data['ex_work_charge_names'] = [{'id':ex_work_charge_name.id, 'name': str(ex_work_charge_name.name)} for ex_work_charge_name in TransportExWorkChargeName.objects.filter(active=True)] #TODO ex_work_charge_name.name should generate
        data['supplier_locations'] = [{'id': supplier_location.id, 'name': supplier_location.name}
                                       for supplier_location in SupplierLocation.objects.filter(active=True)]
        data['ports'] = [{'id': port.id, 'name': str(port.name)} for port in Port.objects.filter(active=True)]
        data['transport_modes']=[
            {
                'id': TRANSPORT_MODE_SEA,
                'name': 'SEA'
            },
            {
                'id': TRANSPORT_MODE_AIR,
                'name': 'AIR'
            }
        ]
        data['cost_types'] = [
            {
                'id': COST_TYPE_FIXED_CHARGE,
                'name': 'Fixed Charge'
            },
            {
                'id': COST_TYPE_RANGE_BASED,
                'name': 'Range Based'
            },
            {
                'id': COST_TYPE_UNIT_BASED,
                'name': 'Unit Based'
            }
        ]
        data['cost_types_range_based'] = [
            {
                'id': COST_TYPE_FIXED_CHARGE,
                'name': 'Fixed Charge'
            },
            {
                'id': COST_TYPE_UNIT_BASED,
                'name': 'Unit Based'
            }
        ]
        data['costing_units']=[
            {
                'id': COST_UNIT_PER_CBM,
                'name': 'Per CBM'
            },
            {
                'id': COST_UNIT_PER_KG,
                'name': 'Per Kg'
            },
            {
                'id': COST_UNIT_NUMBER_OF_CONTAINERS,
                'name': 'Number of Containers'
            }
        ]
        return Response(data=data, status=status.HTTP_200_OK)
    

class TransportExWorkChargeCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportExWorkCharge.objects.all()
    serializer_class = TransportExWorkChargeSerializer

    def post(self, request, *args, **kwargs):
        data = {}
        with transaction.atomic():
            api_mode='post'
            supplier_location_port_serializer = SupplierLocationPortSerializer(data= {'supplier_location': request.data['supplier_location'], 'port': request.data['port']})
            if supplier_location_port_serializer.is_valid():
                supplier_location_port = SupplierLocationPort.objects.get_or_create(**supplier_location_port_serializer.validated_data)[0]
                request.data['supplier_location_port'] = supplier_location_port.id
                request.data['costing_type'] = EX_WORKS_COSTING_TYPE
                cost = request.data.get('cost', None)
                request.data['amount'] = cost
                transport_ex_work_charge_serializer = TransportExWorkChargeSerializer(data=request.data)
                if transport_ex_work_charge_serializer.is_valid():
                    cost_type = request.data['cost_type']
                    
                    costing_units = request.data['costing_units']
                    ex_work_charge_ranges = request.data['ex_work_charge_ranges']
                    errors={}
                    if cost_type in [COST_TYPE_FIXED_CHARGE, COST_TYPE_UNIT_BASED]:
                        if cost == None:
                            errors['cost'] = ["Cannot be empty"]
                        if cost_type in [COST_TYPE_UNIT_BASED] and costing_units == None:
                            errors['costing_unit'] = ["Cannot be empty"]
                        if not ex_work_charge_ranges == []:
                            errors['ex_work_charge_ranges'] = ["Must be empty"]
                    if cost_type == None:
                        errors['cost_type'] = ["Cannot be empty"]
                    if errors == {}:
                        if api_mode == 'post':
                            transport_ex_work_charge = TransportExWorkCharge.objects.create(**transport_ex_work_charge_serializer.validated_data)
                        elif api_mode == 'put':
                            transport_ex_work_charge_instance = get_object_or_404(TransportFixedCharge, pk = kwargs['transport_ex_work_charge_id'])
                            transport_ex_work_charge = transport_ex_work_charge_serializer.update(instance=transport_ex_work_charge_instance, validated_data=transport_ex_work_charge_serializer.validated_data)
                        if cost_type in [COST_TYPE_RANGE_BASED]:
                            if not cost == None:
                                errors['cost'] = ["Must be empty"]
                            if not costing_units == None:
                                errors['costing_unit'] = ["Must be empty"]
                            if ex_work_charge_ranges == []:
                                errors['ex_work_charge_ranges'] = ["Cannot be empty"]
                            if errors == {}:
                                range_ids=[]
                                for ex_work_charge_range in ex_work_charge_ranges: #TODO validate the start_range with end_range in the ranges
                                    transport_ex_work_charge_range_serializer = TransportExWorkChargeRangeSerializer(data = {**ex_work_charge_range, 'ex_work_cost': transport_ex_work_charge.id})
                                    if transport_ex_work_charge_range_serializer.is_valid():
                                        if ex_work_charge_range['id'] == None:
                                                transport_ex_work_charge_range_serializer.save()
                                                range_ids.append(transport_ex_work_charge_range_serializer.data['id'])
                                        else:
                                            transport_ex_work_charge_range = get_object_or_none(TransportExWorkChargeRange, {'pk': ex_work_charge_range['id']})
                                            if transport_ex_work_charge_range == None:
                                                errors['transport_ex_work_charge_range'] = "Invalid pk \"" + str(ex_work_charge_range['id']) + "\" - object does not exist"
                                            else:
                                                range_ids.append(transport_ex_work_charge_range_serializer.update(instance=transport_ex_work_charge_range, validated_data=transport_ex_work_charge_range_serializer.validated_data).id)
                                    else:
                                        errors = {**errors,**transport_ex_work_charge_range_serializer.errors}            
                                if errors == {}:
                                    # TransportExWorkChargeRange.objects.filter(ex_work_cost = transport_ex_work_charge).exclude(pk__in = range_ids)
                                    data = {'data':TransportExWorkChargeSerializer(transport_ex_work_charge).data, 'status':status.HTTP_200_OK}
                        else:
                            data = {'data':TransportExWorkChargeSerializer(transport_ex_work_charge).data, 'status':status.HTTP_200_OK}
                    if not errors == {}:
                        transaction.set_rollback(True)
                        data = {'data':errors, 'status':status.HTTP_400_BAD_REQUEST}
                else:
                    transaction.set_rollback(True)
                    data = {'data':transport_ex_work_charge_serializer.errors, 'status':status.HTTP_400_BAD_REQUEST}
            else:
                transaction.set_rollback(True)
                data = {'data':supplier_location_port_serializer.errors, 'status':status.HTTP_400_BAD_REQUEST}
        # return data
        return Response(data=data['data'], status=data['status'])


class TransportExWorkChargeEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportExWorkCharge.objects.all()
    serializer_class = TransportExWorkChargeSerializer

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        data = {}
        with transaction.atomic():
            TransportExWorkChargeRange.objects.filter(pk__in = request.data['deleted_ex_work_charge_range_ids']).delete()
            api_mode='put'
            supplier_location_port_serializer = SupplierLocationPortSerializer(data= {'supplier_location': request.data['supplier_location'], 'port': request.data['port']})
            if supplier_location_port_serializer.is_valid():
                supplier_location_port = SupplierLocationPort.objects.get_or_create(**supplier_location_port_serializer.validated_data)[0]
                request.data['supplier_location_port'] = supplier_location_port.id
                cost = request.data.get('cost', None)
                request.data['amount'] = cost
                transport_ex_work_charge_serializer = TransportExWorkChargeSerializer(data=request.data)
                if transport_ex_work_charge_serializer.is_valid():
                    cost_type = request.data['cost_type']
                    
                    costing_units = request.data['costing_units']
                    ex_work_charge_ranges = request.data['ex_work_charge_ranges']
                    errors={}
                    if cost_type in [COST_TYPE_FIXED_CHARGE, COST_TYPE_UNIT_BASED]:
                        if cost == None:
                            errors['cost'] = ["Cannot be empty"]
                        if cost_type in [COST_TYPE_UNIT_BASED] and costing_units == None:
                            errors['costing_unit'] = ["Cannot be empty"]
                        if not ex_work_charge_ranges == []:
                            errors['ex_work_charge_ranges'] = ["Must be empty"]
                    if cost_type == None:
                        errors['cost_type'] = ["Cannot be empty"]
                    if errors == {}:
                        if api_mode == 'post':
                            transport_ex_work_charge = TransportExWorkCharge.objects.create(**transport_ex_work_charge_serializer.validated_data)
                        elif api_mode == 'put':
                            transport_ex_work_charge_instance = get_object_or_404(TransportExWorkCharge, pk = kwargs['pk'])
                            transport_ex_work_charge = transport_ex_work_charge_serializer.update(instance=transport_ex_work_charge_instance, validated_data=transport_ex_work_charge_serializer.validated_data)
                        if cost_type in [COST_TYPE_RANGE_BASED]:
                            if not cost == None:
                                errors['cost'] = ["Must be empty"]
                            if not costing_units == None:
                                errors['costing_unit'] = ["Must be empty"]
                            if ex_work_charge_ranges == []:
                                errors['ex_work_charge_ranges'] = ["Cannot be empty"]
                            if errors == {}:
                                range_ids=[]
                                for ex_work_charge_range in ex_work_charge_ranges: #TODO validate the start_range with end_range in the ranges
                                    transport_ex_work_charge_range_serializer = TransportExWorkChargeRangeSerializer(data = {**ex_work_charge_range, 'ex_work_cost': transport_ex_work_charge.id})
                                    if transport_ex_work_charge_range_serializer.is_valid():
                                        if ex_work_charge_range['id'] == None:
                                                transport_ex_work_charge_range_serializer.save()
                                                range_ids.append(transport_ex_work_charge_range_serializer.data['id'])
                                        else:
                                            transport_ex_work_charge_range = get_object_or_none(TransportExWorkChargeRange, {'pk': ex_work_charge_range['id']})
                                            if transport_ex_work_charge_range == None:
                                                errors['transport_ex_work_charge_range'] = ["Invalid pk \"" + str(ex_work_charge_range['id']) + "\" - object does not exist"]
                                            else:
                                                range_ids.append(transport_ex_work_charge_range_serializer.update(instance=transport_ex_work_charge_range, validated_data=transport_ex_work_charge_range_serializer.validated_data).id)
                                    else:
                                        errors = {**errors,**transport_ex_work_charge_range_serializer.errors}            
                                if errors == {}:
                                    data = {'data':TransportExWorkChargeSerializer(transport_ex_work_charge).data, 'status':status.HTTP_200_OK}
                        else:
                            data = {'data':TransportExWorkChargeSerializer(transport_ex_work_charge).data, 'status':status.HTTP_200_OK}
                    if not errors == {}:
                        transaction.set_rollback(True)
                        data = {'data':errors, 'status':status.HTTP_400_BAD_REQUEST}
                else:
                    transaction.set_rollback(True)
                    data = {'data':transport_ex_work_charge_serializer.errors, 'status':status.HTTP_400_BAD_REQUEST}
            else:
                transaction.set_rollback(True)
                data = {'data':supplier_location_port_serializer.errors, 'status':status.HTTP_400_BAD_REQUEST}
        # return data
        return Response(data=data['data'], status=data['status'])
    

class TransportExWorkChargeListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportExWorkCharge.objects.all()
    serializer_class = TransportExWorkChargeSerializer


class SupplierDeliveryListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = SupplierDeliveryDate.objects.filter(actual_delivery_date=None,
                                                   transport_tracking=None).exclude(confirmed_delivery_date=None).exclude(last_ex_mill_date=None).order_by('-last_ex_mill_date')
    serializer_class = SupplierDeliveryListSerializer


class TransportDeliveryDateTrackingCreateUpdateView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportDeliveryDateTracking.objects.all()
    serializer_class = TransportDeliveryDateTrackingSerializer
    change_request = False

    supplier_delivery_date_ids = []

    def post(self, request, *args, **kwargs):
        change_request = request.query_params.get('change_request', False)
        self.change_request = change_request
        change_reasons = request.data.pop('reasons', {})
        split_from_id = request.query_params.get('split_from', None)
        split_from = get_object_or_none(TransportDeliveryDateTracking, {'pk':split_from_id})
        errors = {}
        with transaction.atomic():
            if change_request:
                
                if self.is_valid_reasons(change_reasons):
                    split_from = self.save_reasons(split_from, change_reasons)
                    request.data['split_from'] = split_from.id
                else:
                    errors = {
                        'reasons': 'Invalid reasons found'
                    }
            if errors == {}:
                response = self.handle_transport_delivery_date_tracking(request.data)
                if response.status_code == status.HTTP_200_OK:
                    if split_from:
                        if not split_from.get_supplier_delivery_dates().exists():
                            split_from.active = False
                            split_from.save()
                else:
                    transaction.set_rollback(True)
            else:
                transaction.set_rollback(True)
                response = Response(data=errors, status=status.HTTP_400_BAD_REQUEST)
            
        return response
    
    def save_reasons(self, split_from, reasons):
        current_reasons = split_from.change_reasons
        if type(current_reasons) == list:
            current_reasons.append(reasons)
        else:
            current_reasons = [reasons]
        split_from.change_reasons = current_reasons
        split_from.save()
        return split_from
    
    def is_valid_reasons(self, reasons):
        validation_fields = ['transport_mode', 'local_port', 'foreign_port', 'freight_forwarder', 'merge_to_existing_transport']
        raturn_value = True
        return raturn_value
    
    def put(self, request, *args, **kwargs):
        transport_delivery_date_tracking_instance = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['pk'])
        with transaction.atomic():
            response = self.handle_transport_delivery_date_tracking(request.data, transport_delivery_date_tracking_instance)
            if not response.status_code == status.HTTP_200_OK:
                transaction.set_rollback(True)
        return response

    def handle_transport_delivery_date_tracking(self, transport_delivery_date_tracking_data, transport_delivery_date_tracking_instance=None):
        air_freight_fields = ['volume', 'volume_unit', 'weight', 'weight_unit']
        transport_mode = transport_delivery_date_tracking_data.get('transport_mode', None)
        split_from_id = transport_delivery_date_tracking_data.get('split_from', None)
        hanndled_supplier_delivery_date_ids = []
        if transport_mode == 'air':
            air_deliveries = transport_delivery_date_tracking_data.get('air_deliveries', [])
            air_transport_type = get_object_or_none(TransportType, {'name': 'Air'})
            transport_delivery_date_tracking_data['transport_types'] = [
                {
                    'transport_type': air_transport_type.id,
                    'name': 'Air Package',
                    'deliveries': air_deliveries
                }
            ]
            for field in air_freight_fields:
                transport_delivery_date_tracking_data['freight' + field] = transport_delivery_date_tracking_data.pop('air_' + field, None)
        has_errors = False
        errors = {}
        data = {}
        return_status = status.HTTP_200_OK
        supplier_delivery_date_objects = transport_delivery_date_tracking_data.pop('supplier_delivery_date_objects', [])
        self.supplier_delivery_date_ids = []
        supplier_delivery_dates = []
        for supplier_delivery_date in supplier_delivery_date_objects:
            supplier_delivery_date = get_object_or_404(
                SupplierDeliveryDate,
                pk=supplier_delivery_date.get('id', None)
            )
            if split_from_id:
                container_deliveries = supplier_delivery_date.containerdelivery_set.all().delete()
            supplier_delivery_dates.append(supplier_delivery_date)
            self.supplier_delivery_date_ids.append(supplier_delivery_date.id)

        transport_types_data = transport_delivery_date_tracking_data.pop('transport_types', [])
        if transport_mode == 'air':
            transport_type_data = []
        serializer = self.serializer_class(data=transport_delivery_date_tracking_data)
        transport_delivery_date_tracking = None
        if serializer.is_valid():
            if transport_delivery_date_tracking_instance:
                transport_delivery_date_tracking = serializer.update(instance=transport_delivery_date_tracking_instance, validated_data=serializer.validated_data)
            else:
                transport_delivery_date_tracking = serializer.save()
            transport_types_has_errors, transport_types_errors = self.handle_transport_types(transport_types_data, transport_delivery_date_tracking)
            if transport_types_has_errors:
                has_errors = True
                errors['transport_types'] = transport_types_errors
            data = TransportDeliveryDateTrackingListSerializer(transport_delivery_date_tracking).data
        else:
            has_errors = True
            errors = serializer.errors
        if has_errors:
            data = errors
            return_status = status.HTTP_400_BAD_REQUEST
        else:
            for supplier_delivery_date in supplier_delivery_dates:
                supplier_delivery_date.transport_tracking = transport_delivery_date_tracking
                supplier_delivery_date.save()

            for delivery_transport_type in transport_delivery_date_tracking.deliverytransporttype_set.all():
                for container_delivery in delivery_transport_type.containerdelivery_set.all():
                    if container_delivery.supplier_delivery_date:
                        hanndled_supplier_delivery_date_ids.append(container_delivery.supplier_delivery_date.id)

            for removed_supplier_delivery_date in transport_delivery_date_tracking.supplierdeliverydate_set.exclude(id__in=hanndled_supplier_delivery_date_ids):
                removed_supplier_delivery_date.transport_tracking = None
                removed_supplier_delivery_date.save()
            for supplier_delivery_date in supplier_delivery_dates:
                container_deliveries = transport_delivery_date_tracking.deliverytransporttype_set.filter(
                    containerdelivery__supplier_delivery_date=supplier_delivery_date)
                if not container_deliveries.exists():
                    errors['supplier_delivery_date'] = 'Please set container deliveries for all supplier delivery dates'
                    has_errors = True
                    break
        if has_errors:
            data = errors
            return_status = status.HTTP_400_BAD_REQUEST
        
        return Response(data=data, status=return_status)


    def handle_transport_types(self, transport_types, transport_delivery_date_tracking):
        has_errors = False
        errors = []
        handled_transport_type_ids = []
        for transport_type_data in transport_types:
            transport_type_errors = {}
            transport_type_id = transport_type_data.get('id', None)
            transport_type_data['transport_delivery_date_tracking'] = transport_delivery_date_tracking.id
            transport_type_instance = get_object_or_none(DeliveryTransportType, {'pk': transport_type_id})
            container_deliveries = transport_type_data.pop('deliveries', [])
            transport_type_serializer = DeliveryTransportTypeSerializer(data=transport_type_data)
            if transport_type_serializer.is_valid():
                if transport_type_instance:
                    transport_type = transport_type_serializer.update(instance=transport_type_instance, validated_data=transport_type_serializer.validated_data)
                else:
                    transport_type = transport_type_serializer.save()
                handled_transport_type_ids.append(transport_type.id)
                container_delivery_has_errors, container_delivery_errors = self.handle_container_deliveries(container_deliveries, transport_type)
                if container_delivery_has_errors:
                    has_errors = True
                    transport_type_errors['deliveries'] = container_delivery_errors
                else:
                    transport_type.calculate_volume()
            else:
                has_errors = True
                transport_type_errors = transport_type_serializer.errors
            errors.append(transport_type_errors)
        transport_delivery_date_tracking.deliverytransporttype_set.exclude(id__in=handled_transport_type_ids).delete()
        return has_errors, errors
    
    def handle_container_deliveries(self, container_deliveries, transport_type):
        has_errors = False
        errors = []
        handled_container_delivery_ids = []
        for container_delivery_data in container_deliveries:
            container_delivery_errors = {}
            container_delivery_data['delivery_transport_type'] = transport_type.id
            container_delivery_id = container_delivery_data.get('id', None)
            container_delivery_instance = get_object_or_none(ContainerDelivery, {'pk': container_delivery_id})
            container_delivery_serializer = ContainerDeliverySerializer(data=container_delivery_data)
            if container_delivery_serializer.is_valid():
                if container_delivery_instance:
                    handled_container_delivery = container_delivery_serializer.update(instance=container_delivery_instance, validated_data=container_delivery_serializer.validated_data)
                else:
                    handled_container_delivery = container_delivery_serializer.save()
                handled_container_delivery_ids.append(handled_container_delivery.id)
                if not handled_container_delivery.supplier_delivery_date.id in self.supplier_delivery_date_ids:
                    has_errors = True
                    container_delivery_errors['supplier_delivery_date'] = 'Please select a valid supplier delivery date'
            else:
                has_errors = True
                container_delivery_errors = container_delivery_serializer.errors
            errors.append(container_delivery_errors)
        transport_type.containerdelivery_set.exclude(id__in=handled_container_delivery_ids).delete()

        return has_errors, errors



class TransportDeliveryDateTrackingListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportDeliveryDateTracking.objects.filter(active=True, export__isnull=True).order_by('-id')
    serializer_class = TransportDeliveryDateTrackingListSerializer
    pagination_class = GeneralLargeResultsSetPagination

    DELIVERY_DUE_TODAY_COUNT_KEY = 'delivery_due_today_count'
    DELIVERY_DUE_IN_7_DAYS_COUNT_KEY = 'delivery_due_in_7_days_count'
    DELIVERY_PAST_DUE_COUNT_KEY = 'delivery_past_due_count'
    DELIVERY_COMPLETE_COUNT_KEY = 'delivery_complete_count'
    DELIVERY_IN_PROGRESS_COUNT_KEY = 'delivery_in_progress_count'

    def get_filters(self):

        current_date = timezone.now().date()
        today = current_date
        next_week = current_date + timedelta(days=100)

        filters = {
            self.DELIVERY_DUE_TODAY_COUNT_KEY: {'filter': {'expected_delivery_date': today},
                                                'exclude': {'state': TransportDeliveryDateTracking.DELIVERY_CANCELED_STATE}},
            self.DELIVERY_DUE_IN_7_DAYS_COUNT_KEY: {'filter': {'expected_delivery_date__gte': today,
                                                               'expected_delivery_date__lte': next_week},
                                                 'exclude': {'state': TransportDeliveryDateTracking.DELIVERY_CANCELED_STATE}},
            self.DELIVERY_PAST_DUE_COUNT_KEY: {'filter': {'expected_delivery_date__lt': today},
                                               'exclude': {'state': TransportDeliveryDateTracking.DELIVERY_CANCELED_STATE}},
            self.DELIVERY_COMPLETE_COUNT_KEY: {'filter': {'state': TransportDeliveryDateTracking.DELIVERY_COMPLETED_STATE},
                                               'exclude': {'actual_expected_delivery_date': None}},
            self.DELIVERY_IN_PROGRESS_COUNT_KEY: {'filter': {'state': TransportDeliveryDateTracking.DELIVERY_IN_PROGRESS_STATE},
                                                  'exclude': {}},
        }

        return filters

    def get_queryset(self):
        merge_from_id = self.request.query_params.get('merge_from_id', None)
        merge_from_transport_delivery_date_tracking = get_object_or_none(TransportDeliveryDateTracking, {'pk': merge_from_id})

        transport_type = self.request.GET.get('transport_type', None)
        filter_type = self.request.GET.get('filter_type', None)
        queryset = super().get_queryset()
        if merge_from_transport_delivery_date_tracking:
            queryset = queryset.filter(
                vendor_door_address__country=merge_from_transport_delivery_date_tracking.vendor_door_address.country,
                actual_vendor_shipping_date=None,
                active=True
            ).exclude(id=merge_from_transport_delivery_date_tracking.id)
        else:
            filters = self.get_filters()
            
            if transport_type:
                queryset = queryset.filter(type=transport_type)
            if filter_type and filter_type in filters:
                filter = filters[filter_type]
                queryset = queryset.filter(**filter['filter']).exclude(**filter['exclude'])
            paginator = self.pagination_class()
            queryset = paginator.paginate_queryset(queryset, self.request, view=self)
        return queryset


class TransportDeliveryDateTrackingDetailView(generics.RetrieveAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportDeliveryDateTracking.objects.all()
    serializer_class = TransportDeliveryDateTrackingListSerializer


class TransportDeliveryDateTrackingMetaDataView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportDeliveryDateTrackingMetaDataSerializer

    def get(self, request, *args, **kwargs):
        supplier_delivery_date_ids = request.data.get('supplier_delivery_date_ids', [])
        supplier_delivery_dates = SupplierDeliveryDate.objects.filter(id__in=supplier_delivery_date_ids)
        data = {
            'types': TransportDeliveryDateTracking.TRANSPORT_TYPE_CHOICE,
            'volume_units': MaterialVolumeUnitHelper.ALL_VOLUME_UNITS,
            'weight_units': MaterialWeightUnitHelper.ALL_WEIGHT_UNITS,
            'freight_types': TransportDeliveryDateTracking.TRANSPORT_MODE_CHOICE,
            'vendor_door_addresses': set([supplier_location.address for supplier_location in SupplierLocation.objects.all()]),
            'final_locations': set([plant.address for plant in Plant.objects.all()]),
            'transport_types': TransportType.objects.exclude(name__in=['AIR', 'Sri Lanka']),
            'foreign_ports': Port.objects.all(),
            'local_ports': set([plant.port_type for plant in Plant.objects.all()]),
            'plants': Plant.objects.all(),
            'distance_units': DistanceUnitHelper.ALL_DISTANCE_UNITS,
            'currencies': CurrencyHelper.CURRENCY_CHOICES,
            'freight_forwarders': FreightForwarder.objects.all(),
            'change_reasons': TransportChangeReason.objects.all(),
        }

        return Response(self.serializer_class(data).data)
    

class TransportFixedChargeNameCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeNameSerializer
    queryset = TransportFixedChargeName.objects.all()


class TransportFixedChargeNameDetailView(generics.RetrieveAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeNameSerializer
    queryset = TransportFixedChargeName.objects.all()


class TransportFixedChargeNameUpdateView(generics.UpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeNameSerializer
    queryset = TransportFixedChargeName.objects.all()


class TransportFixedChargeNameListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeNameSerializer
    queryset = TransportFixedChargeName.objects.all()


class TransportFixedChargeCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeSerializer
    queryset = TransportFixedCharge.objects.all()


class TransportFixedChargeDetailView(generics.RetrieveAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeSerializer
    queryset = TransportFixedCharge.objects.all()


class TransportFixedChargeListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeSerializer
    queryset = TransportFixedCharge.objects.all()


class TransportFixedChargeUpdateView(generics.UpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeSerializer
    queryset = TransportFixedCharge.objects.all()


class TransportFixedChargeMetaDataView(generics.GenericAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportFixedChargeMetaDataSerializer

    def get(self, request, *args, **kwargs):
        data = {
            'fixed_charge_names': TransportFixedChargeName.objects.all(),
            'costing_types': AbstractTransportCharge.COSTING_TYPE_CHOICE,
            'trade_types': AbstractTransportCharge.TRADE_TYPE_CHOICE,
            'transport_types': TransportType.objects.all(),
            'ports': Port.objects.all(),
            'currencies': CurrencyHelper.CURRENCY_CHOICES,
        }
        return Response(self.serializer_class(data).data)


class TransportPerUnitChargeNameCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeNameSerializer
    queryset = TransportPerUnitChargeName.objects.all()


class TransportPerUnitChargeNameDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeNameSerializer
    queryset = TransportPerUnitChargeName.objects.all()


class TransportPerUnitChargeNameListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeNameSerializer
    queryset = TransportPerUnitChargeName.objects.all()


class TransportPerUnitChargeNameUpdateView(generics.UpdateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeNameSerializer
    queryset = TransportPerUnitChargeName.objects.all()


class TransportPerUnitChargeCreateView(generics.CreateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeSerializer
    queryset = TransportPerUnitCharge.objects.all()


class TransportPerUnitChargeDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeSerializer
    queryset = TransportPerUnitCharge.objects.all()


class TransportPerUnitChargeListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeSerializer
    queryset = TransportPerUnitCharge.objects.all()


class TransportPerUnitChargeUpdateView(generics.UpdateAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeSerializer
    queryset = TransportPerUnitCharge.objects.all()


class TransportPerUnitChargeMetaDataView(generics.GenericAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportPerUnitChargeMetaDataSerializer

    def get(self, request, *args, **kwargs):
        data = {
            'per_unit_charge_names': TransportPerUnitChargeName.objects.all(),
            'costing_types': AbstractTransportCharge.COSTING_TYPE_CHOICE,
            'trade_types': AbstractTransportCharge.TRADE_TYPE_CHOICE,
            'transport_types': TransportType.objects.all(),
            'ports': Port.objects.all(),
            'currencies': CurrencyHelper.CURRENCY_CHOICES,
        }
        return Response(self.serializer_class(data).data)   


class TransportDeliveryCountsView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):

        queryset = TransportDeliveryDateTracking.objects.filter(active=True, export__isnull=True)

        filters = TransportDeliveryDateTrackingListView().get_filters()
        data = {
            'supplier_delivery_count': SupplierDeliveryDate.objects.filter(actual_delivery_date=None,
                                                   transport_tracking=None).exclude(confirmed_delivery_date=None).exclude(last_ex_mill_date=None).order_by('id').count()
        }
        
        for key, filter in filters.items():
                data[key] = queryset.filter(**filter['filter']).exclude(**filter['exclude']).count()
        data['all_deliveries_count'] = queryset.count()

        return Response(data)
    

class TransportDeliveryDateTrackingStateChangeView(views.APIView):
    
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        return_status = status.HTTP_200_OK
        data = {}
        new_state = request.GET.get('state', None)
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        has_error, errors, transport_delivery_date_tracking = transport_delivery_date_tracking.move_to_state(new_state)
        if has_error:
            data['errors'] = errors
            return_status = status.HTTP_400_BAD_REQUEST
        else:
            data = TransportDeliveryDateTrackingListSerializer(transport_delivery_date_tracking).data
        return Response(data=data, status=return_status)
    

class TransportDeliveryDateTrackingInvoiceListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = SupplierPODeliveryInvoiceSerializer

    def get_queryset(self):
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=self.kwargs.get('delivery_tracking_id', None))
        return transport_delivery_date_tracking.get_invoices()
    

class TransportDeliveryDateTrackingChargeListView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        charge_type = request.GET.get('charge_type', None)
        delivery_transport_type_id = request.GET.get('delivery_transport_type_id', None)
        data = []
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        combined_charges = []
        transport_type_charges = []
        if charge_type == AbstractDeliveryCharge.COMBINED_CHARGE:
            combined_charges = DeliveryCombinedCharge.objects.filter(transport_delivery_date_tracking=transport_delivery_date_tracking)
            
        elif charge_type == AbstractDeliveryCharge.TRANSPORT_TYPE_CHARGE:
            transport_type_charges = DeliveryTransportTypeCharge.objects.filter(delivery_transport_type__transport_delivery_date_tracking=transport_delivery_date_tracking)
            if delivery_transport_type_id:
                transport_type_charges = transport_type_charges.filter(delivery_transport_type__id=delivery_transport_type_id)
        
        else:
            combined_charges = DeliveryCombinedCharge.objects.filter(transport_delivery_date_tracking=transport_delivery_date_tracking)
            transport_type_charges = DeliveryTransportTypeCharge.objects.filter(delivery_transport_type__transport_delivery_date_tracking=transport_delivery_date_tracking)

        combined_charge_serializer = TransportDeliveryDateTrackingCombinedChargeSerializer(combined_charges, many=True)
        data.extend(combined_charge_serializer.data)
        transport_type_charge_serializer = TransportDeliveryDateTrackingTypeChargeSerializer(transport_type_charges, many=True)
        data.extend(transport_type_charge_serializer.data)

        return Response(data=data, status=status.HTTP_200_OK)
    

class TransportDeliveryDateTrackingChargeUpdateCreateView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def post(self, request, *args, **kwargs):
        data = []
        errors = []
        has_errors = False
        return_status = status.HTTP_200_OK

        charge_type_classes = {
            AbstractDeliveryCharge.COMBINED_CHARGE:
            {
                'model': DeliveryCombinedCharge,
                'serializer': TransportDeliveryDateTrackingCombinedChargeSerializer
            },
            AbstractDeliveryCharge.TRANSPORT_TYPE_CHARGE: {
                'model': DeliveryTransportTypeCharge,
                'serializer': TransportDeliveryDateTrackingTypeChargeSerializer
            },
        }

        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        charge_type = request.GET.get('charge_type', None)
        delivery_transport_type_id = request.GET.get('delivery_transport_type_id', None)
        deleted_charge_ids = request.data.get('deleted_charge_ids', [])
        charges = request.data.get('charges', [])
        if charge_type == AbstractDeliveryCharge.TRANSPORT_TYPE_CHARGE:
            delivery_transport_type = get_object_or_404(DeliveryTransportType,
                                                        pk=delivery_transport_type_id,
                                                        transport_delivery_date_tracking=transport_delivery_date_tracking)

        if charge_type in charge_type_classes:
            model = charge_type_classes[charge_type]['model']
            serializer = charge_type_classes[charge_type]['serializer']
            with transaction.atomic():
                for charge_data in charges:
                    charge_data['updated_by'] = request.user.username
                    if charge_type == AbstractDeliveryCharge.TRANSPORT_TYPE_CHARGE:
                        charge_data['delivery_transport_type'] = delivery_transport_type.id
                    elif charge_type == AbstractDeliveryCharge.COMBINED_CHARGE:
                        charge_data['transport_delivery_date_tracking'] = transport_delivery_date_tracking.id
                    charge_serializer = serializer(data=charge_data)
                    if charge_serializer.is_valid():
                        if charge_data.get('id', None):
                            charge_instance = get_object_or_none(model, {'pk': charge_data['id']})
                            if charge_instance:
                                data.append(charge_serializer.update(instance=charge_instance, validated_data=charge_serializer.validated_data))
                                errors.append({})
                            else:
                                has_errors = True
                                errors.append({'id': 'Invalid id'})
                        else:
                            data.append(charge_serializer.save(created_by=request.user.username))
                            errors.append({})
                    else:
                        has_errors = True
                        errors.append(charge_serializer.errors)
                if has_errors:
                    transaction.set_rollback(True)
                else:
                    model.objects.filter(id__in=deleted_charge_ids).delete()
        else:
            has_errors = True
            errors.append({'charge_type': 'Invalid charge type'})

        if has_errors:
            return_status = status.HTTP_400_BAD_REQUEST
            data = errors
        else:
            data = serializer(data, many=True).data
            
        return Response(data=data, status=return_status)


class TransportDeliveryDateTrackingTypeChargeCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportDeliveryDateTrackingTypeChargeSerializer
    queryset = DeliveryTransportTypeCharge.objects.all()

    def post(self, request, *args, **kwargs):
        data = []
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        transport_type = get_object_or_404(TransportType, pk=kwargs['transport_type_id'])
        delivery_transport_types = get_list_or_404(DeliveryTransportType, transport_delivery_date_tracking=transport_delivery_date_tracking, transport_type=transport_type)
        
        request.data['created_by'] = request.user.username
        request.data['updated_by'] = request.user.username
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            for delivery_transport_type in delivery_transport_types:
                data.append(serializer.save(delivery_transport_type=delivery_transport_type))
            data = self.serializer_class(data, many=True).data
            return_status = status.HTTP_200_OK
        else:
            data = serializer.errors
            return_status = status.HTTP_400_BAD_REQUEST
        return Response(data=data, status=return_status)


class TransportDeliveryDateTrackingTypeChargeCopyView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def post(self, request, *args, **kwargs):
        data = []
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        copy_to_delivery_transport_type = get_object_or_404(DeliveryTransportType,
                                                            pk=request.data.get('copy_to_delivery_transport_type_id', None),
                                                            transport_delivery_date_tracking=transport_delivery_date_tracking)
        delivery_transport_type_charges = DeliveryTransportTypeCharge.objects.filter(id__in=request.data.get('transport_type_charge_ids', []))
        for delivery_transport_type_charge in delivery_transport_type_charges:
            new_delivery_transport_type_charge, created = DeliveryTransportTypeCharge.objects.get_or_create(
                charge_name=delivery_transport_type_charge.charge_name,
                copied_from_entity=delivery_transport_type_charge.copied_from_entity,
                copied_from_entity_id=delivery_transport_type_charge.copied_from_entity_id,
                delivery_transport_type=copy_to_delivery_transport_type,
            )
            new_delivery_transport_type_charge.updated_by = request.user.username
            if created:
                new_delivery_transport_type_charge.created_by = request.user.username
            copy_fields = ['amount', 'amount_currency', 'calculated_amount', 'calculated_amount_currency']
            set_attrs(new_delivery_transport_type_charge,
                      **{field: delivery_transport_type_charge.__getattribute__(field) for field in copy_fields})
            new_delivery_transport_type_charge.save()


        return Response(data=data, status=status.HTTP_200_OK)
    

class TransportDeliveryDateTrackingTransportTypeListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = DeliveryTransportTypeSerializer

    def get_queryset(self):
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=self.kwargs.get('delivery_tracking_id', None))
        return DeliveryTransportType.objects.filter(transport_delivery_date_tracking=transport_delivery_date_tracking)
    

class TransportPOClubPlanActualView(views.APIView):
    
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get_plan_events(self, supplier_delivery_date):
        transport_tracking = supplier_delivery_date.transport_tracking
        plan_events = []
        if transport_tracking:
            plan_events = [
                {
                    'event_name': 'Supplier Door',
                    'event_type': transport_tracking.vendor_door_address.get_verbose_address() if transport_tracking.vendor_door_address else None,
                    'event_date': transport_tracking.vendor_door_expected_shipping_date,
                },
                {
                    'event_name': 'Supplier Port',
                    'event_type': transport_tracking.foreign_port.name if transport_tracking.foreign_port else None,
                    'event_date': transport_tracking.foreign_port_expected_date,
                },
                {
                    'event_name': 'Our Port',
                    'event_type': transport_tracking.local_port.name if transport_tracking.local_port else None,
                    'event_date': transport_tracking.local_port_expected_date,
                },
                {
                    'event_name': 'Our Door',
                    'event_type': supplier_delivery_date.get_plant().address if supplier_delivery_date.get_plant() else None,
                    'event_date': supplier_delivery_date.confirmed_delivery_date,
                }
            ]
        return plan_events
    
    def get_actual_events(self, transport_tracking):
        actual_events = []
        if transport_tracking:
            actual_events = [
                {
                    'event_name': 'Supplier Door',
                    'event_type': transport_tracking.vendor_door_address.get_verbose_address() if transport_tracking.vendor_door_address else None,
                    'event_date': transport_tracking.actual_vendor_shipping_date,
                    'delayed': transport_tracking.is_supplier_door_delayed(),
                    'number_of_delayed_days': transport_tracking.supplier_door_delayed_days(),
                    'delay_reason': transport_tracking.vendor_shipping_date_delay_reason,
                },
                {
                    'event_name': 'Supplier Port',
                    'event_type': transport_tracking.foreign_port.name if transport_tracking.foreign_port else None,
                    'event_date': transport_tracking.actual_foreign_port_date,
                    'delayed': transport_tracking.is_supplier_port_delayed(),
                    'number_of_delayed_days': transport_tracking.supplier_port_delayed_days(),
                    'delay_reason': transport_tracking.foreign_port_date_delay_reason,
                },
                {
                    'event_name': 'Our Port',
                    'event_type': transport_tracking.local_port.name if transport_tracking.local_port else None,
                    'event_date': transport_tracking.actual_local_port_date,
                    'delayed': transport_tracking.is_our_port_delayed(),
                    'number_of_delayed_days': transport_tracking.our_port_delayed_days(),
                    'delay_reason': transport_tracking.local_port_date_delay_reason,
                },
                {
                    'event_name': 'Our Door',
                    'event_type': transport_tracking.get_final_locations(),
                    'event_date': transport_tracking.actual_expected_delivery_date,
                    'delayed': transport_tracking.is_our_door_delayed(),
                    'number_of_delayed_days': transport_tracking.our_door_delayed_days(),
                    'delay_reason': transport_tracking.expected_delivery_date_delay_reason,
                }
            ]
        return actual_events

    def get_actual_delivery_data(self, transport_tracking, po_club):
        actual_deliveries = []
        actual_value = 0.00
        # po_club = supplier_delivery_date.general_po_supplier.general_po.po_club
        # transport_tracking = supplier_delivery_date.transport_tracking
        if transport_tracking:
            actual_delivery_dates = transport_tracking.supplierdeliverydate_set.filter(general_po_supplier__general_po__po_club=po_club)
            actual_delivery_data = {
                    'actual_delivery_name': transport_tracking.transport_delivery_date_tracking_display_number,
                    'actual_delivery_mode': transport_tracking.get_transport_mode_display(),
                    'actual_events': self.get_actual_events(transport_tracking),
                    'actual_materials': [],
                    'delivery_chargers': self.get_delivery_combined_chargers(transport_tracking),
                }
            for actual_delivery_date in actual_delivery_dates:
                
                actual_delivery_date_quanties = actual_delivery_date.supplierdeliverydatequantity_set.filter(transport_quantity__gt=0)
                for actual_delivery_quantity in actual_delivery_date_quanties:
                    actual_value += actual_delivery_quantity.calculate_transport_quantity_price()
                    actual_delivery_data['actual_materials'].append({
                        'name': actual_delivery_quantity.material_display_name,
                        'quantity': actual_delivery_quantity.transport_quantity,
                        'quantity_units': actual_delivery_quantity.transport_quantity_units,
                        'quantity_units_display': actual_delivery_quantity.get_transport_quantity_units_display(),
                        'headers': UserDefinedMaterial.get_material_headers(actual_delivery_quantity.material_supplier.supplier_material.customer_brand_material.material_detail.generic_material.user_material.name),
                        'attributes': actual_delivery_quantity.material_supplier.supplier_material.customer_brand_material.get_attributes(),
                    })
            actual_deliveries.append(actual_delivery_data)
        
        return actual_deliveries, actual_value
    
    def get_delivery_combined_chargers(self, transport_tracking):
        charge_details = {
            'supplier_door_to_supplier_port_total': {
                'amount': 0,
                'amount_currency': None,
                'amount_currency_display': None
            },
            'supplier_door_to_supplier_port': [],
            'supplier_port_to_our_port_total': {
                'amount': 0,
                'amount_currency': None,
                'amount_currency_display': None
            },
            'supplier_port_to_our_port': [],
            'our_port_to_our_door_total': {
                'amount': 0,
                'amount_currency': None,
                'amount_currency_display': None
            },
            'our_port_to_our_door': []
        }
        combined_charges = transport_tracking.deliverycombinedcharge_set.all()
        charges_keywords = {
            'exw': 'supplier_door_to_supplier_port',
            'fob': 'supplier_port_to_our_port',
            'cif': 'our_port_to_our_door'
        }
        for combined_charge in combined_charges:
            combined_charge_detail = {}
            combined_charge_detail["name"] = combined_charge.charge_name
            combined_charge_detail["amount"] = combined_charge.calculated_amount
            combined_charge_detail["amount_currency"] = combined_charge.calculated_amount_currency
        
        containers = transport_tracking.deliverytransporttype_set.all()
        for container in containers:
            for container_charge in container.deliverytransporttypecharge_set.all():
                charge_entity = container_charge.get_copied_from_entity_object()
                if charge_entity:
                    stage = charges_keywords.get(charge_entity.costing_type, None)
                    if stage:
                        charge_detail = {
                            'name': container_charge.charge_name,
                            'amount': container_charge.calculated_amount,
                            'amount_currency': container_charge.calculated_amount_currency
                        }
                        self.add_charge(stage, charge_details, charge_detail)
                        charge_details['{}_total'.format(stage)]['amount'] += container_charge.calculated_amount
        print(charge_details)
        return charge_details
    
    def add_charge(self, stage, charge_details, charge_detail):
        found = False
        for data in charge_details[stage]:
            if data['name'] == charge_detail['name']:
                data['amount'] += charge_detail['amount']
                found = True
                break
        if not found:
            charge_details[stage].append(charge_detail)


    def get_plan_delivery_data(self, supplier_delivery_date):
        plan_delivery_data = {
            'plan_delivery_name': supplier_delivery_date.display_number,
            'plan_delivery_mode': supplier_delivery_date.general_po_supplier.supplier.get_shipping_mode_display(),
            'country': get_attributes(supplier_delivery_date, 'general_po_supplier__supplier__supplier_location__country__name'),
            'incoterms_type': supplier_delivery_date.general_po_supplier.supplier.get_costing_mode_display(),
            'plan_value': 0.00,
            'actual_value': 0.00,
            'supplier': supplier_delivery_date.general_po_supplier.supplier.id,
            'supplier_name': supplier_delivery_date.general_po_supplier.supplier.name,
            'plan_events': self.get_plan_events(supplier_delivery_date),
            'plan_materials': [],
            # 'actual_deliveries': [],
        }

        plan_delivery_quantities = supplier_delivery_date.supplierdeliverydatequantity_set.all()
        for plan_delivery_quantity in plan_delivery_quantities:
            plan_delivery_data['plan_value'] += plan_delivery_quantity.calculate_quantity_price()
            plan_delivery_data['plan_value'] = round(plan_delivery_data['plan_value'], 2)
            plan_delivery_data['plan_materials'].append({
                'id': plan_delivery_quantity.id,
                'name': plan_delivery_quantity.material_display_name,
                'quantity': plan_delivery_quantity.proforma_invoice_quantity,
                'quantity_units': plan_delivery_quantity.proforma_invoice_quantity_units,
                'quantity_units_display': plan_delivery_quantity.get_proforma_invoice_quantity_units_display(),
                'headers': UserDefinedMaterial.get_material_headers(plan_delivery_quantity.material_supplier.supplier_material.customer_brand_material.material_detail.generic_material.user_material.name),
                'attributes': plan_delivery_quantity.material_supplier.supplier_material.customer_brand_material.get_attributes(),
            })
        # actual_deliveries, actual_value = self.get_actual_delivery_data(supplier_delivery_date)
        # plan_delivery_data['actual_value'] = round(actual_value, 2)
        # plan_delivery_data['actual_deliveries'] = actual_deliveries
        return plan_delivery_data

    def get(self, request, *args, **kwargs):
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=kwargs.get('po_club_id', None))
        material_type = request.GET.get('material_type', None)
        supplier_delivery_dates = SupplierDeliveryDate.objects.filter(general_po_supplier__general_po__po_club__id=kwargs['po_club_id']).exclude(transport_tracking=None)
        if material_type in dict(UserDefinedMaterial.USER_DEFINED_MATERIAL_TYPES):
            supplier_delivery_dates = supplier_delivery_dates.filter(supplierdeliverydatequantity__material_supplier__supplier_inquiry_detail__supplier_inquiry__customer_brand_material__material_detail__generic_material__user_material__category=material_type).distinct()
        transport_trackings = list(set([supplier_delivery_date.transport_tracking for supplier_delivery_date in supplier_delivery_dates if supplier_delivery_date.transport_tracking]))
        print(transport_trackings)
        for transport_tracking in transport_trackings:
            transport_tracking_data = {"id": transport_tracking.id}
            plan_deliveries = []
            for supplier_delivery_date in transport_tracking.get_supplier_delivery_dates():
                print('supplier delivery date', supplier_delivery_date.id)
                plan_deliveries.append(self.get_plan_delivery_data(supplier_delivery_date))
            transport_tracking_data["plan_deliveries"] = plan_deliveries

            actual_deliveries, actual_value = self.get_actual_delivery_data(transport_tracking, po_club)
            transport_tracking_data['actual_value'] = round(actual_value, 2)
            transport_tracking_data['actual_deliveries'] = actual_deliveries
            data.append(transport_tracking_data)
        # suppliers = set([supplier_delivery_date.general_po_supplier.supplier for supplier_delivery_date in supplier_delivery_dates])

        # for supplier in suppliers:
        #     plan_delivery_dates = supplier_delivery_dates.filter(general_po_supplier__supplier=supplier)
        #     supplier_data = {
        #         'supplier': supplier.name,
        #         'supplier_id': supplier.id,
        #         'plan_deliveries': [],
        #     }

        #     for plan_delivery_date in plan_delivery_dates:
        #         plan_delivery_data = self.get_plan_delivery_data(plan_delivery_date)
                
        #         supplier_data['plan_deliveries'].append(plan_delivery_data)

        #     data.append(supplier_data)
        return Response(data=data, status=status.HTTP_200_OK)
    

class TransportPOClubPendingDeliveriesView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = SupplierDeliveryListSerializer
    queryset = SupplierDeliveryDate.objects.filter(transport_tracking=None)

    def get_queryset(self):
        po_club_id = self.kwargs.get('po_club_id', None)
        # queryset = SupplierDeliveryDate.objects.filter(transport_tracking=None)
        queryset = SupplierDeliveryDate.objects.filter(actual_delivery_date=None,
                                                   transport_tracking=None).exclude(confirmed_delivery_date=None).exclude(last_ex_mill_date=None).order_by('-last_ex_mill_date')
        if po_club_id:
            queryset = queryset.filter(general_po_supplier__general_po__po_club__id=po_club_id)
        return queryset


class FreightForwarderListCreateView(generics.ListCreateAPIView):
    
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderSerializer
    queryset = FreightForwarder.objects.all()

    def post(self, request, *args, **kwargs):
        response = None
        NEW_FORWARDER = 'new_forwarder'
        forwarder_type = request.query_params.get('forwarder_type', None)
        request.data['created_by'] = request.user.username
        request.data['updated_by'] = request.user.username
        if forwarder_type == NEW_FORWARDER:
            request.data['supplier_type'] = Supplier.FREIGHT_FORWARDER_SUPPLIER_TYPE
            serializer = SupplierSerializer(data=request.data)
            if serializer.is_valid():
                supplier = serializer.save()
                request.data['supplier'] = supplier.id
                response = super().post(request, *args, **kwargs)
            else:
                response = Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            response = super().post(request, *args, **kwargs)
        return response


class FreightForwarderEditView(generics.RetrieveUpdateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderSerializer
    queryset = FreightForwarder.objects.all()


class FreightForwarderPortListCreateView(generics.ListCreateAPIView):
    
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderPortSerializer
    queryset = FreightForwarderPort.objects.all()

    def get_queryset(self):
        queryset = FreightForwarderPort.objects.filter(freight_forwarder__id=self.kwargs['freight_forwarder_id'])
        return queryset

    def post(self, request, *args, **kwargs):
        freight_forwarder = get_object_or_404(FreightForwarder,
                                              pk=kwargs['freight_forwarder_id'])
        data = []
        has_errors = False
        return_status = status.HTTP_200_OK
        errors = {}
        ports = request.data.get('ports', [])
        if ports == []:
            errors['ports'] = ["This field cannot be empty"]
            has_errors = True
        else:
            errors['ports'] = []
            with transaction.atomic():
                for port in ports:
                    freight_forwarder_port_data = {
                        'freight_forwarder': freight_forwarder.id,
                        'created_by': request.user.username,
                        'updated_by': request.user.username,
                        'port': port
                    }
                    serializer = self.serializer_class(data=freight_forwarder_port_data)
                    if serializer.is_valid():
                        errors['ports'].append({})
                        data.append(serializer.save())
                    else:
                        errors['ports'].append(serializer.errors)
                        has_errors = True
                if has_errors:
                    transaction.set_rollback(True)
        if has_errors:
            data = errors
            return_status = status.HTTP_400_BAD_REQUEST
        else:
            data = self.serializer_class(data, many=True).data
        return Response(data=data, status=return_status)


class FreightForwarderPortDeleteView(generics.DestroyAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderPortSerializer
    queryset = FreightForwarderPort.objects.all()

    def delete(self, request, *args, **kwargs):
        freight_forwarder_port = get_object_or_404(
            FreightForwarderPort,
            freight_forwarder=kwargs.get('freight_forwarder_id', None),
            port=kwargs.get('port_id', None)
        )
        data = freight_forwarder_port.delete()
        return Response(data=data)


class FreightForwarderPortCalanderCreateView(generics.CreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderPortCalanderSerializer
    queryset = FreightForwarderPortCalander.objects.all()

    def post(self, request, *args, **kwargs):
        freight_forwarder_port = get_object_or_404(FreightForwarderPort,
                                                   freight_forwarder__id=kwargs['freight_forwarder_id'],
                                                   port__id=kwargs['port_id'])
        request.data['freight_forwarder_port'] = freight_forwarder_port.id
        request.data['created_by'] = request.user.username
        request.data['updated_by'] = request.user.username
        return super().post(request, *args, **kwargs)


class FreightForwarderPortCalanderDeleteView(generics.DestroyAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderPortCalanderSerializer
    queryset = FreightForwarderPortCalander.objects.all()


class FreightForwarderPortCalanderListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderPortCalanderSerializer
    queryset = FreightForwarderPortCalander.objects.all()

    def get_queryset(self):
        return FreightForwarderPortCalander.objects.filter(
            freight_forwarder_port__freight_forwarder__id=self.kwargs['freight_forwarder_id'],
            freight_forwarder_port__port__id=self.kwargs['port_id']
        )


class FreightForwarderWarehouseListCreateView(generics.ListCreateAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderWarehouseSerialiser
    queryset = FreightForwarderWarehouse.objects.all()

    def get_queryset(self):
        return FreightForwarderWarehouse.objects.filter(
            freight_forwarder__id=self.kwargs['freight_forwarder_id']
        )

    def post(self, request, *args, **kwargs):
        freight_forwarder = get_object_or_404(FreightForwarder,
                                              pk=kwargs['freight_forwarder_id'])
        request.data['freight_forwarder'] = freight_forwarder.id
        request.data['created_by'] = request.user.username
        request.data['updated_by'] = request.user.username
        return super().post(request, *args, **kwargs)


class FreightForwarderWarehouseEditView(generics.RetrieveUpdateDestroyAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = FreightForwarderWarehouseSerialiser
    queryset = FreightForwarderWarehouse.objects.all()



class DeliveryTransportTypeListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = DeliveryTransportTypeListSerializer
    queryset = DeliveryTransportType.objects.all()

    def get_queryset(self):
        vehicle_type = self.request.GET.get('vehicle_type', None)
        queryset = DeliveryTransportType.objects.filter(deliverytransporttypevehicle__isnull=True)
        if vehicle_type == 'lcl':
            queryset = queryset.filter(transport_type__name__in=['LCL', 'Air'])
        else:
            queryset = queryset.exclude(transport_type__name__in=['LCL', 'Air'])
        return queryset
    

class DeliveryTransportTypeVehicleCreateView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = DeliveryTransportTypeVehicle.objects.all()

    created_by = None
    updated_by = None
    normalized_total_volume = 0.00
    change_request = False
    handled_delivery_transport_type_ids = []
    delivery_transport_type_ids = []

    def post(self, request, *args, **kwargs):
        change_request = request.query_params.get('change_request', False)
        self.change_request = change_request
        change_reasons = request.data.pop('reasons', {})
        split_from_id = request.query_params.get('split_from', None)
        split_from = get_object_or_none(TransportVehicleTracking, {'pk':split_from_id})
        data = {}
        errors = {
            'volume_mismatch': False,
            'vehicle_types': []
        }
        self.created_by = request.user.username
        self.updated_by = request.user.username
        return_status = status.HTTP_200_OK
        delivery_transport_type_ids = request.data.get('delivery_transport_types', [])
        vehicle_types = request.data.get('vehicle_types', [])
        delivery_transport_types = []
        for delivery_transport_type_id in delivery_transport_type_ids:
            delivery_transport_type = get_object_or_404(DeliveryTransportType, pk=delivery_transport_type_id)
            self.normalized_total_volume += delivery_transport_type.get_normalized_volume()
            delivery_transport_types.append(
                delivery_transport_type
            )
        self.delivery_transport_type_ids = delivery_transport_type_ids
        print('normalized_total_volume', self.normalized_total_volume)
        with transaction.atomic():
            if change_request:
                if self.is_valid_reasons(change_reasons):
                    self.save_reasons(split_from, change_reasons)

                else:
                    errors['reasons'] = 'Invalid reasons'
            transport_vehicle_has_errors, errors['vehicle_types'] = self.handle_transport_vehicles(vehicle_types, split_from=split_from)
            if not transport_vehicle_has_errors:
                errors['volume_mismatch'] = self.check_volume_mismatch()
                if errors['volume_mismatch']:
                    transport_vehicle_has_errors = True
            if transport_vehicle_has_errors:
                return_status = status.HTTP_400_BAD_REQUEST
                data = errors
                print("test 1")
                transaction.set_rollback(True)
            else:
                errors['delivery_transport_types_mismatch'] = self.delivery_transport_type_validation(delivery_transport_type_ids)
                if errors['delivery_transport_types_mismatch']:
                    transport_vehicle_has_errors = True
                    data = errors
                    return_status = status.HTTP_400_BAD_REQUEST
                    print("test 2")
                    transaction.set_rollback(True)

        
        return Response(data=data, status=return_status)
    
    def put(self, request, *args, **kwargs):
        self.updated_by = request.user.username
        transport_vehicle_tracking_id=kwargs.get('pk', None)
        data = {}
        errors = {
            'volume_mismatch': False,
            'vehicle_types': [],
            'delivery_transport_types_mismatch': False
        }
        return_status = status.HTTP_200_OK
        delivery_transport_type_ids = request.data.get('delivery_transport_types', [])
        vehicle_types = request.data.get('vehicle_types', [])
        delivery_transport_types = []
        self.normalized_total_volume = 0.00
        for delivery_transport_type_id in delivery_transport_type_ids:
            delivery_transport_type = get_object_or_404(DeliveryTransportType, pk=delivery_transport_type_id)
            self.normalized_total_volume += delivery_transport_type.get_normalized_volume()
            delivery_transport_types.append(
                delivery_transport_type
            )
        self.delivery_transport_type_ids = delivery_transport_type_ids
        print('normalized_total_volume', self.normalized_total_volume)
        with transaction.atomic():
            transport_vehicle_has_errors, errors['vehicle_types'] = self.handle_transport_vehicles(vehicle_types, transport_vehicle_tracking_id)
            if not transport_vehicle_has_errors:
                errors['volume_mismatch'] = self.check_volume_mismatch()
                if errors['volume_mismatch']:
                    transport_vehicle_has_errors = True
            if transport_vehicle_has_errors:
                return_status = status.HTTP_400_BAD_REQUEST
                data = errors
                transaction.set_rollback(True)
            else:
                errors['delivery_transport_types_mismatch'] = self.delivery_transport_type_validation(delivery_transport_type_ids)
                if errors['delivery_transport_types_mismatch']:
                    transport_vehicle_has_errors = True
                    data = errors
                    return_status = status.HTTP_400_BAD_REQUEST
                    transaction.set_rollback(True)

        return Response(data=data, status=return_status)
    
    def delivery_transport_type_validation(self, delivery_transport_type_ids):
        has_errors = False
        for delivery_transport_type_id in delivery_transport_type_ids:
            if not delivery_transport_type_id in self.handled_delivery_transport_type_ids:
                has_errors = True
                break
        return has_errors

    def is_valid_reasons(self, change_reasons):
        return True

    def save_reasons(self, split_from, change_reasons):
        pass
    def check_volume_mismatch(self):
        print('remaining_normalized_total_volume', self.normalized_total_volume)
        return self.normalized_total_volume != 0.00

    def handle_transport_vehicles(self, transport_vehicles, transport_vehicle_tracking_id=None, split_from=None):
        has_errors = False
        errors = []
        handled_transport_vehicle_ids = []
        self.handled_delivery_transport_type_ids = []
        if transport_vehicle_tracking_id:
            transport_vehicle_tracking = get_object_or_404(TransportVehicleTracking, pk=transport_vehicle_tracking_id)
        else:
            transport_vehicle_tracking = TransportVehicleTracking.objects.create()
            if split_from:
                transport_vehicle_tracking.split_from = split_from
                transport_vehicle_tracking.save()
        for transport_vehicle_data in transport_vehicles:
            transport_vehicle_errors = {
                'lcl_errors': [],
                'pickup_locations_errors': [],
                'destination_errors': []
            }
            if self.created_by:
                transport_vehicle_data['created_by'] = self.created_by
            if self.updated_by:
                transport_vehicle_data['updated_by'] = self.updated_by
            lcl_details = transport_vehicle_data.pop('lcl_details', [])
            pickup_locations = transport_vehicle_data.pop('pickup_locations', [])
            destinations = transport_vehicle_data.pop('destinations', [])

            transport_vehicle_data['transport_vehicle_tracking'] = transport_vehicle_tracking.id

            vehicle_type_serializer = TransportVehicleSerializer(data=transport_vehicle_data, enable_validation=True)
            if vehicle_type_serializer.is_valid():
                id = transport_vehicle_data.get('id', None)
                instance = get_object_or_none(
                    TransportVehicle, {'id': id}
                )
                if instance:
                    handled_transport_vehicle = transport_vehicle = vehicle_type_serializer.update(instance=instance, validated_data=vehicle_type_serializer.validated_data)
                else:
                    handled_transport_vehicle = transport_vehicle = vehicle_type_serializer.save()
                handled_transport_vehicle_ids.append(handled_transport_vehicle.id)
                lcl_has_errors, transport_vehicle_errors['lcl_errors'] = self.handle_lcl_details(lcl_details, transport_vehicle)
                transport_vehicle.calculate_delivery_transport_type_vehicle_allocated_cost()
                pickup_location_has_errors, transport_vehicle_errors['pickup_location_errors'] = self.handle_pickup_locations(pickup_locations, transport_vehicle)
                destination_has_errors, transport_vehicle_errors['destination_errors'] = self.handle_destinations(destinations, transport_vehicle)
                if lcl_has_errors or pickup_location_has_errors or destination_has_errors:
                    has_errors = True
            else:
                has_errors = True
                transport_vehicle_errors = vehicle_type_serializer.errors
            errors.append(transport_vehicle_errors)
        if split_from:
            DeliveryTransportTypeVehicle.objects.filter(
                delivery_transport_type__id__in=self.handled_delivery_transport_type_ids,
                transport_vehicle__transport_vehicle_tracking=split_from
            ).delete()
            for transport_vehicle in split_from.transportvehicle_set.all():
                # delete_delivery_transport_type_vehicle = transport_vehicle.deliverytransporttypevehicle_set.all().filter(delivery_transport_type__id__in=self.handled_delivery_transport_type_ids)
                # print("deleting", delete_delivery_transport_type_vehicle)

                if transport_vehicle.deliverytransporttypevehicle_set.all().count() == 0:
                    transport_vehicle.delete()

            if split_from.transportvehicle_set.count() == 0:
                split_from.state = TransportVehicleTracking.DELIVERY_CANCELED_STATE
                split_from.save()
        return has_errors, errors

    def handle_lcl_details(self, lcl_details, transport_vehicle):
        has_errors = False
        errors = []
        handled_lcl_ids = []
        for lcl_detail in lcl_details:
            lcl_detail['transport_vehicle'] = transport_vehicle.id
            if self.created_by:
                lcl_detail['created_by'] = self.created_by
            if self.updated_by:
                lcl_detail['updated_by'] = self.updated_by
            lcl_serializer = DeliveryTransportTypeVehicleSerializer(data=lcl_detail)
            if lcl_serializer.is_valid():
                
                lcl_id = lcl_detail.get('id', None)
                handled_delivery_transport_type_id = lcl_detail.get('delivery_transport_type', None)
                if not handled_delivery_transport_type_id in self.delivery_transport_type_ids:
                    errors.append({'delivery_transport_type': 'Invalid delivery transport type'})
                    has_errors = True
                else:
                    errors.append({})
                if handled_delivery_transport_type_id:
                    self.handled_delivery_transport_type_ids.append(handled_delivery_transport_type_id)
                lcl_instance = get_object_or_none(DeliveryTransportTypeVehicle, {'id': lcl_id})
                if lcl_instance:
                    handled_lcl = lcl_serializer.update(instance=lcl_instance, validated_data=lcl_serializer.validated_data)
                else:
                    handled_lcl = lcl_serializer.save()
                self.normalized_total_volume -= handled_lcl.get_normalized_volume()
                print('lcl_normalized_volume', handled_lcl.get_normalized_volume())
                handled_lcl_ids.append(handled_lcl.id)
            else:
                has_errors = True
                errors.append(lcl_serializer.errors)
        if not has_errors:
            transport_vehicle.deliverytransporttypevehicle_set.exclude(id__in=handled_lcl_ids).delete()
        return has_errors, errors
    
    def handle_pickup_locations(self, pickup_locations, transport_vehicle):
        has_errors = False
        errors = []
        handled_pickup_location_ids = []
        for pickup_location in pickup_locations:
            pickup_location['transport_vehicle'] = transport_vehicle.id
            if self.created_by:
                pickup_location['created_by'] = self.created_by
            if self.updated_by:
                pickup_location['updated_by'] = self.updated_by
            pickup_location_serializer = TransportVehiclePickupLocationSerializer(data=pickup_location)
            if pickup_location_serializer.is_valid():
                errors.append({})
                pickup_location_id = pickup_location.get('id', None)
                pickup_location_instance = get_object_or_none(TransportVehiclePickupLocation, {'id': pickup_location_id})
                if pickup_location_instance:
                    handled_pickup_location = pickup_location_serializer.update(instance=pickup_location_instance, validated_data=pickup_location_serializer.validated_data)
                else:
                    handled_pickup_location = pickup_location_serializer.save()
                handled_pickup_location_ids.append(handled_pickup_location.id)
            else:
                has_errors = True
                errors.append(pickup_location_serializer.errors)
        if not has_errors:
            transport_vehicle.transportvehiclepickuplocation_set.exclude(id__in=handled_pickup_location_ids).delete()

        return has_errors, errors
    
    def handle_destinations(self, destinations, transport_vehicle):
        has_errors = False
        errors = []
        handled_destination_ids = []
        for destination in destinations:
            destination['transport_vehicle'] = transport_vehicle.id
            if self.created_by:
                destination['created_by'] = self.created_by
            if self.updated_by:
                destination['updated_by'] = self.updated_by
            destination_serializer = TransportVehicleDestinationSerializer(data=destination)
            if destination_serializer.is_valid():
                errors.append({})
                destination_id = destination.get('id', None)
                destination_instance = get_object_or_none(TransportVehicleDestination, {'id': destination_id})
                if destination_instance:
                    handled_destination = destination_serializer.update(instance=destination_instance, validated_data=destination_serializer.validated_data)
                else:
                    handled_destination = destination_serializer.save()
                handled_destination_ids.append(handled_destination.id)
            else:
                has_errors = True
                errors.append(destination_serializer.errors)
        if not has_errors:
            transport_vehicle.transportvehicledestination_set.exclude(id__in=handled_destination_ids).delete

        return has_errors, errors

    

class LocalDeliveryTransportTrackingListView(generics.ListAPIView):
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportVehicleTrackingListSerializer
    queryset = TransportVehicleTracking.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        merge_from_id = self.request.query_params.get('merge_from_id', None)
        merge_from = get_object_or_none(TransportVehicleTracking, {'pk':merge_from_id})
        queryset = TransportVehicleTracking.objects.all().order_by('-id').exclude(state=TransportVehicleTracking.DELIVERY_CANCELED_STATE)
        if merge_from:
            queryset = queryset.exclude(id=merge_from_id)
        state = self.request.query_params.get('state', None)
        if state:
            if state == TransportVehicleTracking.DELIVERY_COMPLETED_STATE:
                queryset = queryset.filter(state=state)
            elif state == 'in_progress_deliveries':
                queryset = queryset.exclude(state=TransportVehicleTracking.DELIVERY_COMPLETED_STATE)
        paginator = self.pagination_class()
        queryset = paginator.paginate_queryset(queryset, self.request, view=self)
        return queryset


class LocalDeliveryTransportTrackingDetailView(generics.RetrieveAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportVehicleTrackingSerializer
    queryset = TransportVehicleTracking.objects.all()


class LocalDeliveryCountDetail(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = {}
        queryset = DeliveryTransportType.objects.filter(deliverytransporttypevehicle__isnull=True)
        data['LCL'] = queryset.filter(transport_type__name__in=['LCL', 'Air']).count()
        data['FCL'] = queryset.exclude(transport_type__name__in=['LCL', 'Air']).count()
        transport_vehicle_tracking_queryset = TransportVehicleTracking.objects.filter(active=True).exclude(state=TransportVehicleTracking.DELIVERY_CANCELED_STATE)
        data['in_progress_local_delivery_count'] = transport_vehicle_tracking_queryset.filter(active=True).exclude(
            state=TransportVehicleTracking.DELIVERY_COMPLETED_STATE).count()
        data['completed_local_delivery_count'] = transport_vehicle_tracking_queryset.filter(active=True,
                                                                                         state=TransportVehicleTracking.DELIVERY_COMPLETED_STATE).count()
        return Response(data=data)
    

class FreightForwarderCountryPortListView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        queryset = Port.objects.all()
        countries = [port.address.country for port in queryset.distinct('address__country')]
        for country in countries:
            data.append({
                "id": country.id if country else None,
                "name": country.name if country else None,
                'ports': PortSerializer(queryset.filter(address__country=country), many=True).data
            })
        return Response(data=data)
    

class MergeSupplierDeliveryDateView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_USER_ROLE, ]

    def put(self, request, *args, **kwargs):
        data = {}
        return_status = status.HTTP_200_OK
        errors = {}
        has_errors = False
        merge_from_id = kwargs['transport_delivery_date_tracking_id']
        merge_from_transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, id=merge_from_id)

        merge_with_id = request.data.get('merge_with_transport_delivery_date_tracking', )
        merge_with_transport_delivery_date_tracking = get_object_or_none(TransportDeliveryDateTracking, {'pk': merge_with_id})
        supplier_delivery_date_ids = request.data.get('supplier_delivery_dates', [])
        errors['supplier_delivery_dates'] = []
        with transaction.atomic():
            if merge_with_transport_delivery_date_tracking:
                if merge_with_transport_delivery_date_tracking.vendor_door_address.country == merge_from_transport_delivery_date_tracking.vendor_door_address.country:
                    for supplier_delivery_date_id in supplier_delivery_date_ids:
                        supplier_delivery_date = get_object_or_none(
                            SupplierDeliveryDate, {'pk': supplier_delivery_date_id}
                        )
                        if supplier_delivery_date:
                            errors['supplier_delivery_dates'].append([])
                            supplier_delivery_date.transport_tracking = merge_with_transport_delivery_date_tracking
                            supplier_delivery_date.save()
                            supplier_delivery_date.containerdelivery_set.all().delete()
                        else:
                            errors['supplier_delivery_dates'].append(
                                [
                                    'Detial not found'
                                ]
                            )
                    TransportDeliveryDateTrackingCreateUpdateView().save_reasons(
                        merge_from_transport_delivery_date_tracking, {'merge_to_existing_transport': request.data.get('reason', None)}
                    )
                    if not merge_from_transport_delivery_date_tracking.get_supplier_delivery_dates().exists():
                        merge_from_transport_delivery_date_tracking.active=False
                        merge_from_transport_delivery_date_tracking.save()
                else:
                    has_errors = True
                    errors['merge_with_transport_delivery_date_tracking'] = ['Different country']
            else:
                has_errors = True
                errors['merge_with_transport_delivery_date_tracking'] = ['Detail not found']
            if has_errors:
                transaction.set_rollback(True)
                data = errors
                return_status = status.HTTP_400_BAD_REQUEST


        return Response(data=data, status=return_status)
    

class MergeContainersView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_USER_ROLE, ]

    def is_valid_merge(self):
        return True

    def put(self, request, *args, **kwargs):
        data = {}
        return_status = status.HTTP_200_OK
        errors = {}
        has_errors = False
        merge_from_id = kwargs['local_delivery_tracking_id']
        merge_from_transport_vehicle_tracking = get_object_or_404(TransportVehicleTracking, id=merge_from_id)
        merge_with_id = request.data.get('merge_with_local_delivery_tracking', None)
        merge_with_transport_vehicle_tracking = get_object_or_none(TransportVehicleTracking, {'pk': merge_with_id})
        container_ids = request.data.get('containers', [])
        errors['containers'] = []
        delivery_transport_type_ids = []
        delivery_transport_types = []
        with transaction.atomic():
            if merge_with_transport_vehicle_tracking:
                if self.is_valid_merge():
                    for container_id in container_ids:
                        delivery_transport_type = get_object_or_none(
                            DeliveryTransportType, {'pk': container_id}
                        )
                        if delivery_transport_type:
                            delivery_transport_types.append(delivery_transport_type)
                            delivery_transport_type_ids.append(delivery_transport_type.id)
                            errors['containers'].append([])
                            print(delivery_transport_type)
                            for delivery_transport_vehicle_type in delivery_transport_type.deliverytransporttypevehicle_set.all():
                                
                                if delivery_transport_vehicle_type.transport_vehicle.deliverytransporttypevehicle_set.count() == 1:
                                    delivery_transport_vehicle_type.transport_vehicle.delete()
                                else:
                                    delivery_transport_vehicle_type.delete()
                        else:
                            errors['supplier_delivery_dates'].append(
                                [
                                    'Detial not found'
                                ]
                            )
                    DeliveryTransportTypeVehicleCreateView().save_reasons(
                        merge_from_transport_vehicle_tracking, {'merge_to_existing_transport': request.data.get('reason', None)}
                    )
                    data = TransportVehicleTrackingSerializer(merge_with_transport_vehicle_tracking).data
                    data['delivery_transport_types'] = [
                        *data['delivery_transport_types'],
                        *DeliveryTransportTypeListSerializer(delivery_transport_types, many=True).data
                    ]
                    # data
                    if merge_from_transport_vehicle_tracking.get_transport_vehicles().count() == 0:
                        merge_from_transport_vehicle_tracking.state = TransportVehicleTracking.DELIVERY_CANCELED_STATE
                        merge_from_transport_vehicle_tracking.save()
                else:
                    has_errors = True
                    errors['merge_with_local_delivery_tracking'] = ['Cannot merge']
            else:
                has_errors = True
                errors['merge_with_local_delivery_tracking'] = ['Detail not found']
            if has_errors:
                transaction.set_rollback(True)
                data = errors
                return_status = status.HTTP_400_BAD_REQUEST
        return Response(data=data, status=return_status)
    

class ImportDeliveryAutoConsolidationView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_USER_ROLE, ]

    def post(self, request, *args, **kwargs):

        start_date = request.data['start_date']
        end_date = request.data['end_date']
        consolidate_deliveries = ConsolidateDeliveries(start_date, end_date)
        consolidate_deliveries.consolidate()
        return Response('Succsess')


class PurchaseOrderOrderDeliveryListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = PurchaseOrderDeliverySerializer

    def get_field_list(self):

        field_list = [
            {'field_name': 'shipping_method', 'field_type': 'text', 'front_end_field_name': 'shipping_method'},
            {'field_name': 'purchase_order__customer__name', 'field_type': 'text', 'front_end_field_name': 'customer'},
            {'field_name': 'outgoing_commercial_invoice__incoterm', 'field_type': 'text', 'front_end_field_name': 'incoterm'},
            {'field_name': 'delivery_date', 'field_type': 'date', 'front_end_field_name': 'delivery_date'},
        ]
        return field_list

    def get_queryset(self):

        qs = PurchaseOrderDelivery.objects.filter(transport_delivery_date_tracking=None)
        field_list = self.get_field_list()
        qs = search_qs_from_global_filter_v2(qs, field_list, self.request, PurchaseOrderDelivery)

        display_number = self.request.query_params.get('display_number', None)
        costing = self.request.query_params.get('costing', None)
        po_club = self.request.query_params.get('po_club', None)
        purchase_order = self.request.query_params.get('purchase_order', None)

        if display_number:
            qs = list(qs)
            qs = [obj for obj in qs if display_number.lower() in obj.display_number.lower()]

        if costing:
            qs = list(qs)
            qs = [obj for obj in qs if obj.purchase_order.costing_version is not None and costing.lower() in obj.purchase_order.costing_version.version_display_number.lower()]

        if po_club:
            qs = list(qs)
            qs = [obj for obj in qs if obj.purchase_order.actual_po_club is not None and po_club.lower() in obj.purchase_order.actual_po_club.display_number.lower()]

        if purchase_order:
            qs = list(qs)
            qs = [obj for obj in qs if purchase_order.lower() in obj.purchase_order.display_number.lower()]

        return list(qs)
    
    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)
    

class TransportExportDeliveryCountsView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        queryset = TransportDeliveryDateTracking.objects.filter(active=True, export__isnull=False).distinct()
        filters = TransportDeliveryDateTrackingListView().get_filters()
        data = {
            'purchase_order_delivery_count': PurchaseOrderDelivery.objects.filter(transport_delivery_date_tracking=None).exclude(delivery_date=None).order_by('id').count()
        }
        for key, filter in filters.items():
                data[key] = queryset.filter(**filter['filter']).exclude(**filter['exclude']).count()
        data['all_deliveries_count'] = queryset.count()
        return Response(data)


class TransportDeliveryDateExportTrackingMetaDataView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportDeliveryDateExportTrackingMetaDataSerializer

    def get(self, request, *args, **kwargs):
        purchase_order_delivery_ids = request.data.get('purchase_order_delivery_ids', [])
        purchase_order_deliveries = PurchaseOrderDelivery.objects.filter(id__in=purchase_order_delivery_ids)
        data = {
            'types': TransportDeliveryDateTracking.TRANSPORT_TYPE_CHOICE,
            'volume_units': MaterialVolumeUnitHelper.ALL_VOLUME_UNITS,
            'weight_units': MaterialWeightUnitHelper.ALL_WEIGHT_UNITS,
            'freight_types': TransportDeliveryDateTracking.TRANSPORT_MODE_CHOICE,
            'customer_door_addresses': set([purchase_order_delivery.purchase_order.customer.address for purchase_order_delivery in PurchaseOrderDelivery.objects.all()]),
            'final_locations': set([plant.address for plant in Plant.objects.all()]),
            'transport_types': TransportType.objects.exclude(name__in=['AIR', 'Sri Lanka']),
            'foreign_ports': Port.objects.all(),
            'local_ports': set([plant.port_type for plant in Plant.objects.all()]),
            'plants': Plant.objects.all(),
            'distance_units': DistanceUnitHelper.ALL_DISTANCE_UNITS,
            'currencies': CurrencyHelper.CURRENCY_CHOICES,
            'freight_forwarders': FreightForwarder.objects.all(),
            'change_reasons': TransportChangeReason.objects.all(),
        }

        return Response(self.serializer_class(data).data)


class TransportDeliveryExportDateTrackingListView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportDeliveryExportDateTrackingListSerializer

    def get_field_list(self):

        field_list = [
            {'field_name': 'id', 'field_type': 'id', 'front_end_field_name': 'merge_from_id'},
            {'field_name': 'type', 'field_type': 'text', 'front_end_field_name': 'transport_type'},
            {'field_name': 'local_port__name', 'field_type': 'text', 'front_end_field_name': 'local_port'},
            {'field_name': 'local_port_expected_date', 'field_type': 'date', 'front_end_field_name': 'local_port_expected_date'},
            {'field_name': 'actual_local_port_date', 'field_type': 'date', 'front_end_field_name': 'actual_local_port_date'},
            {'field_name': 'foreign_port__name', 'field_type': 'text', 'front_end_field_name': 'foreign_port'},
            {'field_name': 'foreign_port_expected_date', 'field_type': 'date', 'front_end_field_name': 'foreign_port_expected_date'},
            {'field_name': 'actual_foreign_port_date', 'field_type': 'date', 'front_end_field_name': 'actual_foreign_port_date'},
        ]
        return field_list
    
    def get_queryset(self):

        qs = TransportDeliveryDateTracking.objects.filter(active=True, export__isnull=False).order_by('-id')
        field_list = self.get_field_list()
        qs = search_qs_from_global_filter_v2(qs, field_list, self.request, TransportDeliveryDateTracking)

        delivery_queryset = PurchaseOrderDelivery.objects.filter(transport_delivery_date_tracking__in=qs).distinct()
        
        customer = self.request.query_params.get('customer', None)
        costing = self.request.query_params.get('costing', None)
        po_club = self.request.query_params.get('po_club', None)
        po = self.request.query_params.get('po', None)
        filter_type = self.request.GET.get('filter_type', None)

        filters = TransportDeliveryDateTrackingListView().get_filters()
        if filter_type and filter_type in filters:
            filter = filters[filter_type]
            qs = qs.filter(**filter['filter']).exclude(**filter['exclude'])
        else:
            pass

        filters_applied = False
        
        if customer:
            delivery_queryset = delivery_queryset.filter(purchase_order__customer__name__icontains=customer)
            filters_applied = True
        
        if costing:
            delivery_ids = [delivery.id for delivery in delivery_queryset if costing.lower() in delivery.purchase_order.costing_version.version_display_number.lower()]
            delivery_queryset = delivery_queryset.filter(id__in=delivery_ids)
            filters_applied = True

        if po_club:
            delivery_ids = [delivery.id for delivery in delivery_queryset if po_club.lower() in delivery.purchase_order.actual_po_club.display_number.lower()]
            delivery_queryset = delivery_queryset.filter(id__in=delivery_ids)
            filters_applied = True

        if po:
            delivery_ids = [delivery.id for delivery in delivery_queryset if po.lower() in delivery.purchase_order.display_number.lower()]
            delivery_queryset = delivery_queryset.filter(id__in=delivery_ids)
            filters_applied = True

        if filters_applied:
            qs = qs.filter(id__in=delivery_queryset.values_list('transport_delivery_date_tracking__id', flat=True)).distinct()

        tracking_number = self.request.query_params.get('tracking', None)
        if tracking_number:
            qs_ids = [obj.id for obj in qs if tracking_number.lower() in obj.transport_delivery_date_tracking_display_number.lower()]
            qs = qs.filter(id__in=qs_ids)

        return qs
    
    def get(self, request, *args, **kwargs):

        queryset = list(self.get_queryset().distinct())
        pagination = GeneralLargeResultsSetPagination()
        paginated_items = pagination.paginate_queryset(queryset, request, view=self)
        serializer = self.serializer_class(paginated_items, many=True)
        return pagination.get_paginated_response(serializer.data)


class TransportDeliveryExportDateTrackingDetailView(generics.RetrieveAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportDeliveryDateTracking.objects.all()
    serializer_class = TransportDeliveryExportDateTrackingDetailSeializer

                          
class TransportDeliveryExportDateTrackingCreateUpdateView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    queryset = TransportDeliveryDateTracking.objects.all()
    serializer_class = TransportDeliveryDateExportTrackingCreateUpdateSerializer

    def post(self, request, *args, **kwargs):

        change_request = request.query_params.get('change_request', False)
        self.change_request = change_request
        change_reasons = request.data.pop('reasons', {})
        split_from_id = request.query_params.get('split_from', None)
        split_from = get_object_or_none(TransportDeliveryDateTracking, {'pk':split_from_id})
    
        errors = {}

        purchase_order_delivery_ids = request.data.get('purchase_order_delivery_ids', [])
        if not purchase_order_delivery_ids:
            errors['purchase_order_deliveries'] = 'Purchase order deliveries are required.'
        else:
            purchase_order_deliveries = PurchaseOrderDelivery.objects.filter(id__in=purchase_order_delivery_ids)
            distinct_customers = purchase_order_deliveries.values_list('purchase_order__customer__id', flat=True).distinct()
            all_same_customer = distinct_customers.count() == 1

            if not all_same_customer:
                errors['purchase_order_delivery_customers'] = 'Please select the deliveries of same customer.'
            else:
                with transaction.atomic():
                    air_delivery_transport_type_errors = None
                    delivery_transport_types_errors = None
                    serializer = self.serializer_class(data=request.data)

                    if not serializer.is_valid():
                        errors['transport_delivery_date_tracking'] = serializer.errors
                    else:
                        tracking_instance = serializer.save()
                        transport_tracking_id = tracking_instance.id
                        delivery_transport_tracking_data = request.data
                        transport_mode = delivery_transport_tracking_data.pop('transport_mode', None)

                        if transport_mode == 'air':
                            air_delivery_transport_type_errors = self.handle_air_delivery_transport_type(purchase_order_delivery_ids.copy(), transport_tracking_id, delivery_transport_tracking_data)
                            if air_delivery_transport_type_errors:
                                errors.update(air_delivery_transport_type_errors)    
                        else:
                            delivery_transport_types_errors = self.handle_delivery_transport_types(purchase_order_delivery_ids.copy(), transport_tracking_id, delivery_transport_tracking_data)
                            if delivery_transport_types_errors:
                                errors.update(delivery_transport_types_errors)
                    
                        if air_delivery_transport_type_errors or delivery_transport_types_errors:
                            tracking_instance.delete()
                        else:
                            if transport_mode != tracking_instance.transport_mode:
                                delivery_transport_types = tracking_instance.deliverytransporttype_set.all()
                                for delivery_transport_type in delivery_transport_types:
                                    delivery_transport_type.containerdelivery_set.all().delete()
                                delivery_transport_types.delete()

                            if split_from:
                                self.handle_split_from(split_from, change_reasons, purchase_order_delivery_ids)
                            tracking_instance.calculate_total_weight_and_volume()
                            PurchaseOrderDelivery.objects.filter(id__in=purchase_order_delivery_ids).update(transport_delivery_date_tracking=tracking_instance)
        if errors:
            return Response(data=errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(status = status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):

        errors = {}
        transport_tracking_id = kwargs['pk']
        tracking_instance = TransportDeliveryDateTracking.objects.get(id=transport_tracking_id)
        
        previous_transport_mode = tracking_instance.transport_mode
        existing_delivery_transport_type_ids = list(tracking_instance.deliverytransporttype_set.all().values_list('id', flat=True))
        existing_purchase_order_delivery_ids = list(PurchaseOrderDelivery.objects.filter(transport_delivery_date_tracking__id=transport_tracking_id).values_list('id', flat=True))
        
        selected_deliveries = request.data.get('selected_deliveries', [])
        purchase_order_delivery_ids = [selected_delivery.get('id') for selected_delivery in selected_deliveries if selected_delivery.get('id', None) is not None]
        if not purchase_order_delivery_ids:
            errors['purchase_order_deliveries'] = 'Purchase order deliveries are required.'
        else:
            purchase_order_deliveries = PurchaseOrderDelivery.objects.filter(id__in=purchase_order_delivery_ids)
            distinct_customers = purchase_order_deliveries.values_list('purchase_order__customer__id', flat=True).distinct()
            all_same_customer = distinct_customers.count() == 1

            if not all_same_customer:
                errors['purchase_order_delivery_customers'] = 'Please select the deliveries of same customer.'
            else:
                with transaction.atomic():
                    air_delivery_transport_type_errors = None
                    delivery_transport_types_errors = None
                    delivery_transport_tracking_data = request.data

                    serializer = self.serializer_class(tracking_instance, data=request.data, partial=True)
                    
                    if not serializer.is_valid():
                        errors.update(serializer.errors)
                    else:
                        transport_mode = delivery_transport_tracking_data.get('transport_mode', None)

                        if transport_mode == 'air':
                            air_delivery_transport_type_errors = self.handle_air_delivery_transport_type(purchase_order_delivery_ids.copy(), transport_tracking_id, delivery_transport_tracking_data)
                            if air_delivery_transport_type_errors:
                                errors.update(air_delivery_transport_type_errors)    
                        else:
                            delivery_transport_types_errors = self.handle_delivery_transport_types(purchase_order_delivery_ids.copy(), transport_tracking_id, delivery_transport_tracking_data)
                            if delivery_transport_types_errors:
                                errors.update(delivery_transport_types_errors)

                        if not air_delivery_transport_type_errors and not delivery_transport_types_errors:
                            tracking_instance = serializer.save()

                            PurchaseOrderDelivery.objects.filter(id__in=existing_purchase_order_delivery_ids).exclude(id__in=purchase_order_delivery_ids).update(transport_delivery_date_tracking=None)
                            ContainerDelivery.objects.filter(purchase_order_delivery__id__in=existing_purchase_order_delivery_ids).exclude(purchase_order_delivery__id__in=purchase_order_delivery_ids).delete()
                            
                            if previous_transport_mode != tracking_instance.transport_mode:
                                previous_existing_delivery_transport_types = tracking_instance.deliverytransporttype_set.filter(id__in=existing_delivery_transport_type_ids)
                                for previous_existing_delivery_transport_type in previous_existing_delivery_transport_types:
                                    previous_existing_delivery_transport_type.containerdelivery_set.all().delete()
                                previous_existing_delivery_transport_types.delete()

                            delivery_transport_types = tracking_instance.deliverytransporttype_set.all()
                            if delivery_transport_types.exists():
                                for delivery_transport_type in delivery_transport_types:
                                    if not delivery_transport_type.containerdelivery_set.all().exists():
                                        delivery_transport_type.active = False
                                        delivery_transport_type.state = "canceled"
                                        delivery_transport_type.save()
                                    delivery_transport_type.calculate_total_weight_and_volume()
                            if not tracking_instance.get_container_deliveries():
                                tracking_instance.active = False
                                tracking_instance.state = "canceled"
                                tracking_instance.save()
                            tracking_instance.calculate_total_weight_and_volume()

        if errors:
            return Response(data=errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(status = status.HTTP_200_OK)

    def handle_delivery_transport_types(self, purchase_order_delivery_ids, transport_tracking_id, delivery_transport_tracking_data):

        has_errors = False
        has_transport_type_po_delivery_duplicate_error = False
        delivery_transport_types_errors = {}
        
        number_of_containers = delivery_transport_tracking_data.get('number_of_containers', None)
        if not number_of_containers:
            delivery_transport_types_errors['no_of_containers'] = 'Enter the number of containers.'
            has_errors = True
        else:
            new_delivery_transport_types_and_container_deliveries = {}
            existing_delivery_transport_types_and_new_container_deliveries = {}

            delivery_transport_types = delivery_transport_tracking_data.get('transport_types')
            delivery_transport_type_wise_errors = []
            for delivery_transport_type in delivery_transport_types:

                single_delivery_transport_type_errors = {}

                total_volume = 0
                total_weight = 0
                normalized_volume_unit = MaterialVolumeUnitHelper.CUBIC_METER_UNIT
                normalized_weight_unit = MaterialWeightUnitHelper.KILOGRAMS_UNIT
                name = delivery_transport_type.get('name', None)
                transport_type_id = delivery_transport_type.get('transport_type', None)
                delivery_transport_type_data = {'name': name, 'volume': total_volume, 'volume_unit': normalized_volume_unit, 'weight': total_weight, 'weight_unit': normalized_weight_unit, 'transport_type': transport_type_id, 'transport_delivery_date_tracking': transport_tracking_id}
                
                is_existing_delivery_transport_type = bool(delivery_transport_type.get('transport_delivery_date_tracking'))
                if not is_existing_delivery_transport_type:
                    delivery_transport_type_serializer = DeliveryTransportTypeCreateSerializer(data=delivery_transport_type_data)
                else:
                    delivery_transport_type_id = delivery_transport_type.get('id')
                    instance = DeliveryTransportType.objects.get(id=delivery_transport_type_id)
                    delivery_transport_type_delivery_ids = list(ContainerDelivery.objects.filter(delivery_transport_type__id=delivery_transport_type_id).values_list('id', flat=True))
                    delivery_transport_type_serializer = DeliveryTransportTypeCreateSerializer(instance, data=delivery_transport_type_data)
                
                if delivery_transport_type_serializer.is_valid():
                    delivery_transport_type_instance = delivery_transport_type_serializer.save()
                    delivery_transport_type_id = delivery_transport_type_instance.id
                    
                    has_delivery_wise_errors = False
                    deliveries = delivery_transport_type.get('deliveries')
                    purchase_order_delivery_ids, existing_deliveries_ids, total_volume, total_weight, has_delivery_wise_errors, delivery_wise_errors, has_po_delivery_duplicate_error = self.handle_deliveries(delivery_transport_type_id, purchase_order_delivery_ids, deliveries)
                    
                    if has_delivery_wise_errors or has_po_delivery_duplicate_error:
                        if has_delivery_wise_errors:    
                            has_errors = True
                        elif has_po_delivery_duplicate_error:
                            has_transport_type_po_delivery_duplicate_error = True

                        if not is_existing_delivery_transport_type:
                            ContainerDelivery.objects.filter(delivery_transport_type__id=delivery_transport_type_id).delete()
                            delivery_transport_type_instance.delete()   
                        else:
                            ContainerDelivery.objects.filter(delivery_transport_type__id=delivery_transport_type_id).exclude(id__in=delivery_transport_type_delivery_ids).delete()
                    else:
                        if not is_existing_delivery_transport_type:
                            container_deliveries = delivery_transport_type_instance.containerdelivery_set.all()
                            container_delivery_ids = list(container_deliveries.values_list('id', flat=True))
                            new_delivery_transport_types_and_container_deliveries[delivery_transport_type_id] = container_delivery_ids
                        else:
                            new_container_deliveries = ContainerDelivery.objects.filter(delivery_transport_type__id=delivery_transport_type_id).exclude(id__in=delivery_transport_type_delivery_ids)
                            new_container_delivery_ids = list(new_container_deliveries.values_list('id', flat=True))
                            existing_delivery_transport_types_and_new_container_deliveries[delivery_transport_type_id] = new_container_delivery_ids

                        delivery_transport_type_instance.volume = total_volume
                        delivery_transport_type_instance.weight = total_weight
                        delivery_transport_type_instance.save()
                         
                    single_delivery_transport_type_errors['deliveries'] = delivery_wise_errors
                else:
                    has_errors = True
                    single_delivery_transport_type_errors = delivery_transport_type_serializer.errors

                delivery_transport_type_wise_errors.append(single_delivery_transport_type_errors)

            if has_errors:
                delivery_transport_types_errors['transport_types'] = delivery_transport_type_wise_errors

            elif purchase_order_delivery_ids:
                if new_delivery_transport_types_and_container_deliveries:
                    for delivery_transport_type_id, container_delivery_ids in new_delivery_transport_types_and_container_deliveries.items():
                        ContainerDelivery.objects.filter(id__in=container_delivery_ids).delete()
                        DeliveryTransportType.objects.get(id=delivery_transport_type_id).delete()
                elif existing_delivery_transport_types_and_new_container_deliveries:
                    for existing_delivery_transport_type_id, new_container_delivery_ids in existing_delivery_transport_types_and_new_container_deliveries.items():
                        ContainerDelivery.objects.filter(id__in=new_container_delivery_ids).delete()
                        DeliveryTransportType.objects.get(id=existing_delivery_transport_type_id).calculate_total_weight_and_volume()
                delivery_transport_types_errors['delivery_assign'] = 'Assign the transport type for all selected purchase order deliveries.'

            elif has_transport_type_po_delivery_duplicate_error:
                delivery_transport_types_errors['po_deliveries_duplication'] = 'Purchase order deliveries are duplicated in same delivery transport type.'

            else:
                deleted_transport_type_ids = delivery_transport_tracking_data.get('deleted_transport_type_ids',[])
                if deleted_transport_type_ids:
                    ContainerDelivery.objects.filter(delivery_transport_type__id__in=deleted_transport_type_ids).delete()
                    DeliveryTransportType.objects.filter(id__in=deleted_transport_type_ids).delete()

        return delivery_transport_types_errors
    
    def handle_air_delivery_transport_type(self, purchase_order_delivery_ids, transport_tracking_id, delivery_transport_tracking_data):

        has_errors = False
        has_transport_type_po_delivery_duplicate_error = False
        air_delivery_transport_type_errors = {}

        air_transport_type = get_object_or_none(TransportType, {'name': 'Air'})
        if not air_transport_type:
            has_errors = True
            air_delivery_transport_type_errors['air_deliveries'] = 'Air deliveries not available.'
        else:
            has_air_delivery_transport_type_id = True
            air_transport_type_id = air_transport_type.id
            air_delivery_transport_type = get_object_or_none(DeliveryTransportType, {'transport_type_id': air_transport_type, 'transport_delivery_date_tracking_id': transport_tracking_id})
            
            if not air_delivery_transport_type:
                has_air_delivery_transport_type_id = False
                
                name = 'air'
                total_volume = 0
                total_weight = 0
                normalized_volume_unit = MaterialVolumeUnitHelper.CUBIC_METER_UNIT
                normalized_weight_unit = MaterialWeightUnitHelper.KILOGRAMS_UNIT
                air_delivery_transport_type_data = {'name': name, 'volume': total_volume, 'volume_unit': normalized_volume_unit, 'weight': total_weight, 'weight_unit': normalized_weight_unit, 'transport_type': air_transport_type_id, 'transport_delivery_date_tracking': transport_tracking_id}
                air_delivery_transport_type_serializer = DeliveryTransportTypeCreateSerializer(data=air_delivery_transport_type_data)

                if air_delivery_transport_type_serializer.is_valid():
                    air_delivery_transport_type_instance = air_delivery_transport_type_serializer.save()
                air_delivery_transport_type_id = air_delivery_transport_type_instance.id
            else:
                air_delivery_transport_type_instance = get_object_or_none(DeliveryTransportType, {'transport_delivery_date_tracking_id': transport_tracking_id})
                air_delivery_transport_type_id = air_delivery_transport_type_instance.id
                air_delivery_transport_type_delivery_ids = list(ContainerDelivery.objects.filter(delivery_transport_type__id=air_delivery_transport_type_id).values_list('id', flat=True))

            has_air_delivery_wise_errors = False
            air_deliveries = delivery_transport_tracking_data.get('air_deliveries')
            purchase_order_delivery_ids, existing_deliveries_ids, total_volume, total_weight, has_air_delivery_wise_errors, air_delivery_wise_errors, has_po_delivery_duplicate_error = self.handle_deliveries(air_delivery_transport_type_id, purchase_order_delivery_ids, air_deliveries)

            if has_air_delivery_wise_errors or purchase_order_delivery_ids or has_po_delivery_duplicate_error:
                if has_air_delivery_wise_errors:
                    has_errors = True
                elif has_po_delivery_duplicate_error:
                    has_transport_type_po_delivery_duplicate_error = True
                else:
                    purchase_order_delivery_ids

                if not has_air_delivery_transport_type_id:
                    ContainerDelivery.objects.filter(delivery_transport_type__id=air_delivery_transport_type_id).delete()
                    air_delivery_transport_type_instance.delete()   
                else:
                    ContainerDelivery.objects.filter(delivery_transport_type__id=air_delivery_transport_type_id).exclude(id__in=air_delivery_transport_type_delivery_ids).delete()
            else:
                ContainerDelivery.objects.filter(id__in=existing_deliveries_ids).delete()
                air_delivery_transport_type_instance.volume = total_volume
                air_delivery_transport_type_instance.weight = total_weight
                air_delivery_transport_type_instance.save()

            if has_errors:
                air_delivery_transport_type_errors['air_deliveries'] = air_delivery_wise_errors
            elif has_transport_type_po_delivery_duplicate_error:
                air_delivery_transport_type_errors['po_deliveries_duplication'] = 'Purchase order deliveries are duplicated.'
            elif purchase_order_delivery_ids:
                air_delivery_transport_type_errors['transport_types'] = 'Assign the transport type for all selected purchase order deliveries.'

        return air_delivery_transport_type_errors
    
    def handle_deliveries(self, delivery_transport_type_id, transport_tracking_purchase_order_delivery_ids, deliveries):

        delivery_wise_errors = []
        has_delivery_wise_errors = False
        has_po_delivery_duplicate_error = False
        
        transport_type_volume = 0
        transport_type_weight = 0
        transport_type_existing_deliveries_ids = list(ContainerDelivery.objects.filter(delivery_transport_type__id=delivery_transport_type_id).values_list('id', flat=True))
        transport_type_purchase_order_delivery_ids = []
        for delivery in deliveries:

            deliveries_exist_for_same_purchase_order_delivery = False 

            delivery_id = delivery.get('id', None)
            container_delivery_errors, purchase_order_delivery_id = self.handle_container_deliveries(delivery_transport_type_id, delivery)
            delivery_wise_errors.append(container_delivery_errors)

            if not container_delivery_errors:
                if purchase_order_delivery_id in transport_tracking_purchase_order_delivery_ids:
                    transport_tracking_purchase_order_delivery_ids.remove(purchase_order_delivery_id)
                if delivery_id:
                    transport_type_existing_deliveries_ids.remove(delivery_id)
                if purchase_order_delivery_id in transport_type_purchase_order_delivery_ids:
                    deliveries_exist_for_same_purchase_order_delivery = True
                transport_type_purchase_order_delivery_ids.append(purchase_order_delivery_id)

                volume = delivery.get('volume')
                volume_unit = delivery.get('volume_unit')
                normalized_volume_unit = MaterialVolumeUnitHelper().get_normalized_volume_unit(volume_unit)
                normalized_volume = MaterialVolumeUnitHelper().convert_volume_to_units(normalized_volume_unit, float(volume), volume_unit)

                weight = delivery.get('weight')
                weight_unit = delivery.get('weight_unit')
                normalized_weight_unit = MaterialWeightUnitHelper().get_normalized_weight_unit(weight_unit)
                normalized_weight = MaterialWeightUnitHelper().convert_weight_to_units(normalized_weight_unit, float(weight), weight_unit)

                if deliveries_exist_for_same_purchase_order_delivery:
                    transport_type_volume += 0
                    transport_type_weight += 0
                else:
                    transport_type_volume += normalized_volume
                    transport_type_weight += normalized_weight
            else:
                has_delivery_wise_errors = True

        transport_type_purchase_order_delivery_id_set = set(transport_type_purchase_order_delivery_ids)
        if len(transport_type_purchase_order_delivery_ids) > len(transport_type_purchase_order_delivery_id_set):
            has_po_delivery_duplicate_error = True

        return transport_tracking_purchase_order_delivery_ids, transport_type_existing_deliveries_ids, transport_type_volume, transport_type_weight, has_delivery_wise_errors, delivery_wise_errors, has_po_delivery_duplicate_error

    def handle_container_deliveries(self, delivery_transport_type_id, delivery):
     
        container_delivery_errors = {}
        purchase_order_delivery_id = delivery.get('purchase_order_delivery', None)
        if not purchase_order_delivery_id:
            container_delivery_errors['purchase_order_delivery_date'] = 'Purchase order delivery not selected'    
        else:
            delivery['purchase_order_delivery'] = purchase_order_delivery_id
            delivery['delivery_transport_type'] = delivery_transport_type_id
            purchase_order_delivery_transport_type_container_delivery = get_object_or_none(ContainerDelivery, {'delivery_transport_type_id': delivery_transport_type_id, 'purchase_order_delivery_id': purchase_order_delivery_id})

            if not purchase_order_delivery_transport_type_container_delivery:
                delivery_id = delivery.get('id', None)
                if delivery_id:
                    instance = ContainerDelivery.objects.get(id=delivery_id)
                    container_delivery = ContainerDeliverySerializer(instance, data=delivery)
                else:
                    container_delivery = ContainerDeliverySerializer(data=delivery)

                if not container_delivery.is_valid():
                    container_delivery_errors['deliveries'] = container_delivery.errors
                else:
                    container_delivery.save()

        return container_delivery_errors, purchase_order_delivery_id

    def handle_split_from(self, split_from_tracking, change_reasons, split_purchase_order_delivery_ids):

        split_from_container_deliveires = ContainerDelivery.objects.filter(purchase_order_delivery__id__in=split_purchase_order_delivery_ids)

        split_from_delivery_transport_types = DeliveryTransportType.objects.filter(transport_delivery_date_tracking__id=split_from_tracking.id)
        split_from_delivery_transport_type_ids = list(split_from_delivery_transport_types.values_list('id', flat=True))
        split_from_container_deliveires.filter(purchase_order_delivery__id__in=split_purchase_order_delivery_ids, delivery_transport_type__id__in=split_from_delivery_transport_type_ids).update(purchase_order_delivery=None)
        ContainerDelivery.objects.filter(purchase_order_delivery__isnull=True, delivery_transport_type__id__in=split_from_delivery_transport_type_ids).delete()

        split_from_tracking = self.save_reasons(split_from_tracking, change_reasons)
        if not split_from_tracking.get_purchase_order_deliveries().exists():
            split_from_tracking.active = False
            split_from_tracking.save()
        for delivery_transport_type in split_from_delivery_transport_types:
            delivery_transport_type.calculate_total_weight_and_volume()
            if not delivery_transport_type.get_container_deliveries().exists():
                delivery_transport_type.active = False
                delivery_transport_type.save()
        split_from_tracking.calculate_total_weight_and_volume()
        
    def save_reasons(self, split_from, reasons):
        current_reasons = split_from.change_reasons
        if type(current_reasons) == list:
            current_reasons.append(reasons)
        else:
            current_reasons = [reasons]
        split_from.change_reasons = current_reasons
        split_from.save()
        return split_from
    

class ExportMergewithTransportDeliveryDateTrackingListView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_USER_ROLE, ]
    serializer_class = TransportDeliveryDateTrackingListSerializer

    def get(self, request, *args, **kwargs):
        
        queryset = TransportDeliveryDateTracking.objects.filter(export__isnull=False, state='draft').distinct()
        merge_from_id = self.request.query_params.get('merge_from_id', None)
        
        if queryset and merge_from_id:
            merge_from_tracking_object = queryset.get(id=merge_from_id)
            merge_from_tracking_customer_address_id = merge_from_tracking_object.customer_door_address.id
            queryset = queryset.exclude(id=merge_from_tracking_object.id).filter(customer_door_address__id=merge_from_tracking_customer_address_id)
  
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)


class MergeExportPurchaseOrderDeliveryView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_USER_ROLE, ]
    
    def put(self, request, *args, **kwargs):
        
        data = {}
        has_errors = False
        return_status = status.HTTP_200_OK
        errors = {}

        merge_from_id = kwargs['transport_delivery_date_tracking_id']
        merge_from_transport_delivery_date_tracking = get_object_or_none(TransportDeliveryDateTracking, {'pk': merge_from_id})
        merge_with_id = request.data.get('merge_with_transport_delivery_date_tracking', None)
        merge_with_transport_delivery_date_tracking = get_object_or_none(TransportDeliveryDateTracking, {'pk': merge_with_id})

        with transaction.atomic():
            if merge_from_transport_delivery_date_tracking and merge_from_transport_delivery_date_tracking.state == TransportDeliveryDateTracking.DRAFT_STATE:
                if not merge_with_transport_delivery_date_tracking:
                    has_errors = True
                    errors['merge_with_transport_delivery_date_tracking'] = 'Invalid merge with delivery transport tracking.'
                else:
                    if not merge_from_transport_delivery_date_tracking.customer_door_address or not merge_with_transport_delivery_date_tracking.customer_door_address:
                        has_errors = True
                        errors['merge_with_transport_delivery_date_tracking'] = 'Customer door address missing in one of the records.'
                    elif merge_from_transport_delivery_date_tracking.customer_door_address.id != merge_with_transport_delivery_date_tracking.customer_door_address.id:
                        has_errors = True
                        errors['merge_with_transport_delivery_date_tracking'] = 'Merge with delivery transport tracking is not for same customer'
                    else:
                        purchase_order_delivery_ids = request.data.get('purchase_order_delivery_ids', [])
                        if not purchase_order_delivery_ids:
                            has_errors = True
                            errors['purchase_order_delivery_ids'] = 'Please select a purchase order delivery.'
                        else:
                            has_purchase_order_delivery_errors = False
                            for purchase_order_delivery_id in purchase_order_delivery_ids:
                                purchase_order_delivery = get_object_or_none(PurchaseOrderDelivery, {'pk': purchase_order_delivery_id})
                                if not purchase_order_delivery:
                                    has_purchase_order_delivery_errors = True
                                    continue
                                purchase_order_delivery.transport_delivery_date_tracking = merge_with_transport_delivery_date_tracking
                                TransportDeliveryDateTrackingCreateUpdateView().save_reasons(merge_from_transport_delivery_date_tracking, {'merge_to_existing_transport': request.data.get('reason', None)})
                                purchase_order_delivery.save()
                                purchase_order_delivery.containerdelivery_set.all().delete()
                                
                            if has_purchase_order_delivery_errors:
                                has_errors = True
                                errors['purchase_order_delivery_ids'] = 'Invalid purchase order delivery exists.'
                            else:
                                delivery_transport_types = merge_from_transport_delivery_date_tracking.deliverytransporttype_set.all()
                                for delivery_transport_type in delivery_transport_types:
                                    if not delivery_transport_type.get_container_deliveries().exists():
                                        delivery_transport_type.active = False
                                        delivery_transport_type.state = "canceled"
                                        delivery_transport_type.save()
                                        delivery_transport_type.calculate_total_weight_and_volume()

                                if not merge_from_transport_delivery_date_tracking.get_purchase_order_deliveries().exists():
                                    merge_from_transport_delivery_date_tracking.active = False
                                    merge_from_transport_delivery_date_tracking.state = "canceled"
                                    merge_from_transport_delivery_date_tracking.save()
                                merge_from_transport_delivery_date_tracking.calculate_total_weight_and_volume()                   
            else:
                has_errors = True
                errors['merge_from_transport_delivery_date_tracking'] = 'Invalid merge from delivery transport tracking.'

            if has_errors:
                transaction.set_rollback(True)
                data = errors
                return_status = status.HTTP_400_BAD_REQUEST

        return Response(data=data, status=return_status)
    

class TransportDeliveryDateTrackingExportInvoiceListView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get_invoice(self, instance):
        data = None
        if instance.outgoing_commercial_invoice and instance.outgoing_commercial_invoice.invoice_file:
            data = instance.outgoing_commercial_invoice.invoice_file.get_object_data()
        return data

    def get(self, request, *args, **kwargs):
        delivery_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=self.kwargs.get('delivery_tracking_id', None))
        invoice_list = []
        if delivery_tracking:
            purchase_order_deliveries = delivery_tracking.export.all()
            for purchase_order_delivery in purchase_order_deliveries:
                invoice_detail = {}
                if purchase_order_delivery.outgoing_commercial_invoice:
                    invoice_detail['display_number'] = purchase_order_delivery.outgoing_commercial_invoice.display_number
                    invoice_detail['invoice'] = self.get_invoice(purchase_order_delivery)
                    invoice_detail['state'] = purchase_order_delivery.outgoing_commercial_invoice.state
                invoice_list.append(invoice_detail)       
        return Response(invoice_list)
  

class TransportDeliveryDateTrackingExportChargeListView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        delivery_transport_type_id = request.GET.get('delivery_transport_type_id', None)
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        
        transport_type_charges = []
        transport_type_charges = DeliveryTransportTypeCharge.objects.filter(delivery_transport_type__transport_delivery_date_tracking=transport_delivery_date_tracking)
        if delivery_transport_type_id:
            transport_type_charges = transport_type_charges.filter(delivery_transport_type__id=delivery_transport_type_id)
        transport_type_charge_serializer = TransportDeliveryDateTrackingTypeChargeSerializer(transport_type_charges, many=True, context={'request': request})

        return Response(data=transport_type_charge_serializer.data, status=status.HTTP_200_OK)


class TransportDeliveryDateTrackingExportChargeUpdateCreateView(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = TransportDeliveryDateTrackingTypeChargeSerializer

    def post(self, request, *args, **kwargs):
        
        has_errors = False
        errors = {}
        return_status = status.HTTP_200_OK
        
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        delivery_transport_type_id = request.GET.get('delivery_transport_type_id', None)
        deleted_charge_ids = request.data.get('deleted_charge_ids', [])
        charges = request.data.get('charges', [])
        delivery_transport_type = get_object_or_404(DeliveryTransportType, pk=delivery_transport_type_id, transport_delivery_date_tracking=transport_delivery_date_tracking)

        with transaction.atomic():
            if charges:
                charge_wise_errors = []
                for charge_data in charges:
                    charge_error = {}
                    charge_id  = charge_data.get('id', None)
                    if charge_id:
                        charge_data['updated_by'] = request.user.username
                        charge_instance = get_object_or_none(DeliveryTransportTypeCharge, {'id': charge_id})
                        charge_serializer = self.serializer_class(charge_instance, data=charge_data)
                    else:
                        charge_data['created_by'] = request.user.username
                        charge_data['updated_by'] = request.user.username
                        charge_data['delivery_transport_type'] = delivery_transport_type.id
                        charge_serializer = self.serializer_class(data=charge_data, partial=True)
                    if charge_serializer.is_valid():
                        charge_serializer.save()
                    else:
                        has_errors = True
                        charge_error = charge_serializer.errors
                    charge_wise_errors.append(charge_error)
            if has_errors:
                transaction.set_rollback(True)

        if has_errors:
            return_status = status.HTTP_400_BAD_REQUEST
            errors['charges'] = charge_wise_errors
        else:
            if deleted_charge_ids:
                DeliveryTransportTypeCharge.objects.filter(id__in=deleted_charge_ids).delete()

        return Response(data=errors, status=return_status)
    

class TransportDeliveryDateTrackingExportStateChangeView(views.APIView):
    
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get(self, request, *args, **kwargs):
        return_status = status.HTTP_200_OK
        data = {}
        new_state = request.GET.get('state', None)
        transport_delivery_date_tracking = get_object_or_404(TransportDeliveryDateTracking, pk=kwargs['delivery_tracking_id'])
        has_error, errors, transport_delivery_date_tracking = transport_delivery_date_tracking.export_tracking_move_to_state(new_state)
        if has_error:
            data['errors'] = errors
            return_status = status.HTTP_400_BAD_REQUEST
        else:
            data = TransportDeliveryDateTrackingListSerializer(transport_delivery_date_tracking).data
        return Response(data=data, status=return_status)
    

class TransportExportAutoConsolidate(views.APIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE]

    def get(self, request, *args, **kwargs):

        return_status = status.HTTP_200_OK
        from transport.scripts.transport_auto_consoilidate.auto_consoildate import PurchaseOrderDeliveryAutoConsolidate
        purchase_order_delivery_auto_consolidate_errors = PurchaseOrderDeliveryAutoConsolidate().purchase_order_delivery_auto_consolidate()
        if purchase_order_delivery_auto_consolidate_errors:
            return_status = status.HTTP_400_BAD_REQUEST

        return Response(data=purchase_order_delivery_auto_consolidate_errors, status=return_status)
    

class POClubPurchaseOrderDeliveryListView(generics.ListAPIView):

    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]
    serializer_class = PurchaseOrderDeliverySerializer

    def get_field_list(self):

        field_list = [
            {'field_name': 'shipping_method', 'field_type': 'text', 'front_end_field_name': 'shipping_method'},
            {'field_name': 'purchase_order__customer__name', 'field_type': 'text', 'front_end_field_name': 'customer'},
            {'field_name': 'outgoing_commercial_invoice__incoterm', 'field_type': 'text', 'front_end_field_name': 'incoterm'},
            {'field_name': 'delivery_date', 'field_type': 'date', 'front_end_field_name': 'delivery_date'},
        ]
        return field_list

    def get_queryset(self):
        
        po_club_id = self.kwargs.get('po_club_id', None)
        qs = PurchaseOrderDelivery.objects.filter(transport_delivery_date_tracking=None, purchase_order__actual_po_club__id=po_club_id)

        field_list = self.get_field_list()
        qs = search_qs_from_global_filter_v2(qs, field_list, self.request, PurchaseOrderDelivery)

        display_number = self.request.query_params.get('display_number', None)
        costing = self.request.query_params.get('costing', None)
        po_club = self.request.query_params.get('po_club', None)
        purchase_order = self.request.query_params.get('purchase_order', None)

        if display_number:
            qs = list(qs)
            qs = [obj for obj in qs if display_number.lower() in obj.display_number.lower()]

        if costing:
            qs = list(qs)
            qs = [obj for obj in qs if obj.purchase_order.costing_version is not None and costing.lower() in obj.purchase_order.costing_version.version_display_number.lower()]

        if po_club:
            qs = list(qs)
            qs = [obj for obj in qs if obj.purchase_order.actual_po_club is not None and po_club.lower() in obj.purchase_order.actual_po_club.display_number.lower()]

        if purchase_order:
            qs = list(qs)
            qs = [obj for obj in qs if purchase_order.lower() in obj.purchase_order.display_number.lower()]

        return list(qs)
    
    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)


class TransportExportPOClubPlanActualView(views.APIView):
    
    permission_classes = (HasPermission, )
    write_roles = [TRANSPORT_ADMIN_ROLE, ]

    def get_purchase_order_delivery_plan_events(self, purchase_order_delivery):
        
        transport_tracking = purchase_order_delivery.transport_delivery_date_tracking
        plan_events = [
            {
                'event_name': 'Our Door',
                'event_type': purchase_order_delivery.purchase_order.plant.address.get_verbose_address() if purchase_order_delivery.purchase_order.plant.address else None,
                'event_date': purchase_order_delivery.delivery_date
            },
            {
                'event_name': 'Our Port',
                'event_type': transport_tracking.local_port.name if transport_tracking.local_port else None,
                'event_date': transport_tracking.local_port_expected_date
            },
            {
                'event_name': 'Customer Port',
                'event_type': transport_tracking.foreign_port.name if transport_tracking.foreign_port else None,
                'event_date': transport_tracking.foreign_port_expected_date
            },
            {
                'event_name': 'Customer Door',
                'event_type': transport_tracking.customer_door_address.get_verbose_address() if transport_tracking.customer_door_address else None,
                'event_date': transport_tracking.customer_door_expected_date
            }
        ]
        return plan_events
    
    def get_po_pack_cost(self, purchase_order_delivery):

        purchase_order_delivery_packs = PurchaseOrderDeliveryPack.objects.filter(purchase_order_delivery__id=purchase_order_delivery.id)
        plan_value = 0.00
        actual_value = 0.00
        for delivery_pack in purchase_order_delivery_packs:
            planed_delivery_pack_quantity = delivery_pack.quantity
            actual_delivery_pack_quantity = delivery_pack.shipped_quantity
            delivery_po_pack_cost = delivery_pack.po_pack.normalized_requested_cost
            plan_value += planed_delivery_pack_quantity*delivery_po_pack_cost
            actual_value += actual_delivery_pack_quantity*delivery_po_pack_cost

        return plan_value, actual_value
    
    def get_planed_po_packs(self, purchase_order_delivery):

        purchase_order_delivery_packs = PurchaseOrderDeliveryPack.objects.filter(purchase_order_delivery__id=purchase_order_delivery.id)
        po_pack_ids = purchase_order_delivery_packs.values_list('po_pack_id', flat=True)

        plan_po_packs = []
        for po_pack_id in po_pack_ids:
            po_pack_details = {}
            po_pack_details['id'] = po_pack_id
            po_pack = get_object_or_none(POPack, {'id': po_pack_id})
            po_pack_details['name'] = po_pack.get_po_pack_display()

            delivery_packs = purchase_order_delivery_packs.filter(po_pack__id=po_pack_id)
            pack_quantity = 0
            for delivery_pack in delivery_packs:
                pack_quantity += delivery_pack.quantity

            po_pack_details['quantity'] = pack_quantity
            plan_po_packs.append(po_pack_details)

        return plan_po_packs
    
    def get_po_detail(self, purchase_order_delivery):

        po_packs = []
        purchase_order_delivery_packs = purchase_order_delivery.purchaseorderdeliverypack_set.all()
        po_quantity = 0
        for purchase_order_delivery_pack in purchase_order_delivery_packs:
            po_pack_detail = {}
            po_pack_items = purchase_order_delivery_pack.po_pack.popackitem_set.all()
            po_pack_item_details = []
            for po_pack_item in po_pack_items:
                po_pack_item_detail = {}
                po_pack_item_detail['po_pack_item'] = po_pack_item.get_po_pack_item_display()
                po_pack_item_detail['colorway'] = po_pack_item.po_pack.po_colorway.colorway
                po_pack_item_detail['size'] = po_pack_item.po_pack.po_size.po_size_name
                po_pack_item_detail['quantity'] = po_pack_item.po_pack.quantity
                po_quantity += po_pack_item.po_pack.quantity
                po_pack_item_details.append(po_pack_item_detail)

            po_pack_detail['po_pack_number'] = purchase_order_delivery_pack.po_pack.get_po_pack_display()
            po_pack_detail['po_pack_quantity'] = purchase_order_delivery_pack.shipped_quantity
            po_pack_detail['po_pack_items'] = po_pack_item_details
            po_packs.append(po_pack_detail)
        
        po_detail = {
            'po_id': purchase_order_delivery.purchase_order.id,
            'po_number': purchase_order_delivery.purchase_order.display_number,
            'quantity': po_quantity,
            'po_packs': po_packs,
        }
        return po_detail

    def get_purchase_order_delivery_details(self, purchase_order_delivery):
        
        planed_value, actual_value = self.get_po_pack_cost(purchase_order_delivery)
        purchase_order_delivery_details = {

            'plan_delivery_name': purchase_order_delivery.display_number,
            'plan_delivery_mode': purchase_order_delivery.get_shipping_method_display(),
            'country': purchase_order_delivery.purchase_order.customer.address.country.name,
            'incoterms_type': purchase_order_delivery.outgoing_commercial_invoice.incoterm,
            'plan_value': planed_value,
            'actual_value': actual_value,
            'customer': purchase_order_delivery.purchase_order.customer.id,
            'customer_name': purchase_order_delivery.purchase_order.customer.name,
            'plan_events': self.get_purchase_order_delivery_plan_events(purchase_order_delivery),
            'plan_po_packs': self.get_planed_po_packs(purchase_order_delivery),
            'po_detail': self.get_po_detail(purchase_order_delivery)

        }
        return purchase_order_delivery_details

    def get_actual_events(self, transport_tracking):

        actual_events = [
            {
                'event_name': 'Our Door',
                'event_type': transport_tracking.get_start_locations(),
                'event_date': transport_tracking.actual_expected_delivery_date,
                'delayed': transport_tracking.is_our_door_delayed(),
                'number_of_delayed_days': transport_tracking.our_door_delayed_days(),
                'delay_reason': transport_tracking.expected_delivery_date_delay_reason,
            },
            {
                'event_name': 'Our Port',
                'event_type': transport_tracking.local_port.name if transport_tracking.local_port else None,
                'event_date': transport_tracking.actual_local_port_date,
                'delayed': transport_tracking.is_our_port_delayed(),
                'number_of_delayed_days': transport_tracking.our_port_delayed_days(),
                'delay_reason': transport_tracking.local_port_date_delay_reason,
            },
            {
                'event_name': 'Customer Port',
                'event_type': transport_tracking.foreign_port.name if transport_tracking.foreign_port else None,
                'event_date': transport_tracking.actual_foreign_port_date,
                'delayed': transport_tracking.is_foreign_port_delayed(),
                'number_of_delayed_days': transport_tracking.foreign_port_delayed_days(),
                'delay_reason': transport_tracking.foreign_port_date_delay_reason,
            },
            {
                'event_name': 'Customer Door',
                'event_type': transport_tracking.customer_door_address.get_verbose_address() if transport_tracking.customer_door_address else None,
                'event_date': transport_tracking.actual_customer_door_expected_date,
                'delayed': transport_tracking.is_customer_door_delayed(),
                'number_of_delayed_days': transport_tracking.customer_door_delayed_days(),
                'delay_reason': transport_tracking.customer_door_delivery_date_delay_reason,
            },
        ]

        return actual_events
    
    def get_tracking_po_pack_cost(self, transport_tracking):

        purchase_order_deliveries = transport_tracking.export.all()
        purchase_order_delivery_pack = PurchaseOrderDeliveryPack.objects.filter(purchase_order_delivery__in=purchase_order_deliveries)

        actual_value = 0.00
        for delivery_pack in purchase_order_delivery_pack:
            actual_delivery_pack_quantity = delivery_pack.shipped_quantity
            delivery_po_pack_cost = delivery_pack.po_pack.normalized_requested_cost
            actual_value += actual_delivery_pack_quantity*delivery_po_pack_cost

        return actual_value
    
    def get_tracking_po_packs(self, transport_tracking):

        purchase_order_deliveries = transport_tracking.export.all()
        purchase_order_delivery_packs = PurchaseOrderDeliveryPack.objects.filter(purchase_order_delivery__in=purchase_order_deliveries)
        po_pack_ids = purchase_order_delivery_packs.values_list('po_pack_id', flat=True)

        plan_po_packs = []
        for po_pack_id in po_pack_ids:
            po_pack_details = {}
            po_pack_details['id'] = po_pack_id
            po_pack = get_object_or_none(POPack, {'id': po_pack_id})
            po_pack_details['name'] = po_pack.get_po_pack_display()

            delivery_packs = purchase_order_delivery_packs.filter(po_pack__id=po_pack_id)
            pack_quantity = 0
            for delivery_pack in delivery_packs:
                pack_quantity += delivery_pack.shipped_quantity

            po_pack_details['quantity'] = pack_quantity
            plan_po_packs.append(po_pack_details)

        return plan_po_packs
    
    def get_delivery_transport_type_charges(self, transport_tracking):

        charge_details = {
            'our_door_to_our_port_total': {
                'amount': 0,
                'amount_currency': None,
                'amount_currency_display': None
            },
            'our_door_to_our_port': [],
            'our_port_to_customer_port_total': {
                'amount': 0,
                'amount_currency': None,
                'amount_currency_display': None
            },
            'our_port_to_customer_port': [],
            'customer_port_to_customer_door_total': {
                'amount': 0,
                'amount_currency': None,
                'amount_currency_display': None
            },
            'customer_port_to_customer_door': []
        }

        charges_keywords = {
            'exw': 'customer_port_to_customer_door',
            'fob': 'our_port_to_customer_port', 
            'cif': 'our_port_to_customer_port' 
        }

        delivery_transport_types = transport_tracking.deliverytransporttype_set.all()
        for delivery_transport_type in delivery_transport_types:
            delivery_transport_type_charges = delivery_transport_type.deliverytransporttypecharge_set.all()
            for delivery_transport_type_charge in delivery_transport_type_charges:
                charge_entity = delivery_transport_type_charge.get_copied_from_entity_object()
                if charge_entity:
                    stage = charges_keywords.get(charge_entity.costing_type, None)
                    if stage:
                        charge_detail = {
                            'name': delivery_transport_type_charge.charge_name,
                            'amount': delivery_transport_type_charge.calculated_amount,
                            'amount_currency': delivery_transport_type_charge.calculated_amount_currency
                        }
                        self.add_charge(stage, charge_details, charge_detail)
                        charge_details['{}_total'.format(stage)]['amount'] += delivery_transport_type_charge.calculated_amount
                        #charge_details['{}_total'.format(stage)]['amount'] += delivery_transport_type_charge.calculated_amount
        return charge_details
    
    def add_charge(self, stage, charge_details, charge_detail):
        found = False
        for data in charge_details[stage]:
            if data['name'] == charge_detail['name']:
                data['amount'] += charge_detail['amount']
                found = True
                break
        if not found:
            charge_details[stage].append(charge_detail)
    
    def get_transport_tracking_details(self, transport_tracking):
        
        po_details = []
        purchase_order_deliveries = transport_tracking.export.all()
        for purchase_order_delivery in purchase_order_deliveries:
            po_details.append(self.get_po_detail(purchase_order_delivery))

        transport_tracking_details = {
            'actual_delivery_name': transport_tracking.transport_delivery_date_tracking_display_number,
            'actual_delivery_mode': transport_tracking.get_transport_mode_display(),
            'actual_events': self.get_actual_events(transport_tracking),
            'actual_po_packs': self.get_tracking_po_packs(transport_tracking),
            'delivery_chargers': self.get_delivery_transport_type_charges(transport_tracking),
            'po_details': po_details
        }
        return transport_tracking_details
    
    def get(self, request, *args, **kwargs):
        
        data = []
        po_club = get_object_or_404(ActualPOClub, pk=kwargs.get('po_club_id', None))
        if po_club:
            purchase_order_deliveries = PurchaseOrderDelivery.objects.filter(purchase_order__actual_po_club__id=po_club.id)
            queryset = TransportDeliveryDateTracking.objects.filter(export__in=purchase_order_deliveries).distinct()

            if isinstance(queryset, TransportDeliveryDateTracking):
                transport_delivery_trackings = [queryset]
            else:
                transport_delivery_trackings = list(queryset)
            if transport_delivery_trackings:
                for transport_tracking in transport_delivery_trackings:
                    transport_tracking_details = {}
                    transport_tracking_details['id'] = transport_tracking.id
                    plan_deliveries = []
                    transport_tracking_purchase_order_deliveries = purchase_order_deliveries.filter(transport_delivery_date_tracking=transport_tracking)
                    for purchase_order_delivery in transport_tracking_purchase_order_deliveries:
                        plan_deliveries.append(self.get_purchase_order_delivery_details(purchase_order_delivery))
                    transport_tracking_details['plan_deliveries'] = plan_deliveries
                    transport_tracking_details['actual_value'] = self.get_tracking_po_pack_cost(transport_tracking)
                    transport_tracking_details['actual_delivery'] = self.get_transport_tracking_details(transport_tracking)
                    data.append(transport_tracking_details)
        
        return Response(data)  
 