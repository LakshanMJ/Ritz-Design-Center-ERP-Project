from rest_framework import serializers
from django.db import models
from materials.serializers.material_serializers import CustomerBrandMaterialBasicSerializer
from transport.models import *
from shared.utils import get_object_or_none
from shared.serializers import AddressSerializer, SupplierLocationPortSerializer, PortSerializer, PlantSerializer, SupplierSerializer
from supplier_po.models import SupplierDeliveryDate
from marketing.models import PurchaseOrderDelivery, OrderCostingVersion, ActualPOClub, PurchaseOrder

class TransportTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = TransportType
        fields = ['id', 'name']


class VehicleTypeSerializer(serializers.ModelSerializer):

    transport_types = TransportTypeSerializer(many=True, read_only=True)
    maximum_volume_unit_display = serializers.CharField(source='get_maximum_volume_unit_display', read_only=True)
    maximum_weight_unit_display = serializers.CharField(source='get_maximum_weight_unit_display', read_only=True)
    transport_cost_currency_display = serializers.CharField(source='get_transport_cost_currency_display', read_only=True)

    class Meta:
        model = VehicleType
        fields = '__all__'


class TransportExWorkChargeNameSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = TransportExWorkChargeName
        fields ='__all__'


class TransportExWorkChargeRangeSerializer(serializers.ModelSerializer):

    class Meta:
        model = TransportExWorkChargeRange
        fields = '__all__'


class TransportExWorkChargeSerializer(serializers.ModelSerializer):
    charge_name = serializers.CharField(source='name.name', read_only=True)
    ex_work_charge_ranges = TransportExWorkChargeRangeSerializer(source = 'transportexworkchargerange_set', many=True, read_only=True)
    supplier_location_port_name = serializers.CharField(source='supplier_location_port.display_name', read_only=True)
    port = serializers.IntegerField(source='supplier_location_port.port.id', read_only=True)
    supplier_location = serializers.IntegerField(source='supplier_location_port.supplier_location.id', read_only=True)
    cost = serializers.FloatField(source='amount', read_only=True)

    class Meta:
        model = TransportExWorkCharge
        fields = '__all__'


class SupplierDeliveryListSerializer(serializers.ModelSerializer):

    supplier = serializers.SerializerMethodField(read_only=True)
    po_club_display_number = serializers.CharField(source='general_po_supplier.general_po.po_club.display_number', read_only=True)
    po_club = serializers.IntegerField(source='general_po_supplier.general_po.po_club.id', read_only=True)
    customer = serializers.CharField(source='general_po_supplier.general_po.po_club.customer_name', read_only=True)
    costing_version = serializers.CharField(source='general_po_supplier.general_po.costing.version_display_number', read_only=True)
    costing_version_id = serializers.IntegerField(source='general_po_supplier.general_po.costing.id', read_only=True)
    order_id = serializers.IntegerField(source='general_po_supplier.general_po.costing.order.id', read_only=True)
    materials = CustomerBrandMaterialBasicSerializer(source='get_materials', many=True, read_only=True)
    incoterms = serializers.JSONField(source='get_incoterms', read_only=True)
    display_number = serializers.CharField(read_only=True)
    transport_mode = serializers.CharField(source='get_transport_method_display', read_only=True)

    # def get_materials(self, instance):
    #     data = []
    #     for supplier_delivery_date_quantity in instance.supplierdeliverydatequantity_set.all():
    #         material = supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material.verbose_reference_code
    #         data.append(material)
    #     return data
    
    def get_supplier(self, instance):
        data = None
        for supplier_delivery_date_quantity in instance.supplierdeliverydatequantity_set.all():
            supplier = supplier_delivery_date_quantity.material_supplier.supplier_material.supplier.name
            data = supplier
            break
        return data

    class Meta:
        model = SupplierDeliveryDate
        fields = ('__all__')


class DeliveryTransportTypeListSerializer(serializers.ModelSerializer):

    display_number = serializers.CharField(read_only=True)
    customers = serializers.SerializerMethodField(read_only=True)
    suppliers = serializers.SerializerMethodField(read_only=True)
    po_clubs = serializers.SerializerMethodField(read_only=True)
    warehouse = serializers.CharField(source='transport_delivery_date_tracking.freight_forwarder_local_warehouse.name', read_only=True)
    incoterms = serializers.SerializerMethodField(read_only=True)
    # local_forwarder = serializers.CharField(source='', read_only=True)
    plant_in_date = serializers.DateField(source='transport_delivery_date_tracking.expected_delivery_date', read_only=True)
    items = serializers.JSONField(source='get_materials', read_only=True)
    materials = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DeliveryTransportType
        fields = '__all__'

    def get_customers(self, instance):
        customers = []
        supplier_delivery_dates = instance.transport_delivery_date_tracking.get_supplier_delivery_dates()
        for supplier_delivery_date in supplier_delivery_dates:
            customers.append(
                supplier_delivery_date.general_po_supplier.general_po.po_club.customer_name
            )
        customers = set(customers)     
        return customers
    
    def get_suppliers(self, instance):
        suppliers = []
        supplier_delivery_dates = instance.transport_delivery_date_tracking.get_supplier_delivery_dates()
        for supplier_delivery_date in supplier_delivery_dates:
            suppliers.append(
                supplier_delivery_date.general_po_supplier.supplier.name
            )
        suppliers = set(suppliers)
        return suppliers
    
    def get_po_clubs(self, instance):
        po_clubs = []
        supplier_delivery_dates = instance.transport_delivery_date_tracking.get_supplier_delivery_dates()
        for supplier_delivery_date in supplier_delivery_dates:
            po_clubs.append(
                supplier_delivery_date.general_po_supplier.general_po.po_club.display_number
            )
        po_clubs = set(po_clubs)
        return po_clubs
    
    def get_incoterms(self, instance):
        incoterms = []
        supplier_delivery_dates = instance.transport_delivery_date_tracking.get_supplier_delivery_dates()
        for supplier_delivery_date in supplier_delivery_dates:
            supplier_delivery_date_quantities = supplier_delivery_date.supplierdeliverydatequantity_set.all()
            for supplier_delivery_date_quantity in supplier_delivery_date_quantities:
                incoterm = supplier_delivery_date_quantity.material_supplier.get_incoterm_display()
                if incoterm:
                    incoterms.append(incoterm)

        incoterms = set(incoterms)
        return incoterms
    
    def get_materials(self, instance):
        supplier_delivery_dates = instance.transport_delivery_date_tracking.get_supplier_delivery_dates()

        materials = []
        for supplier_delivery_date in supplier_delivery_dates:
            supplier_delivery_date_quantity = supplier_delivery_date.supplierdeliverydatequantity_set.all()
            for supplier_delivery_date_quantity in supplier_delivery_date_quantity:
                materials.append(supplier_delivery_date_quantity.material_supplier.supplier_material.customer_brand_material)
        materials = list(set(materials))
        return CustomerBrandMaterialBasicSerializer(materials, many=True).data
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # data['id'] = data.pop('transport_type', None)
        volume = data.pop('volume', None)
        volume_unit = data.pop('volume_unit', None)
        volume_unit_display = instance.get_volume_unit_display()
        data['volume'] = {
            'volume': volume,
            'volume_unit': volume_unit,
            'volume_unit_display': volume_unit_display
        }
        weight = data.pop('weight', None)
        weight_unit = data.pop('weight_unit', None)
        weight_unit_display = instance.get_weight_unit_display()
        data['weight'] = {
            'weight': weight,
            'weight_unit': weight_unit,
            'weight_unit_display': weight_unit_display
        }
        return data


class ContainerDeliverySerializer(serializers.ModelSerializer):

    class Meta:
        model = ContainerDelivery
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        validation_fields = [
            'volume',
            'volume_unit',
            'weight',
            'weight_unit',
        ]
        for field in validation_fields:
            self.fields[field].required = True
            self.fields[field].allow_null = False
            self.fields[field].read_only = False


class ContainerDeliveryExportSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContainerDelivery
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        validation_fields = [
            'volume',
            'volume_unit',
            'weight',
            'weight_unit',
            'purchase_order_delivery'
        ]
        for field in validation_fields:
            self.fields[field].required = True
            self.fields[field].allow_null = False
            self.fields[field].read_only = False


class DeliveryTransportTypeSerializer(serializers.ModelSerializer):

    display_number = serializers.CharField(read_only=True)
    deliveries = ContainerDeliverySerializer(source='get_container_deliveries', read_only=True, many=True)

    volume_fields = ['volume', 'volume_unit']
    weight_fields = ['weight', 'weight_unit']
    class Meta:
        model = DeliveryTransportType
        fields = ['id', 'name', 'transport_type', 'transport_delivery_date_tracking', 'display_number', 'deliveries']
    
    def __init__(self, *args, **kwargs):
        transport_mode = kwargs.pop('transport_mode', None)
        if transport_mode:
            if transport_mode in [TRANSPORT_MODE_SEA, TRANSPORT_MODE_LAND]:
                self.Meta.fields.extend(self.volume_fields)
            elif transport_mode in [TRANSPORT_MODE_AIR]:
                self.Meta.fields.extend(self.weight_fields)

        super().__init__(*args, **kwargs)

        # if transport_mode:
        #     for field in self.Meta.fields:
        #         self.fields[field].required = True
        #         self.fields[field].allow_null = False
        #         self.fields[field].read_only = False
        # self.fields['transport_delivery_date_tracking'].required = False
        # self.fields['display_number'].required = False
        # self.fields['display_number'].read_only = True
        # self.fields['id'].required = False
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # data['id'] = data.pop('transport_type', None)
        volume = data.pop('volume', None)
        volume_unit = data.pop('volume_unit', None)
        volume_unit_display = instance.get_volume_unit_display()
        data['volume'] = {
            'volume': volume,
            'volume_unit': volume_unit,
            'volume_unit_display': volume_unit_display
        }
        return data
    
    def to_internal_value(self, data):
        volume_data = data.get('volume', {})
        # data['transport_type'] = data.get('id', None)
        if isinstance(volume_data, dict):
            data['volume'] = volume_data.get('volume', None)
            data['volume_unit'] = volume_data.get('volume_unit', None)
        return super().to_internal_value(data)    
    


class TransportDeliveryDateTrackingSerializer(serializers.ModelSerializer):

    transport_types = DeliveryTransportTypeSerializer(source='deliverytransporttype_set', many=True, read_only=True)
    vendor_door_address = serializers.PrimaryKeyRelatedField(queryset=Address.objects.all(), required=True, allow_null=False)
    vendor_door_expected_shipping_date = serializers.DateField(required=True, allow_null=False)

    class Meta:
        model = TransportDeliveryDateTracking
        fields = ('__all__')

    def __init__(self, *args, **kwargs):
        transport_mode = kwargs.pop('transport_mode', None)
        super().__init__(*args, **kwargs)
        if transport_mode:
            self.fields['transport_types'] = DeliveryTransportTypeSerializer(source='deliverytransporttype_set', many=True, transport_mode=transport_mode)
        elif args:
            if type(args[0]) == self.Meta.model:
                self.fields['transport_types'] = DeliveryTransportTypeSerializer(source='deliverytransporttype_set', many=True, transport_mode=args[0].transport_mode)
        

class TransportDeliveryDateTrackingListSerializer(serializers.ModelSerializer):

    vendor_door_address = AddressSerializer(read_only=True) 
    foreign_port_details = PortSerializer(source='foreign_port', read_only=True)
    local_port_details  = PortSerializer(source='local_port', read_only=True)
    final_location_details = AddressSerializer(source='final_location', read_only=True)
    suppliers = serializers.SerializerMethodField(read_only=True)
    po_club_display_number = serializers.CharField(read_only=True)
    po_club = serializers.IntegerField(source='get_po_club.id', read_only=True)
    customer = serializers.CharField(source='get_po_club.customer_name', read_only=True)
    costing_version_display_number = serializers.CharField(source='get_general_po_supplier.general_po.costing.version_display_number', read_only=True)
    costing_version = serializers.IntegerField(source='get_general_po_supplier.general_po.costing.id', read_only=True)
    order_id = serializers.IntegerField(source='get_general_po_supplier.general_po.costing.order.id', read_only=True)
    transport_delivery_date_tracking_display_number = serializers.CharField(read_only=True)
    transport_types = DeliveryTransportTypeSerializer(source='deliverytransporttype_set', many=True, read_only=True)
    selected_deliveries = SupplierDeliveryListSerializer(source='supplierdeliverydate_set', many=True, read_only=True)
    number_of_containers = serializers.IntegerField(read_only=True)
    materials = serializers.SerializerMethodField(read_only=True)
    air_volume = serializers.FloatField(source='freight_volume', read_only=True)
    air_volume_unit = serializers.CharField(source='freight_volume_unit', read_only=True)
    air_weight = serializers.FloatField(source='freight_weight', read_only=True)
    air_weight_unit = serializers.CharField(source='feight_weight_unit', read_only=True)
    air_deliveries = ContainerDeliverySerializer(source='get_container_deliveries', read_only=True, many=True)

    def get_suppliers(self, transport_delivery_date_tracking):
        suppliers = transport_delivery_date_tracking.get_suppliers()
        return [supplier.name for supplier in suppliers]

    def get_materials(self, transport_delivery_date_tracking):
        materials = []
        for supplier_delivery_date in transport_delivery_date_tracking.supplierdeliverydate_set.all():
            for material in supplier_delivery_date.supplierdeliverydatequantity_set.all():
                materials.append(material.material_display_name)
        materials = set(materials)
        return materials

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if args:
            if type(args[0]) == self.Meta.model:
                self.fields['transport_types'] = DeliveryTransportTypeSerializer(source='deliverytransporttype_set', many=True, transport_mode=args[0].transport_mode)

    class Meta:
        model = TransportDeliveryDateTracking
        fields = ('__all__')


class TypeMetaSerializer(serializers.Serializer):

    type = serializers.CharField()
    name = serializers.CharField()

    def to_representation(self, instance):
        return {
            'type': instance[0],
            'name': instance[1]
        }

    class Meta:
        fields = '__all__'


class VolumeUnitSerializer(serializers.Serializer):

    unit = serializers.CharField()
    display = serializers.CharField()

    def to_representation(self, instance):
        return {
            'unit': instance[0],
            'display': instance[1]
        }

    class Meta:
        fields = '__all__'


class WeightUnitSerializer(serializers.Serializer):

    unit = serializers.CharField()
    display = serializers.CharField()

    def to_representation(self, instance):
        return {
            'unit': instance[0],
            'display': instance[1]
        }
    
    class Meta:
        fields = '__all__'


class FreightTypeSerialiser(serializers.Serializer):

    type = serializers.CharField()
    name = serializers.CharField()

    def to_representation(self, instance):
        return {
            'type': instance[0],
            'name': instance[1]
        }
    
    class Meta:
        fields = '__all__'


class TransportTypeMetaSetialiser(TransportTypeSerializer):

    volume = serializers.JSONField(source='get_volume_if_single_vehicle_type', read_only=True)

    class Meta:
        model = TransportType
        fields = ['id', 'name', 'volume']


class DistanceUnitSerializer(serializers.Serializer):
    unit = serializers.CharField()
    display = serializers.CharField()

    def to_representation(self, instance):
        return {
            'unit': instance[0],
            'display': instance[1]
        }

    class Meta:
        fields = '__all__'


class CurrencySerializer(serializers.Serializer):

    currency = serializers.CharField()
    display = serializers.CharField()

    def to_representation(self, instance):
        return {
            'currency': instance[0],
            'display': instance[1]
        }

    class Meta:
        fields = '__all__'


class FreightForwarderWarehouseSerialiser(serializers.ModelSerializer):

    country_name = serializers.CharField(source='country.name', read_only=True)

    class Meta:
        model = FreightForwarderWarehouse
        fields = '__all__'


class FreightForwarderSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    ports = serializers.SerializerMethodField(read_only=True)
    freight_forwarder_warehouses = FreightForwarderWarehouseSerialiser(source='freightforwarderwarehouse_set', many=True, read_only=True)
    display_number = serializers.CharField(read_only=True)

    class Meta:
        model = FreightForwarder
        fields = '__all__'
    
    def get_ports(self, instance):
        ports = instance.ports.all()
        return PortSerializer(ports, many=True).data


class TransportChangeReasonMetaSerializer(serializers.Serializer):

    def to_representation(self, instance):
        data = {
            location[0]: {
                trade_type[0]: {
                    category[0]:[
                        {
                            'value': reason.id,
                            'display_value': reason.reason
                        }
                        for reason in instance.filter(
                            location=location[0],
                            trade_type=trade_type[0],
                            reason_category=category[0]
                        )
                    ]
                    for category in TransportChangeReason.REASON_CATEGORY_CHOICES
                }
                for trade_type in TransportChangeReason.TRADE_TYPE_CHOICE
            }
            for location in TransportChangeReason.LOCATION_CHOICES
        }
        return data

    class Meta:
        fields = '__all__'

class TransportDeliveryDateTrackingMetaDataSerializer(serializers.Serializer):

    types = TypeMetaSerializer(many=True, read_only=True)
    volume_units = VolumeUnitSerializer(many=True, read_only=True)
    weight_units = WeightUnitSerializer(many=True, read_only=True)
    freight_types = FreightTypeSerialiser(many=True, read_only=True)
    vendor_door_addresses = AddressSerializer(many=True, read_only=True)
    final_locations = AddressSerializer(many=True, read_only=True)
    transport_types = TransportTypeMetaSetialiser(many=True, read_only=True)
    foreign_ports = PortSerializer(many=True, read_only=True)
    local_ports = PortSerializer(many=True, read_only=True)
    plants = PlantSerializer(many=True, read_only=True)
    distance_units = DistanceUnitSerializer(many=True, read_only=True)
    currencies = CurrencySerializer(many=True, read_only=True)
    freight_forwarders = FreightForwarderSerializer(many=True, read_only=True)
    change_reasons = TransportChangeReasonMetaSerializer(read_only=True)

    class Meta:
        fields = '__all__'


class TransportFixedChargeNameSerializer(serializers.ModelSerializer):

    class Meta:
        model = TransportFixedChargeName
        fields = '__all__'


class TransportFixedChargeSerializer(serializers.ModelSerializer):

    charge_name = serializers.CharField(source='charge_type.name', read_only=True)
    transport_type_name = serializers.CharField(source='transport_type.name', read_only=True)
    costing_type_display = serializers.CharField(source='get_costing_type_display', read_only=True)
    trade_type_display = serializers.CharField(source='get_trade_type_display', read_only=True)
    port_name = serializers.CharField(source='port.name', read_only=True)

    class Meta:
        model = TransportFixedCharge
        fields = '__all__'

class TransportPerUnitChargeNameSerializer(serializers.ModelSerializer):

    class Meta:
        model = TransportPerUnitChargeName
        fields = '__all__'

class TransportPerUnitChargeSerializer(serializers.ModelSerializer):
    charge_name = serializers.CharField(source='charge_type.name', read_only=True)
    transport_type_name = serializers.CharField(source='transport_type.name', read_only=True)
    costing_type_display = serializers.CharField(source='get_costing_type_display', read_only=True)
    trade_type_display = serializers.CharField(source='get_trade_type_display', read_only=True)
    port_name = serializers.CharField(source='port.name', read_only=True)
    charge_currency_display = serializers.CharField(source='get_charge_currency_display', read_only=True)

    class Meta:
        model = TransportPerUnitCharge
        fields = '__all__'


class TransportDeliveryDateTrackingCombinedChargeSerializer(serializers.ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        validation_fields = [
            'charge_name',
            'amount',
            'amount_currency',
        ]
        for field in validation_fields:
            self.fields[field].required = True
            self.fields[field].allow_null = False
            self.fields[field].read_only = False

    class Meta:
        model = DeliveryCombinedCharge
        fields = '__all__'

class TransportDeliveryDateTrackingTypeChargeSerializer(serializers.ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        validation_fields = [
            'charge_name',
            'amount',
            'amount_currency',
        ]
        for field in validation_fields:
            self.fields[field].required = True
            self.fields[field].allow_null = False
            self.fields[field].read_only = False
        self.fields['delivery_transport_type'].required = False
        self.fields['delivery_transport_type'].allow_null = True

    class Meta:
        model = DeliveryTransportTypeCharge
        fields = '__all__'


class FreightForwarderPortSerializer(serializers.ModelSerializer):
    
    port_details = PortSerializer(source='port', read_only=True)
    
    class Meta:
        model = FreightForwarderPort
        fields = '__all__'



class FreightForwarderPortCalanderSerializer(serializers.ModelSerializer):

    class Meta:
        model = FreightForwarderPortCalander
        fields = '__all__'


class DeliveryTransportTypeVehicleSerializer(serializers.ModelSerializer):

    container = serializers.IntegerField(source='delivery_transport_type.id', read_only=True)

    class Meta:
        model = DeliveryTransportTypeVehicle
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        validation_fields = [
            'volume',
            'volume_unit',
        ]
        for field in validation_fields:
            self.fields[field].required = True
            self.fields[field].allow_null = False
            self.fields[field].read_only = False


class TransportVehiclePickupLocationSerializer(serializers.ModelSerializer):

    class Meta:
        model = TransportVehiclePickupLocation
        fields = '__all__'


class TransportVehicleDestinationSerializer(serializers.ModelSerializer):

    class Meta:
        model = TransportVehicleDestination
        fields = '__all__'


class TransportVehicleSerializer(serializers.ModelSerializer):

    lcl_details = DeliveryTransportTypeVehicleSerializer(source='deliverytransporttypevehicle_set', read_only=True, many=True)
    pickup_locations = TransportVehiclePickupLocationSerializer(source='transportvehiclepickuplocation_set', read_only=True, many=True)
    destinations = TransportVehicleDestinationSerializer(source='transportvehicledestination_set', many=True, read_only=True)

    class Meta:
        model = TransportVehicle
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        enable_validation = kwargs.pop('enable_validation', False)
        super().__init__(*args, **kwargs)
        if enable_validation:
            fields = [
                'distance',
                'distance_unit',
                'price_per_distance',
                'price_per_distance_currency',
                'driver_name',
                'driver_contact_number',
                'vehicle_registration_number',
            ]
            for field in fields:
                self.fields[field].allow_null = False
                self.fields[field].required = True
                self.fields[field].read_only = False



class TransportVehicleTrackingSerializer(serializers.ModelSerializer):
    
    delivery_transport_types = serializers.SerializerMethodField(read_only=True)
    vehicle_types = TransportVehicleSerializer(source='transportvehicle_set', read_only=True, many=True)
    number_of_vehicles = serializers.IntegerField(read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    total_cost = serializers.FloatField(read_only=True)
    state_choises = serializers.SerializerMethodField(read_only=True)
    

    def get_state_choises(self, instance):
        return [
            {
                'value': state[0],
                'display': state[1]
            } for state in TransportVehicleTracking.STATES
        ]

    class Meta:
        model = TransportVehicleTracking
        fields = '__all__'

    
    def get_delivery_transport_types(self, instance):
        data = []
        transport_vehicles = instance.transportvehicle_set.all()
        for transport_vehicle in transport_vehicles:
            delivery_transport_type_vehicles = transport_vehicle.deliverytransporttypevehicle_set.all()
            for delivery_transport_type_vehicle in delivery_transport_type_vehicles:
                data.append(delivery_transport_type_vehicle.delivery_transport_type)
        data = list(set(data))
        return DeliveryTransportTypeListSerializer(data, many=True).data


class TransportVehicleTrackingListSerializer(serializers.ModelSerializer):

    display_number = serializers.CharField(read_only=True)
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    warehouses = serializers.JSONField(source='get_warehouses', read_only=True)
    customers = serializers.JSONField(source='get_customers', read_only=True)
    po_clubs = serializers.SerializerMethodField(read_only=True)
    suppliers = serializers.SerializerMethodField(read_only=True)
    incoterms = serializers.JSONField(source='get_incoterms', read_only=True)
    plants = serializers.JSONField(source='get_plants', read_only=True)
    volume = serializers.FloatField(read_only=True)
    volume_unit = serializers.CharField(read_only=True)
    volume_unit_display = serializers.CharField(read_only=True)
    local_forwarders = serializers.JSONField(source='get_local_forwarders', read_only=True)

    
    def get_po_clubs(self, instance):
        po_clubs = instance.get_po_clubs()
        return [po_club.display_number for po_club in po_clubs]
    
    def get_suppliers(self, instance):
        suppliers = instance.get_suppliers()
        return [supplier.name for supplier in suppliers]

    class Meta:
        model = TransportVehicleTracking
        fields = '__all__'

class CostingTypeMetaSerializer(serializers.Serializer):

    costing_type = serializers.CharField()
    display = serializers.CharField()

    def to_representation(self, instance):
        return {
            'costing_type': instance[0],
            'display': instance[1]
        }

    class Meta:
        fields = '__all__'

class TradeTypeMetaSerializer(serializers.Serializer):
    trade_type = serializers.CharField()
    display = serializers.CharField()

    def to_representation(self, instance):
        return {
            'trade_type': instance[0],
            'display': instance[1]
        }

    class Meta:
        fields = '__all__'


class TransportFixedChargeMetaDataSerializer(serializers.Serializer):

    fixed_charge_names = TransportFixedChargeNameSerializer(many=True, read_only=True)
    costing_types = CostingTypeMetaSerializer(many=True, read_only=True)
    trade_types = TradeTypeMetaSerializer(many=True, read_only=True)
    transport_types = TransportTypeSerializer(many=True, read_only=True)
    ports = PortSerializer(many=True, read_only=True)
    currencies = CurrencySerializer(many=True, read_only=True)

    class Meta:
        fields = '__all__'

class TransportPerUnitChargeMetaDataSerializer(serializers.Serializer):
    per_unit_charge_names = TransportPerUnitChargeNameSerializer(many=True, read_only=True)
    costing_types = CostingTypeMetaSerializer(many=True, read_only=True)
    trade_types = TradeTypeMetaSerializer(many=True, read_only=True)
    transport_types = TransportTypeSerializer(many=True, read_only=True)
    ports = PortSerializer(many=True, read_only=True)
    currencies = CurrencySerializer(many=True, read_only=True)

    class Meta:
        fields = '__all__'


class VehicleTypeMetaDataSerializer(serializers.Serializer):
    volume_units = VolumeUnitSerializer(many=True, read_only=True)
    weight_units = WeightUnitSerializer(many=True, read_only=True)
    currencies = CurrencySerializer(many=True, read_only=True)
    transport_types = TransportTypeSerializer(many=True, read_only=True)

    class Meta:
        fields = '__all__'


class PurchaseOrderDeliverySerializer(serializers.ModelSerializer):
    
    purchase_order_delivery = serializers.IntegerField(source='id', read_only=True)
    display_number = serializers.CharField(read_only=True)
    shipping_method_display = serializers.CharField(source='get_shipping_method_display', read_only=True)
    customer = serializers.CharField(source='purchase_order.customer.name', read_only=True)
    costing_id = serializers.IntegerField(source='purchase_order.costing_version.id', read_only=True)
    costing = serializers.CharField(source='purchase_order.costing_version.version_display_number', read_only=True)
    purchase_order_id = serializers.IntegerField(source='purchase_order.id', read_only=True)
    purchase_order = serializers.CharField(source='purchase_order.display_number', read_only=True)
    incoterm = serializers.CharField(source='outgoing_commercial_invoice.incoterm', read_only=True)
    incoterm_display = serializers.CharField(source='outgoing_commercial_invoice.get_incoterm_display', read_only=True)
    po_club_id = serializers.IntegerField(source='purchase_order.actual_po_club.id', read_only=True)
    po_club = serializers.CharField(source='purchase_order.actual_po_club.display_number', read_only=True)

    class Meta:
        model = PurchaseOrderDelivery
        fields = '__all__'


class TransportDeliveryDateExportTrackingCreateUpdateSerializer(TransportDeliveryDateTrackingSerializer):

    vendor_door_address = serializers.PrimaryKeyRelatedField(queryset=Address.objects.all(), required=False, allow_null=True)
    vendor_door_expected_shipping_date = serializers.DateField(required=False, allow_null=True)
    actual_vendor_shipping_date = serializers.DateField(required=False, allow_null=True)
    vendor_shipping_date_delay_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    freight_forwarder_local_warehouse = serializers.PrimaryKeyRelatedField(queryset=FreightForwarderWarehouse.objects.all(), required=True, allow_null=False)
    customer_door_address = serializers.PrimaryKeyRelatedField(queryset=Address.objects.all(), required=True, allow_null=False)

    expected_delivery_date_delay_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    local_port_date_delay_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    foreign_port_date_delay_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    customer_door_delivery_date_delay_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = TransportDeliveryDateTracking
        fields = '__all__'


    def update(self, instance, validated_data, **kwargs):
        validated_data.pop('deliverytransporttype_set', None)  # related_name
        return super().update(instance, validated_data)

    # def update(self, instance, validated_data):
    #     delivery_ids = validated_data.pop('purchase_order_delivery_ids', None)

    #     for attr, value in validated_data.items():
    #         setattr(instance, attr, value)
    #     instance.save()

    #     if delivery_ids is not None:
    #         PurchaseOrderDelivery.objects.filter(
    #             transport_delivery_date_tracking=instance
    #         ).exclude(id__in=delivery_ids).update(transport_delivery_date_tracking=None)

    #         PurchaseOrderDelivery.objects.filter(id__in=delivery_ids).update(
    #             transport_delivery_date_tracking=instance
    #         )

    #     return instance


class TransportDeliveryDateExportTrackingMetaDataSerializer(TransportDeliveryDateTrackingMetaDataSerializer):
    
    customer_door_addresses = AddressSerializer(many=True, read_only=True)


class TransportDeliveryExportDateTrackingListSerializer(TransportDeliveryDateTrackingListSerializer):

    customer_details = serializers.SerializerMethodField(read_only='True')
    class Meta:
        model = TransportDeliveryDateTracking
        fields = ('id', 'transport_delivery_date_tracking_display_number', 'order_id', 'customer_details', 'local_port_details', 'local_port_expected_date', 'actual_local_port_date', 'foreign_port_details', 'foreign_port_expected_date', 'actual_foreign_port_date')

    def get_customer_details(self, instance):

        purchase_order_deliveries = instance.export.all()
        if purchase_order_deliveries.first().purchase_order.customer:
            customer_id = purchase_order_deliveries.first().purchase_order.customer.id
            customer_details = {}
            customer = get_object_or_none(Customer, {'pk': customer_id})
            
            customer_details["customer"] = customer.name
            customer_details["order_id"] = purchase_order_deliveries.first().purchase_order.costing_version.order.id
            customer_details["order_number"] = purchase_order_deliveries.first().purchase_order.costing_version.order.display_number
            purchase_order_deliveries_by_customer = purchase_order_deliveries.filter(purchase_order__customer__name=customer)
            costing_version_ids = {purchase_order_delivery.purchase_order.costing_version.id for purchase_order_delivery in purchase_order_deliveries_by_customer if purchase_order_delivery.purchase_order.costing_version is not None}

            costing_wise_tracking_details = []
            if costing_version_ids:
                for costing_version_id in costing_version_ids:
                    costing_details = {}
                    costing_version = get_object_or_none(OrderCostingVersion, {'pk': costing_version_id})

                    costing_details["costing_version_id"] = costing_version.id
                    costing_details["costing_version"] = costing_version.version_display_number

                    purchase_order_deliveries_by_customer_by_costing = purchase_order_deliveries_by_customer.filter(purchase_order__costing_version__id=costing_version_id)
                    po_club_ids = {purchase_order_delivery.purchase_order.actual_po_club.id for purchase_order_delivery in purchase_order_deliveries_by_customer_by_costing if purchase_order_delivery.purchase_order.actual_po_club is not None}

                    po_club_wise_tracking_details = []
                    if po_club_ids:
                        for po_club_id in po_club_ids:
                            po_club_details = {}
                            po_club = get_object_or_none(ActualPOClub, {'pk': po_club_id})

                            po_club_details["po_club_id"] = po_club.id
                            po_club_details["po_club"] = po_club.display_number

                            purchase_order_deliveries_by_customer_by_costing_by_club = purchase_order_deliveries_by_customer_by_costing.filter(purchase_order__actual_po_club__id=po_club_id)
                            po_ids = {purchase_order_delivery.purchase_order.id for purchase_order_delivery in purchase_order_deliveries_by_customer_by_costing_by_club if purchase_order_delivery.purchase_order is not None}

                            po_wise_tracking_details = []
                            if po_ids:
                                for po_id in po_ids:
                                    po_details = {}
                                    po = get_object_or_none(PurchaseOrder, {'pk': po_id})

                                    po_details["po_id"] = po.id
                                    po_details["po"] = po.display_number

                                    po_wise_tracking_details.append(po_details)

                            po_club_details["purchase_orders"] = po_wise_tracking_details
                            po_club_wise_tracking_details.append(po_club_details)
                
                    costing_details["purchase_order_clubs"] = po_club_wise_tracking_details
                    costing_wise_tracking_details.append(costing_details)

            customer_details["order_costing_versions"] = costing_wise_tracking_details

        return customer_details
    

class TransportDeliveryExportDateTrackingDetailSeializer(TransportDeliveryDateTrackingListSerializer):

    transport_mode_display = serializers.CharField(source='get_transport_mode_display', read_only=True)
    transport_type_display = serializers.CharField(source="get_type_display", read_only=True)
    selected_deliveries = PurchaseOrderDeliverySerializer(source='export', many=True, read_only=True)
    purchase_order_delivery_ids = serializers.SerializerMethodField()

    class Meta:
        model = TransportDeliveryDateTracking
        fields = ('__all__')

    def get_purchase_order_delivery_ids(self, tracking):
        container_deliveries = tracking.get_container_deliveries()
        purchase_order_delivery_ids = {container_delivery.purchase_order_delivery.id for container_delivery in container_deliveries}
        purchase_order_delivery_ids = list(purchase_order_delivery_ids)
        return purchase_order_delivery_ids


class DeliveryTransportTypeCreateSerializer(serializers.ModelSerializer):

    volume = serializers.FloatField(required=True, allow_null=False)
    volume_unit = serializers.CharField(required=True, allow_null=False)
    weight = serializers.FloatField(required=True, allow_null=False)
    weight_unit = serializers.CharField(required=True, allow_null=False)
    class Meta:
        model = DeliveryTransportType
        fields = ('__all__')


class DeliveryTransportTypeAutoConsolidateSerialzer(serializers.ModelSerializer):

    transport_mode = serializers.CharField(required=False, allow_null=True)
    type = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = TransportDeliveryDateTracking
        fields = '__all__'