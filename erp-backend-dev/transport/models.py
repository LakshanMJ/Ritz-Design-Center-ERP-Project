from django.db import models
from shared.helpers.currency_helper import CurrencyHelper
from materials.fieldmetadata.measuring_unit_helpers import DistanceUnitHelper
from shared.models import *
from supplier_po.models import SupplierDeliveryDate


COST_TYPE_RANGE_BASED = 'range_based'
COST_TYPE_FIXED_CHARGE = 'fixed_charge'
COST_TYPE_UNIT_BASED = 'unit_based'

COST_UNIT_PER_KG = 'per_kg'
COST_UNIT_PER_CBM = 'per_cbm'
COST_UNIT_NUMBER_OF_CONTAINERS = 'number_of_containers'

TRANSPORT_MODE_LAND = 'land'
TRANSPORT_MODE_SEA='sea'
TRANSPORT_MODE_AIR= 'air'

TRANSPORT_TYPE_FOB = 'fob'
TRANSPORT_TYPE_CIF = 'cif'
TRANSPORT_TYPE_EXW = 'exw'


class VehicleType(BaseAbstractModel):
    name = models.CharField(max_length=100)
    maximum_volume = models.FloatField()
    maximum_volume_unit = models.CharField(max_length=200, choices=MaterialVolumeUnitHelper.ALL_VOLUME_UNITS, default=MaterialVolumeUnitHelper.CUBIC_METER_UNIT)
    maximum_weight = models.FloatField()
    maximum_weight_unit = models.CharField(max_length=200, choices=MaterialWeightUnitHelper.ALL_WEIGHT_UNITS, default=MaterialWeightUnitHelper.KILOGRAMS_UNIT)
    transport_cost_per_kilometer = models.FloatField()
    transport_cost_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    transport_types = models.ManyToManyField('TransportType')

    def get_normalized_volume_unit(self):
        return MaterialVolumeUnitHelper().get_normalized_volume_unit(self.maximum_volume_unit)

    def get_normalized_weight_unit(self):
        return MaterialWeightUnitHelper().get_normalized_weight_unit(self.maximum_weight_unit)

    def get_normalized_maximum_volume(self):
        volume = 0.00
        normalized_volume_unit = self.get_normalized_volume_unit()
        if normalized_volume_unit and self.maximum_volume_unit and self.maximum_volume:
            volume = MaterialVolumeUnitHelper().convert_volume_to_units(normalized_volume_unit, self.maximum_volume, self.maximum_volume_unit)
        return volume

    def get_normalized_maximum_weight(self):
        weight = 0.00
        normalized_weight_unit = self.get_normalized_weight_unit()
        if normalized_weight_unit and self.maximum_weight_unit and self.maximum_weight:
            weight = MaterialWeightUnitHelper().convert_weight_to_units(normalized_weight_unit, self.maximum_weight, self.maximum_weight_unit)
        return weight

    def get_normalized_compactness(self):
        normalized_compactness = 0.00
        normalized_maximum_volume = self.get_normalized_maximum_volume()
        normalized_maximum_weight = self.get_normalized_maximum_weight()

        if normalized_maximum_volume > 0:
            normalized_compactness = normalized_maximum_weight/normalized_maximum_volume
            normalized_compactness = round(normalized_compactness, 4)

        return normalized_compactness



class TransportType(BaseAbstractModel):
    #FCL-45HQ, FCL-40HQ, FCL-40GP, FCL-20GP, LCL, AIR, Sri Lanka
    name = models.CharField(max_length=100)
    # multiple_vehicle = models.BooleanField(default=False)
    # vehicles = models.ManyToManyField(VehicleType)
    CONTAINER_LOAD_TYPE = 'container'
    AIR_CARGO_LOAD_TYPE = 'air_cargo'
    LAND_CARGO_LOAD_TYPE = 'land_cargo'
    OTHER_CARGO_LOAD_TYPE = 'other_cargo'
    LOAD_TYPE_CHOICES = (
        (CONTAINER_LOAD_TYPE, 'Container Load'),
        (AIR_CARGO_LOAD_TYPE, 'Air Cargo Load'),
        (LAND_CARGO_LOAD_TYPE, 'Land Cargo Load'),
        (OTHER_CARGO_LOAD_TYPE, 'Other Cargo Load')
    )
    load_type = models.CharField(max_length=100, choices=LOAD_TYPE_CHOICES)

    def get_volume_if_single_vehicle_type(self):
        volume = None
        vehicle_types = self.vehicletype_set.all()
        if vehicle_types.count() == 1:
            volume = {
                'volume': vehicle_types[0].maximum_volume,
                'volume_unit': vehicle_types[0].maximum_volume_unit,
                'volume_unit_display': vehicle_types[0].get_maximum_volume_unit_display()
            }
        return volume
    
    def get_transport_cost(self, distance):
        vehicle_types = self.vehicletype_set.all()
        cost = 0.00
        if vehicle_types.count() == 1:
            cost = distance * vehicle_types[0].transport_cost_per_kilometer
        return cost

class TransportFixedChargeName(BaseAbstractModel):
    name = models.CharField(max_length=100)


class TransportPerUnitChargeName(BaseAbstractModel):
    name = models.CharField(max_length=100)


class AbstractTransportCharge(BaseAbstractModel):
    transport_type = models.ForeignKey(TransportType, on_delete=models.CASCADE)
    FOB = 'fob'
    CIF = 'cif'
    EXW = 'exw'
    ALL = 'all'
    COSTING_TYPE_CHOICE = (
        (FOB, 'FOB'),
        (CIF, 'CIF'),
        (EXW, 'EXW'),
        (ALL, 'ALL')
    )
    costing_type = models.CharField(max_length=100, choices=COSTING_TYPE_CHOICE)
    charge = models.FloatField()
    charge_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    IMPORT = 'import'
    EXPORT = 'export'
    TRADE_TYPE_CHOICE = (
        (IMPORT, 'Import'),
        (EXPORT, 'Export')
    )
    trade_type = models.CharField(max_length=100, choices=TRADE_TYPE_CHOICE)
    port = models.ForeignKey(Port, on_delete=models.CASCADE)

    class Meta:
        abstract = True # DO NOT REMOVE THIS LINE


class TransportFixedCharge(AbstractTransportCharge):
    charge_type = models.ForeignKey(TransportFixedChargeName, on_delete=models.CASCADE)


class TransportPerUnitCharge(AbstractTransportCharge):
    charge_type = models.ForeignKey(TransportPerUnitChargeName, on_delete=models.CASCADE)

    def get_cost(self, number_of_units):
        return self.charge*number_of_units

class TransportDistance(BaseAbstractModel):
    pickup_location = models.ForeignKey(Address, on_delete=models.CASCADE, related_name='pickup_location')
    destination = models.ForeignKey(Address, on_delete=models.CASCADE, related_name='destination')
    distance = models.FloatField()


class TransportExWorkChargeName(BaseAbstractModel):

    name = models.CharField(max_length=100)


class TransportExWorkCharge(BaseAbstractModel):

    name = models.ForeignKey(TransportExWorkChargeName, on_delete=models.CASCADE)
    supplier_location_port = models.ForeignKey(SupplierLocationPort, on_delete=models.CASCADE)
    TRANSPORT_MODE_CHOICE = (
        (TRANSPORT_MODE_SEA, 'Sea'),
        (TRANSPORT_MODE_AIR, 'Air')
    )
    transport_mode = models.CharField(max_length=100, choices=TRANSPORT_MODE_CHOICE)
    COST_TYPE_CHOICE = (
        (COST_TYPE_RANGE_BASED, 'Range Based'),
        (COST_TYPE_FIXED_CHARGE, 'Fixed Charge'),
        (COST_TYPE_UNIT_BASED, 'Unit Based')
    )
    cost_type = models.CharField(max_length=100, choices=COST_TYPE_CHOICE)
    amount = models.FloatField(null=True) # only if unit_based and fixed_charge
    amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    COSTING_UNITS_CHOICE = (
        (COST_UNIT_PER_KG, 'Per Kg'),
        (COST_UNIT_PER_CBM, 'Per CBM'),
        (COST_UNIT_NUMBER_OF_CONTAINERS, 'Number of Containers'),
    )
    costing_units = models.CharField(max_length=100, choices=COSTING_UNITS_CHOICE, null=True)

    def get_cost_for_value(self, value, value_unit):
        print('value', value)
        cost = 0.00
        if self.cost_type == COST_TYPE_FIXED_CHARGE:
            cost = self.amount
        elif self.cost_type == COST_TYPE_UNIT_BASED:
            cost = self.amount * value
        elif self.cost_type == COST_TYPE_RANGE_BASED:
            charge_ranges = self.get_charge_ranges()
            for charge_range in charge_ranges:
                if value > charge_range.start_range and value <= charge_range.end_range:
                    if charge_range.cost_type == COST_TYPE_FIXED_CHARGE:
                        cost = charge_range.amount
                    elif charge_range.cost_type == COST_TYPE_UNIT_BASED:
                        cost = charge_range.amount * value
                    break
        return cost
    
    def get_charge_ranges(self):
        return self.transportexworkchargerange_set.all()

class TransportExWorkChargeRange(BaseAbstractModel):

    start_range = models.FloatField()
    end_range = models.FloatField()
    COST_TYPE_CHOICE = (
        (COST_TYPE_FIXED_CHARGE, 'Fixed Charge'),
        (COST_TYPE_UNIT_BASED, 'Unit Based')
    )
    cost_type = models.CharField(max_length=100, choices=COST_TYPE_CHOICE)
    ex_work_cost = models.ForeignKey(TransportExWorkCharge, on_delete=models.CASCADE)
    amount = models.FloatField()
    amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)


class TransportDeliveryDateTracking(BaseAbstractModel):

    vendor_door_address = models.ForeignKey(Address, on_delete=models.CASCADE, related_name='vendor_door_address', null=True) #start address
    vendor_door_expected_shipping_date = models.DateField(null=True) #start expected date
    actual_vendor_shipping_date = models.DateField(null=True) #start actual date
    vendor_shipping_date_delay_reason = models.TextField(null=True)

    foreign_port = models.ForeignKey(Port, on_delete=models.CASCADE, related_name='foreign_port_address', null=True)
    foreign_port_expected_date = models.DateField(null=True)
    actual_foreign_port_date = models.DateField(null=True)
    foreign_port_date_delay_reason = models.TextField(null=True)

    freight_volume = models.FloatField(null=True)
    freight_volume_unit = models.CharField(max_length=200, choices=MaterialVolumeUnitHelper.ALL_VOLUME_UNITS, null=True)
    freight_weight = models.FloatField(null=True)
    freight_weight_unit = models.CharField(max_length=200, choices=MaterialWeightUnitHelper.ALL_WEIGHT_UNITS, null=True)

    local_port = models.ForeignKey(Port, on_delete=models.CASCADE, related_name='local_port_address', null=True)
    local_port_expected_date = models.DateField(null=True)
    actual_local_port_date = models.DateField(null=True)
    local_port_date_delay_reason = models.TextField(null=True)

    expected_delivery_date = models.DateField(null=True)
    actual_expected_delivery_date = models.DateField(null=True)
    expected_delivery_date_delay_reason = models.TextField(null=True)

    customer_door_address = models.ForeignKey(Address, on_delete=models.CASCADE, related_name='customer_door_address', null=True)
    customer_door_expected_date = models.DateField(null=True)
    actual_customer_door_expected_date = models.DateField(null=True)
    customer_door_delivery_date_delay_reason = models.TextField(null=True)
    
    # final_location = models.ForeignKey(Address, on_delete=models.CASCADE, related_name='final_location')
    
    # plant = models.ForeignKey(Plant, on_delete=models.CASCADE, null=True)

    freight_forwarder = models.ForeignKey('transport.FreightForwarder', on_delete=models.SET_NULL, null=True)
    freight_forwarder_local_warehouse = models.ForeignKey('transport.FreightForwarderWarehouse', on_delete=models.SET_NULL, null=True)


    transport_types = models.ManyToManyField(TransportType, through='transport.DeliveryTransportType')

    TRANSPORT_MODE_CHOICE =  (
        (TRANSPORT_MODE_SEA, 'Sea'),
        (TRANSPORT_MODE_AIR, 'Air'),
        (TRANSPORT_MODE_LAND, 'Land')
    )
    transport_mode = models.CharField(max_length=200, choices=TRANSPORT_MODE_CHOICE, null=False)
    TRANSPORT_TYPE_CHOICE = (
        (TRANSPORT_TYPE_FOB, 'FOB'),
        (TRANSPORT_TYPE_CIF, 'CIF'),
        (TRANSPORT_TYPE_EXW, 'EXW')
    )
    type = models.CharField(max_length=200, choices=TRANSPORT_TYPE_CHOICE, null=False)

    DRAFT_STATE = 'draft'
    DELIVERY_INITIATED_STATE = 'initiated'
    DELIVERY_IN_PROGRESS_STATE = 'in_progress'
    DELIVERY_COMPLETED_STATE = 'completed'
    DELIVERY_CANCELED_STATE = 'canceled'

    STATES_SEQUENCE = [
        DRAFT_STATE,
        DELIVERY_INITIATED_STATE,
        DELIVERY_IN_PROGRESS_STATE,
        DELIVERY_COMPLETED_STATE
    ]

    STATES = (
        (DRAFT_STATE, 'Draft'),
        (DELIVERY_INITIATED_STATE, 'Delivery Initiated'),
        (DELIVERY_IN_PROGRESS_STATE, 'Delivery In Progress'),
        (DELIVERY_COMPLETED_STATE, 'Delivery Completed'),
        (DELIVERY_CANCELED_STATE, 'Delivery Canceled')
    )

    state = models.CharField(max_length=200, choices=STATES, default=DRAFT_STATE)

    instructions = models.TextField(null=True)
    change_reasons = models.JSONField(null=True)
    spli_from = models.ForeignKey('self', null=True, on_delete=models.SET_NULL)
    
    @property
    def transport_delivery_date_tracking_display_number(self):
        return f"DTRACK{self.id:06}"
    
    @property
    def number_of_containers(self):
        return self.transport_types.all().count()
    
    @property
    def po_club_display_number(self):
        display_number = None
        po_club = self.get_po_club()
        if po_club:
            display_number = po_club.display_number
        return display_number
    
    def is_supplier_door_delayed(self):
        delayed = False
        plan_date = self.vendor_door_expected_shipping_date
        actual_date = self.actual_vendor_shipping_date
        if plan_date and actual_date:
            if actual_date <= plan_date:
                delayed = False
            else:
                delayed = True

        return delayed
    
    # def calculate_total_weight_and_volume(self):
    #     total_weight = 0.00
    #     total_volume = 0.00
    #     weight_unit = None
    #     volume_unit = None
    #     container_deliveries = self.get_container_deliveries()
    #     for container_delivery in container_deliveries:
    #         total_weight += container_delivery.weight
    #         weight_unit = container_delivery.weight_unit
    #         total_volume += container_delivery.volume
    #         volume_unit = container_delivery.volume_unit
    #     self.freight_volume = total_volume
    #     self.freight_volume_unit = volume_unit
    #     self.freight_weight = total_weight
    #     self.freight_weight_unit = weight_unit
    #     self.save()

    def calculate_total_weight_and_volume(self):
        total_weight = 0.00
        total_volume = 0.00
        normalized_volume_unit = None
        normalized_weight_unit = None
        container_deliveries = self.get_container_deliveries()
        for container_delivery in container_deliveries:
            normalized_volume_unit = MaterialVolumeUnitHelper().get_normalized_volume_unit(container_delivery.volume_unit)
            total_volume += MaterialVolumeUnitHelper().convert_volume_to_units(normalized_volume_unit, container_delivery.volume, container_delivery.volume_unit)
            normalized_weight_unit = MaterialWeightUnitHelper().get_normalized_weight_unit(container_delivery.weight_unit)
            total_weight += MaterialWeightUnitHelper().convert_weight_to_units(normalized_weight_unit, container_delivery.weight, container_delivery.weight_unit)
        self.freight_volume = total_volume
        self.freight_volume_unit = normalized_volume_unit
        self.freight_weight = total_weight
        self.freight_weight_unit = normalized_weight_unit
        self.save()

    def supplier_door_delayed_days(self):
        days = 0
        plan_date = self.vendor_door_expected_shipping_date
        actual_date = self.actual_vendor_shipping_date
        if plan_date and actual_date:
            days = plan_date - actual_date
            days = int(days.days)
        return days
    
    def is_supplier_port_delayed(self):
        delayed = False
        plan_date = self.foreign_port_expected_date
        actual_date = self.actual_foreign_port_date
        if plan_date and actual_date:
            if actual_date <= plan_date:
                delayed = False
            else:
                delayed = True
        return delayed

    def supplier_port_delayed_days(self):
        days = 0
        plan_date = self.foreign_port_expected_date
        actual_date = self.actual_foreign_port_date
        if plan_date and actual_date:
            days = plan_date - actual_date
            days = int(days.days)
        return days
    
    def is_our_port_delayed(self):
        delayed = False
        plan_date = self.local_port_expected_date
        actual_date = self.actual_local_port_date
        if plan_date and actual_date:
            if actual_date <= plan_date:
                delayed = False
            else:
                delayed = True
        return delayed
    
    def our_port_delayed_days(self):
        days = 0
        plan_date = self.local_port_expected_date
        actual_date = self.actual_local_port_date
        if plan_date and actual_date:
            days = plan_date - actual_date
            days = int(days.days)
        return days
    
    def is_our_door_delayed(self):
        delayed = False
        plan_date = self.expected_delivery_date
        actual_date = self.actual_expected_delivery_date
        if plan_date and actual_date:
            if actual_date <= plan_date:
                delayed = False
            else:
                delayed = True
        return delayed
    
    def our_door_delayed_days(self):
        days = 0
        plan_date = self.expected_delivery_date
        actual_date = self.actual_expected_delivery_date
        if plan_date and actual_date:
            days = plan_date - actual_date
            days = int(days.days)
        return days

    def is_customer_door_delayed(self):
        delayed = False
        plan_date = self.customer_door_expected_date
        actual_date = self.actual_customer_door_expected_date
        if plan_date and actual_date:
            if actual_date <= plan_date:
                delayed = False
            else:
                delayed = True
        return delayed
    
    def customer_door_delayed_days(self):
        days = 0
        plan_date = self.customer_door_expected_date
        actual_date = self.actual_customer_door_expected_date
        if plan_date and actual_date:
            days = plan_date - actual_date
            days = int(days.days)
        return days

    def is_foreign_port_delayed(self):
        delayed = False
        plan_date = self.foreign_port_expected_date
        actual_date = self.actual_foreign_port_date
        if plan_date and actual_date:
            if actual_date <= plan_date:
                delayed = False
            else:
                delayed = True
        return delayed
    
    def foreign_port_delayed_days(self):
        days = 0
        plan_date = self.foreign_port_expected_date
        actual_date = self.actual_foreign_port_date
        if plan_date and actual_date:
            days = plan_date - actual_date
            days = int(days.days)
        return days
        
    def get_general_po_suppliers(self):
        general_po_suppliers = []
        supplier_delivery_dates = self.get_supplier_delivery_dates()
        for supplier_delivery_date in supplier_delivery_dates:
            general_po_suppliers.append(supplier_delivery_date.general_po_supplier)
        general_po_suppliers = list(set(general_po_suppliers))
        return general_po_suppliers

    def get_po_clubs(self):

        po_clubs = []
        general_po_suppliers = self.get_general_po_suppliers()
        for general_po_supplier in general_po_suppliers:
            po_clubs.append(general_po_supplier.general_po.po_club)
        po_clubs = list(set(po_clubs))
        return po_clubs

    def get_po_club(self):
        po_club = None
        general_po_supplier = self.get_general_po_supplier()
        if general_po_supplier:
            po_club = general_po_supplier.general_po.po_club
        return po_club
    
    def get_plants(self):
        plants = []
        po_clubs = self.get_po_clubs()
        for po_club in po_clubs:
            if po_club.plant:
                plants.append(po_club.plant)

    def get_general_po_supplier(self):
        general_po_supplier = None
        supplier_delivery_dates = self.get_supplier_delivery_dates()
        if supplier_delivery_dates:
            general_po_supplier = supplier_delivery_dates[0].general_po_supplier
        return general_po_supplier
    
    def get_suppliers(self):
        suppliers = []
        general_po_suppliers = self.get_general_po_suppliers()
        for general_po_supplier in general_po_suppliers:
            suppliers.append(general_po_supplier.supplier)
        suppliers = list(set(suppliers))
        return suppliers

    def get_supplier(self):
        supplier = None
        supplier_delivery_dates = self.supplierdeliverydate_set.all()
        if supplier_delivery_dates.exists():
            supplier = supplier_delivery_dates[0].general_po_supplier.supplier
        return supplier
    
    def get_customer(self):
        purchase_order_deliveries = self.export.all()
        if purchase_order_deliveries.exists():
            customer = purchase_order_deliveries[0].purchase_order.customer
        return customer
    
    def move_to_state(self, new_state):
        has_error = False
        errors = []

        if new_state not in dict(self.STATES).keys():
            has_error = True
            errors.append(f"Invalid state: {new_state}")
        if not has_error:
            current_state = self.state
            current_index = self.STATES_SEQUENCE.index(current_state)
            new_index = self.STATES_SEQUENCE.index(new_state)
            if abs(new_index - current_index) == 1:
                from transport.scripts.transport_cost_calculators import ImportTransportCost
                if new_state == self.DELIVERY_INITIATED_STATE:
                    import_transport_cost = ImportTransportCost(self)
                    import_transport_cost.calculate_import_transport_cost()
                self.state = new_state
                self.save()
            else:
                has_error = True
                errors.append(f"Cannot move directly to state: {dict(self.STATES)[new_state]} from state: {dict(self.STATES)[current_state]}")

        return has_error, errors, self
    
    def export_tracking_move_to_state(self, new_state):
        has_error = False
        errors = []

        if new_state not in dict(self.STATES).keys():
            has_error = True
            errors.append(f"Invalid state: {new_state}")
        if not has_error:
            current_state = self.state
            current_index = self.STATES_SEQUENCE.index(current_state)
            new_index = self.STATES_SEQUENCE.index(new_state)
            if abs(new_index - current_index) == 1:
                from transport.scripts.transport_export_cost_calculations import ExportTransportCost
                if new_state == self.DELIVERY_INITIATED_STATE:
                    import_transport_cost = ExportTransportCost(self)
                    import_transport_cost.calculate_export_transport_cost()
                self.state = new_state
                self.save()
            else:
                has_error = True
                errors.append(f"Cannot move directly to state: {dict(self.STATES)[new_state]} from state: {dict(self.STATES)[current_state]}")

        return has_error, errors, self

    def get_supplier_delivery_dates(self):
        return self.supplierdeliverydate_set.all()
    
    def get_purchase_order_deliveries(self):
        return self.export.all()
    
    def get_materials(self):
        materials = []
        supplier_delivery_dates = self.get_supplier_delivery_dates()
        for supplier_delivery_date in supplier_delivery_dates:
            supplier_delivery_date_quantity = supplier_delivery_date.supplierdeliverydatequantity_set.all()
            for supplier_delivery_date_quantity in supplier_delivery_date_quantity:
                materials.append(supplier_delivery_date_quantity.material_display_name)
        materials = list(set(materials))
        return materials

    def get_invoices(self):
        supplier_delivery_dates = self.get_supplier_delivery_dates()
        invoices = []
        for supplier_delivery_date in supplier_delivery_dates:
            invoice = supplier_delivery_date.get_delivery_invoice()
            if invoice:
                invoices.append(invoice)
        return invoices

    def get_normalized_volume_unit(self):
        return MaterialVolumeUnitHelper().get_normalized_volume_unit(self.freight_volume_unit)

    def get_normalized_weight_unit(self):
        return MaterialWeightUnitHelper().get_normalized_weight_unit(self.freight_weight_unit)

    def get_normalized_volume(self):
        volume = 0.00
        normalized_volume_unit = self.get_normalized_volume_unit()
        if normalized_volume_unit and self.freight_volume_unit and self.freight_volume:
            volume = MaterialVolumeUnitHelper().convert_volume_to_units(normalized_volume_unit, self.freight_volume, self.freight_volume_unit)
        return volume

    def get_normalized_weight(self):
        weight = 0.00
        normalized_weight_unit = self.get_normalized_weight_unit()
        if normalized_weight_unit and self.freight_weight_unit and self.freight_weight:
            weight = MaterialWeightUnitHelper().convert_weight_to_units(normalized_weight_unit, self.freight_weight, self.freight_weight_unit)
        return weight

    def get_normalized_compactness(self):
        normalized_compactness = 0.00
        normalized_volume = self.get_normalized_volume()
        normalized_weight = self.get_normalized_weight()


        if normalized_volume > 0:
            normalized_compactness = normalized_weight/normalized_volume
            normalized_compactness = round(normalized_compactness, 2)

        return normalized_compactness
    
    def get_container_deliveries(self):
        container_deliveries = []
        for delivery_transport_type in self.deliverytransporttype_set.all():
            for container_delivery in delivery_transport_type.get_container_deliveries():
                container_deliveries.append(container_delivery)
        return container_deliveries
    
    def get_air_deliveries(self):
        air_deliveries = []
        delivery_transport_types = self.deliverytransporttype_set.filter(transport_type__name='Air')
        for delivery_transport_type in delivery_transport_types:
            for container_delivery in delivery_transport_type.get_container_deliveries():
                air_deliveries.append(container_delivery)
        return air_deliveries

    def get_final_locations(self):
        final_locations = []
        for container_delivery in self.get_container_deliveries():
            plant = container_delivery.supplier_delivery_date.get_plant()
            if plant:
                final_locations.append(plant.address)

    def get_start_locations(self):
        start_loactions = []
        for container_delivery in self.get_container_deliveries():
            plant = container_delivery.purchase_order_delivery.get_plant()
            if plant:
                start_loactions.append(plant.address)

class DeliveryTransportType(BaseAbstractModel):
    name = models.CharField(max_length=100)
    volume = models.FloatField(null=True)
    volume_unit = models.CharField(max_length=200, choices=MaterialVolumeUnitHelper.ALL_VOLUME_UNITS, default=MaterialVolumeUnitHelper.CUBIC_METER_UNIT, null=True)
    weight = models.FloatField(null=True)
    weight_unit = models.CharField(max_length=200, choices=MaterialWeightUnitHelper.ALL_WEIGHT_UNITS, default=MaterialWeightUnitHelper.KILOGRAMS_UNIT, null=True)
    
    transport_type = models.ForeignKey(TransportType, on_delete=models.DO_NOTHING)
    transport_delivery_date_tracking = models.ForeignKey(TransportDeliveryDateTracking, on_delete=models.CASCADE)


    DRAFT_STATE = 'draft'
    DELIVERY_INITIATED_STATE = 'initiated'
    DELIVERY_IN_PROGRESS_STATE = 'in_progress'
    DELIVERY_COMPLETED_STATE = 'completed'
    DELIVERY_CANCELED_STATE = 'canceled'

    STATES_SEQUENCE = [
        DRAFT_STATE,
        DELIVERY_INITIATED_STATE,
        DELIVERY_IN_PROGRESS_STATE,
        DELIVERY_COMPLETED_STATE
    ]

    STATES = (
        (DRAFT_STATE, 'Draft'),
        (DELIVERY_INITIATED_STATE, 'Delivery Initiated'),
        (DELIVERY_IN_PROGRESS_STATE, 'Delivery In Progress'),
        (DELIVERY_COMPLETED_STATE, 'Delivery Completed'),
        (DELIVERY_CANCELED_STATE, 'Delivery Canceled')
    )

    state = models.CharField(max_length=200, choices=STATES, default=DRAFT_STATE)

    def save(self, *args, **kwargs):
        transport_delivery_date_tracking_compactness = self.transport_delivery_date_tracking.get_normalized_compactness()
        if transport_delivery_date_tracking_compactness> 0:
            normalized_volume = self.get_normalized_volume()
            self.weight = transport_delivery_date_tracking_compactness * normalized_volume
            self.weight_unit = self.transport_delivery_date_tracking.get_normalized_weight_unit()
            self.weight = round(self.weight, 2)
        return super().save(*args, **kwargs)

    @property
    def display_number(self):
        return f"DTT{self.id:06}"
    
    def calculate_volume(self):
        containers = self.get_container_deliveries()
        self.volume = 0.00
        for container in containers:
            if container.volume and container.volume_unit:
                self.volume += container.get_normalized_volume()
                self.volume_unit = container.get_normalized_volume_unit()
                self.volume = round(self.volume, 2)
        self.save()
    
    def get_materials(self):
        return self.transport_delivery_date_tracking.get_materials()


    def get_normalized_volume_unit(self):
        return MaterialVolumeUnitHelper().get_normalized_volume_unit(self.volume_unit)

    def get_normalized_volume(self):
        volume = 0.00
        normalized_volume_unit = self.get_normalized_volume_unit()
        if normalized_volume_unit and self.volume_unit and self.volume:
            volume = MaterialVolumeUnitHelper().convert_volume_to_units(normalized_volume_unit, self.volume, self.volume_unit)
        return volume

    def get_normalized_weight_unit(self):
        return MaterialWeightUnitHelper().get_normalized_weight_unit(self.weight_unit)

    def get_normalized_weight(self):
        weight = 0.00
        normalized_weight_unit = self.get_normalized_weight_unit()
        if normalized_weight_unit and self.weight_unit and self.weight:
            weight = MaterialWeightUnitHelper().convert_weight_to_units(normalized_weight_unit, self.weight, self.weight_unit)
        return weight

    def get_transport_cost(self, distance):
        cost = 0.00
        cost = self.transport_type.get_transport_cost(distance)
        return cost
    
    def get_container_deliveries(self):
        return self.containerdelivery_set.all()
    
    def calculate_total_weight_and_volume(self):
        total_weight = 0.00
        total_volume = 0.00
        normalized_volume_unit = None
        normalized_weight_unit = None
        container_deliveries = self.get_container_deliveries()
        for container_delivery in container_deliveries:
            normalized_volume_unit = MaterialVolumeUnitHelper().get_normalized_volume_unit(container_delivery.volume_unit)
            total_volume += MaterialVolumeUnitHelper().convert_volume_to_units(normalized_volume_unit, container_delivery.volume, container_delivery.volume_unit)
            normalized_weight_unit = MaterialWeightUnitHelper().get_normalized_weight_unit(container_delivery.weight_unit)
            total_weight += MaterialWeightUnitHelper().convert_weight_to_units(normalized_weight_unit, container_delivery.weight, container_delivery.weight_unit)
        self.volume = total_volume
        self.volume_unit = normalized_volume_unit
        self.weight = total_weight
        self.weight_unit = normalized_weight_unit
        self.save()
       
# This Model has breakdown of volume and weight of each container based on delivery
# ex: one container have delivery 2 of po 1 and delivery 1 of po 2
class ContainerDelivery(BaseAbstractModel): 

    delivery_transport_type = models.ForeignKey(DeliveryTransportType, on_delete=models.CASCADE)
    supplier_delivery_date = models.ForeignKey(SupplierDeliveryDate, on_delete=models.CASCADE, null=True)
    purchase_order_delivery = models.ForeignKey('marketing.PurchaseOrderDelivery', on_delete=models.CASCADE, null=True)
    volume = models.FloatField(null=True)
    volume_unit = models.CharField(max_length=200, choices=MaterialVolumeUnitHelper.ALL_VOLUME_UNITS, default=MaterialVolumeUnitHelper.CUBIC_METER_UNIT, null=True)
    weight = models.FloatField(null=True)
    weight_unit = models.CharField(max_length=200, choices=MaterialWeightUnitHelper.ALL_WEIGHT_UNITS, default=MaterialWeightUnitHelper.KILOGRAMS_UNIT, null=True)

    def get_plant(self):
        plant = self.supplier_delivery_date.get_plant()
        return plant
    
    def get_normalized_volume_unit(self):
        return MaterialVolumeUnitHelper().get_normalized_volume_unit(self.volume_unit)
    
    def get_normalized_volume(self):
        normalized_volume_unit = self.get_normalized_volume_unit()
        normalized_volume = 0.00
        if normalized_volume_unit and self.volume and self.volume_unit != normalized_volume_unit:
            normalized_volume = MaterialVolumeUnitHelper().convert_to_units(normalized_volume_unit, self.volume, self.volume_unit)
        elif normalized_volume_unit == self.volume_unit:
            normalized_volume = self.volume
        return normalized_volume

class AbstractDeliveryCharge(BaseAbstractModel):

    charge_name = models.CharField(max_length=100, null=True)
    amount = models.FloatField(null=True)
    amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    calculated_amount = models.FloatField(null=True)
    calculated_amount_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    copied_from_entity = models.CharField(max_length=100, null=True)
    copied_from_entity_id = models.IntegerField(null=True)

    COMBINED_CHARGE = 'combined_charge'
    TRANSPORT_TYPE_CHARGE = 'transport_type_charge'

    class Meta:
        abstract = True

    def get_copied_from_entity_object(self):
        from transport.constants.entities import get_model_by_entity
        entity_object = None
        entity_class = get_model_by_entity(self.copied_from_entity)
        if entity_class:
            entity_object = get_object_or_none(entity_class, {'pk': self.copied_from_entity_id})
        return entity_object

class DeliveryCombinedCharge(AbstractDeliveryCharge):
    transport_delivery_date_tracking = models.ForeignKey(TransportDeliveryDateTracking, on_delete=models.CASCADE)


class DeliveryTransportTypeCharge(AbstractDeliveryCharge):
    delivery_transport_type = models.ForeignKey(DeliveryTransportType, on_delete=models.CASCADE)


class TransportVehicleTracking(BaseAbstractModel):
    DRAFT_STATE = 'draft'
    DELIVERY_INITIATED_STATE = 'initiated'
    DELIVERY_IN_PROGRESS_STATE = 'in_progress'
    DELIVERY_COMPLETED_STATE = 'completed'
    DELIVERY_CANCELED_STATE = 'canceled'

    STATES_SEQUENCE = [
        DRAFT_STATE,
        DELIVERY_INITIATED_STATE,
        DELIVERY_IN_PROGRESS_STATE,
        DELIVERY_COMPLETED_STATE
    ]

    STATES = (
        (DRAFT_STATE, 'Draft'),
        (DELIVERY_INITIATED_STATE, 'Delivery Initiated'),
        (DELIVERY_IN_PROGRESS_STATE, 'Delivery In Progress'),
        (DELIVERY_COMPLETED_STATE, 'Delivery Completed'),
        (DELIVERY_CANCELED_STATE, 'Delivery Canceled')
    )

    state = models.CharField(max_length=200, choices=STATES, default=DRAFT_STATE)
    change_reasons = models.JSONField(null=True)
    split_from = models.ForeignKey('self', null=True, on_delete=models.SET_NULL)

    @property
    def display_number(self):
        return f"LDT{self.id:06}"

    @property
    def number_of_vehicles(self):
        return self.transportvehicle_set.all().count()

    @property
    def total_cost(self):
        total_cost = 0.00
        for transport_vehicle in self.transportvehicle_set.all():
            if transport_vehicle.total_cost:
                total_cost += transport_vehicle.total_cost
        return total_cost

    @property
    def volume(self):
        volume = 0.00
        for transport_vehicle in self.transportvehicle_set.all():
            volume += transport_vehicle.get_total_normalized_volume()
        return volume

    @property
    def volume_unit(self):
        return MaterialVolumeUnitHelper.CUBIC_METER_UNIT

    @property
    def volume_unit_display(self):
        return MaterialVolumeUnitHelper().get_normalized_volume_unit_display(self.volume_unit)

    def get_transport_vehicles(self):
        return self.transportvehicle_set.all()

    def get_warehouses(self):
        warehouses = []
        for transport_vehicle in self.get_transport_vehicles():
            for delivery_transport_type_vehicle in transport_vehicle.get_delivery_transport_type_vehicles():
                warehouse = delivery_transport_type_vehicle.delivery_transport_type.transport_delivery_date_tracking.freight_forwarder_local_warehouse
                if warehouse:
                    warehouses.append(warehouse.name)
        warehouses = list(set(warehouses))
        return warehouses

    def get_po_clubs(self):
        po_clubs = []
        for transport_vehicle in self.get_transport_vehicles():
            for delivery_transport_type_vehicle in transport_vehicle.get_delivery_transport_type_vehicles():
                po_clubs.extend(delivery_transport_type_vehicle.delivery_transport_type.transport_delivery_date_tracking.get_po_clubs())
        po_clubs = set(po_clubs)
        return po_clubs

    def get_customers(self):
        customers = []
        for po_club in self.get_po_clubs():
            customers.append(po_club.customer_name)
        customers = list(set(customers))
        return customers

    def get_suppliers(self):
        suppliers = []
        for transport_vehicle in self.get_transport_vehicles():
            for delivery_transport_type_vehicle in transport_vehicle.get_delivery_transport_type_vehicles():
                suppliers.extend(delivery_transport_type_vehicle.delivery_transport_type.transport_delivery_date_tracking.get_suppliers())
        suppliers = list(set(suppliers))
        return suppliers

    def get_plants(self):
        plants = []
        for transport_vehicle in self.get_transport_vehicles():
            for delivery_transport_type_vehicle in transport_vehicle.get_delivery_transport_type_vehicles():
                for po_club in delivery_transport_type_vehicle.delivery_transport_type.transport_delivery_date_tracking.get_po_clubs():
                    if po_club.plant:
                        plants.append(po_club.plant.name)
        plants = list(set(plants))
        return plants

    def get_incoterms(self):
        incoterms = []
        for transport_vehicle in self.get_transport_vehicles():
            for delivery_transport_type_vehicle in transport_vehicle.get_delivery_transport_type_vehicles():
                incoterms.append(delivery_transport_type_vehicle.delivery_transport_type.transport_delivery_date_tracking.get_type_display())
        incoterms = list(set(incoterms))
        return incoterms

    def get_local_forwarders(self):
        local_forwarders = []
        for transport_vehicle in self.get_transport_vehicles():
            if transport_vehicle.driver_name:
                local_forwarders.append(transport_vehicle.driver_name)
        local_forwarders = list(set(local_forwarders))
        return local_forwarders

class DeliveryTransportTypeVehicle(BaseAbstractModel):
    delivery_transport_type = models.ForeignKey(DeliveryTransportType, on_delete=models.CASCADE)
    transport_vehicle = models.ForeignKey('transport.TransportVehicle', on_delete=models.CASCADE)
    volume = models.FloatField(null=True)
    volume_unit = models.CharField(max_length=200, choices=MaterialVolumeUnitHelper.ALL_VOLUME_UNITS, default=MaterialVolumeUnitHelper.CUBIC_METER_UNIT, null=True)
    allocated_cost = models.FloatField(null=True)

    def get_normalized_volume(self):
        volume = 0.00
        normalized_volume_unit = MaterialVolumeUnitHelper().get_normalized_volume_unit(self.volume_unit)
        if normalized_volume_unit:
            volume = MaterialVolumeUnitHelper().convert_volume_to_units(normalized_volume_unit, self.volume, self.volume_unit)
        return volume

class TransportVehicle(BaseAbstractModel):
    transport_vehicle_tracking = models.ForeignKey(TransportVehicleTracking, on_delete=models.CASCADE)
    # delivery_transport_type = models.ForeignKey(DeliveryTransportType, on_delete=models.CASCADE)
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.CASCADE)
    # pickup_location = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, related_name='pickup_location_transport_vehicle')
    # destination = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, related_name='destination_transport_vehicle')
    distance = models.FloatField(null=True)
    distance_unit = models.CharField(choices=DistanceUnitHelper.ALL_DISTANCE_UNITS, max_length=100, default=DistanceUnitHelper.KILOMETERS_UNIT)
    price_per_distance = models.FloatField(null=True)
    price_per_distance_currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    total_cost = models.FloatField(null=True)
    instructions = models.TextField(null=True)

    #driver information
    driver_name = models.CharField(max_length=200, null=True)
    driver_contact_number = models.CharField(max_length=200, null=True)
    vehicle_registration_number = models.CharField(max_length=200, null=True)
    planned_delivery_date = models.DateField(null=True)
    actual_delivery_date = models.DateField(null=True)

    # def calculate_total_cost(self):
    #     if self.price_per_distance > 0 and self.distance > 0:
    #         self.total_cost = self.price_per_distance * self.distance
    #         self.total_cost = round(self.total_cost, 2)
    #         self.save()
    #         self.calculate_delivery_transport_type_vehicle_allocated_cost()
    
    def calculate_delivery_transport_type_vehicle_allocated_cost(self):
        if self.total_cost > 0:
            delivery_transport_type_vehicles = self.get_delivery_transport_type_vehicles()
            total_normalized_volume = self.get_total_normalized_volume()
            for delivery_transport_type_vehicle in delivery_transport_type_vehicles:
                if delivery_transport_type_vehicle.get_normalized_volume():
                    delivery_transport_type_vehicle.allocated_cost = self.total_cost * (delivery_transport_type_vehicle.get_normalized_volume()/total_normalized_volume)
                    delivery_transport_type_vehicle.save()
    
    def get_delivery_transport_type_vehicles(self):
        return self.deliverytransporttypevehicle_set.all()

    def get_total_normalized_volume(self):
        volume = 0.00
        for delivery_transport_type_vehicle in self.get_delivery_transport_type_vehicles():
            volume += delivery_transport_type_vehicle.get_normalized_volume()
        return volume

    def save(self, *args, **kwargs):
        if self.price_per_distance > 0 and self.distance > 0:
            self.total_cost = self.price_per_distance * self.distance
            self.total_cost = round(self.total_cost, 2)
        return super().save(*args, **kwargs)



class TransportVehiclePickupLocation(AddressAbstractModel):
    transport_vehicle = models.ForeignKey(TransportVehicle, on_delete=models.CASCADE)
    pickup_order = models.IntegerField(null=True)

class TransportVehicleDestination(AddressAbstractModel):
    transport_vehicle = models.ForeignKey(TransportVehicle, on_delete=models.CASCADE)
    destination = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True)
    drop_off_order = models.IntegerField(null=True)


class FreightForwarder(BaseAbstractModel):
    supplier = models.OneToOneField(Supplier, on_delete=models.CASCADE)
    local_warehouses = models.ManyToManyField('transport.FreightForwarderWarehouse', blank=True)
    ports = models.ManyToManyField(Port, through='transport.FreightForwarderPort', blank=True)

    @property
    def display_number(self):
        return f"FF{self.id:06}"

class FreightForwarderPort(BaseAbstractModel):
    freight_forwarder = models.ForeignKey(FreightForwarder, on_delete=models.CASCADE)
    port = models.ForeignKey(Port, on_delete=models.CASCADE)


class FreightForwarderWarehouse(AddressAbstractModel):
    freight_forwarder = models.ForeignKey(FreightForwarder, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=1000, null=True)
    email = models.EmailField(null=True)
    phone_number = models.CharField(max_length=200, null=True)
    address = models.ForeignKey(Address, on_delete=models.CASCADE, null=True)


class FreightForwarderPortCalander(BaseAbstractModel):
    freight_forwarder_port = models.ForeignKey(FreightForwarderPort, on_delete=models.CASCADE)
    cut_off_date = models.DateTimeField()

class PortAlternative(BaseAbstractModel):
    current_port = models.ForeignKey(Port, on_delete=models.CASCADE, related_name='current_port')
    alternative_port = models.ForeignKey(Port, on_delete=models.CASCADE, related_name='alternative_port')


class TransportChangeReason(BaseAbstractModel):
    ALL_TRADES = 'all'
    TRADE_TYPE_CHOICE = (
        *AbstractTransportCharge.TRADE_TYPE_CHOICE,
        (ALL_TRADES, 'All')
    )

    trade_type = models.CharField(max_length=200, choices=TRADE_TYPE_CHOICE)

    FOREIGN = 'foreign'
    LOCAL = 'local'
    ALL_LOCATIONS = 'all'
    LOCATION_CHOICES = (
        (FOREIGN, 'Foreign'),
        (LOCAL, 'Local'),
        (ALL_LOCATIONS, 'All')
    )

    location = models.CharField(max_length=200, choices=LOCATION_CHOICES)

    LOCAL_PORT_CATEGORY = 'local_port'
    FOREIGN_PORT_CATEGORY = 'foreign_port'
    FORWARDER_CATEGORY = 'forwarder'
    TRANSPORT_MODE_CATEGORY = 'transport_mode'
    MERGE_TO_EXISTING_TRANSPORT = 'merge_to_existing_transport'
    REASON_CATEGORY_CHOICES = (
        (LOCAL_PORT_CATEGORY, 'Local Port'),
        (FOREIGN_PORT_CATEGORY, 'Foreign Port'),
        (FORWARDER_CATEGORY, 'Forwarder'),
        (TRANSPORT_MODE_CATEGORY, 'Transport Mode Category'),
        (MERGE_TO_EXISTING_TRANSPORT, 'Merge To Existing Transport')
    )
    reason_category = models.CharField(max_length=200, choices=REASON_CATEGORY_CHOICES)
    reason = models.CharField(max_length=1000)

    
