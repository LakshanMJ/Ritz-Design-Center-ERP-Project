from datetime import timedelta
from django.db.models import Q
from shared.helpers.currency_helper import CurrencyHelper
from transport.models import TransportDeliveryDateTracking, TransportExWorkCharge, SupplierLocationPort, DeliveryTransportTypeCharge, \
    TransportFixedCharge, TransportPerUnitCharge, DeliveryCombinedCharge, TransportDistance, FreightForwarderPort, DeliveryTransportType, \
    VehicleType, TransportVehicleTracking, TransportVehicle, DeliveryTransportTypeVehicle, TransportVehicleDestination, TransportVehiclePickupLocation
from supplier_po.models import SupplierDeliveryDate, SupplierDeliveryDateQuantity
from shared.models import Port

from shared.utils import get_object_or_none, set_attrs


#Transport Modes
from transport.models import TRANSPORT_MODE_AIR, TRANSPORT_MODE_LAND, TRANSPORT_MODE_SEA

#Transport Types
from transport.models import TRANSPORT_TYPE_CIF, TRANSPORT_TYPE_EXW, TRANSPORT_TYPE_FOB

from transport.constants.entities import get_entity_by_model

class ImportTransportCost:

    transport_mode = None
    type = None
    supplier = None

    transport_delivery_date_tracking = None
    unit_category = None

    UNIT_CATEGORY_WEIGHT = 'weight'
    UNIT_CATEGORY_VOLUME = 'volume'

    weight_or_volume_value = 0.00
    weight_or_volume_unit = None

    def __init__(self, transport_delivery_date_tracking):
        if type(transport_delivery_date_tracking) == TransportDeliveryDateTracking:
            self.transport_delivery_date_tracking = transport_delivery_date_tracking
            self.transport_mode = transport_delivery_date_tracking.transport_mode
            self.supplier = transport_delivery_date_tracking.get_supplier()
            self.transport_delivery_date_tracking.calculate_total_weight_and_volume()
            if self.transport_mode in [TRANSPORT_MODE_LAND, TRANSPORT_MODE_SEA]:
                self.unit_category = self.UNIT_CATEGORY_VOLUME
                self.weight_or_volume_value = self.transport_delivery_date_tracking.freight_volume
                self.weight_or_volume_unit = self.transport_delivery_date_tracking.freight_volume_unit
            elif self.transport_mode in [TRANSPORT_MODE_AIR]:
                self.unit_category = self.UNIT_CATEGORY_WEIGHT
                self.weight_or_volume_value = self.transport_delivery_date_tracking.freight_weight
                self.weight_or_volume_unit = self.transport_delivery_date_tracking.freight_weight_unit
            self.type = transport_delivery_date_tracking.type
    
    def weight_based_calculation(self, weight, rate_per_kg):
        if self.unit_category == self.UNIT_CATEGORY_WEIGHT:
            return weight * rate_per_kg
        else:
            raise ValueError("Weight based calculation is not applicable for the current transport mode.")
        
    def volume_based_calculation(self, volume, rate_per_cbm):
        if self.unit_category == self.UNIT_CATEGORY_VOLUME:
            return volume * rate_per_cbm
        else:
            raise ValueError("Volume based calculation is not applicable for the current transport mode.")
    
    def calculate_import_transport_cost(self):
        supplier_door_to_supplier_port_cost = self.get_supplier_door_to_supplier_port_cost()
        supplier_port_to_our_port_cost = self.get_supplier_port_to_our_port_cost()
        our_port_to_factory_cost = self.get_our_port_to_factory_cost()


    def get_supplier_door_to_supplier_port_cost(self):
        cost = 0.00
        if self.type in [TRANSPORT_TYPE_EXW]:
            if self.transport_mode in [TRANSPORT_MODE_AIR, TRANSPORT_MODE_SEA]:
                supplier_location_port = get_object_or_none(SupplierLocationPort,
                                                            {
                                                                'supplier_location__supplier': self.supplier,
                                                                'port': self.transport_delivery_date_tracking.foreign_port,
                                                                'supplier_location__address': self.transport_delivery_date_tracking.vendor_door_address,
                                                            })
                transport_exw_charges = TransportExWorkCharge.objects.filter(
                    supplier_location_port=supplier_location_port,
                    transport_mode=self.transport_mode
                )
                for transport_exw_charge in transport_exw_charges:
                    charge = transport_exw_charge.get_cost_for_value(self.weight_or_volume_value, self.weight_or_volume_unit)
                    cost += charge
                    print(charge)
                    delivery_combined_charge, created = DeliveryCombinedCharge.objects.get_or_create(
                        transport_delivery_date_tracking=self.transport_delivery_date_tracking,
                        copied_from_entity=get_entity_by_model(transport_exw_charge),
                        copied_from_entity_id=transport_exw_charge.id
                    )
                    set_attrs(
                        delivery_combined_charge,
                        charge_name=transport_exw_charge.name.name,
                        amount=charge,
                        amount_curreny=CurrencyHelper.USD_CURRENCY,
                        calculated_amount=cost,
                        calculated_amount_currency=CurrencyHelper.USD_CURRENCY
                    )
        
        return cost
    
    def get_supplier_port_to_our_port_cost(self):
        cost = 0.00

        if self.type in [TRANSPORT_TYPE_EXW, TRANSPORT_TYPE_FOB]:
            
            # supplier_location_port = get_object_or_none(SupplierLocationPort,
            #                                             {
            #                                                 'supplier_location__supplier': self.supplier,
            #                                                 'port': self.transport_delivery_date_tracking.foreign_port,
            #                                                 'supplier_location__address': self.transport_delivery_date_tracking.vendor_door_address,
            #                                             })
            delivery_transport_types = self.transport_delivery_date_tracking.deliverytransporttype_set.all()
            if self.transport_mode in [TRANSPORT_MODE_SEA, TRANSPORT_MODE_AIR]:
                for delivery_transport_type in delivery_transport_types:
                    #fixed_charges
                    fixed_charges = TransportFixedCharge.objects.filter(
                        transport_type=delivery_transport_type.transport_type,
                        costing_type=self.type,
                        trade_type=TransportFixedCharge.IMPORT,
                        port=self.transport_delivery_date_tracking.local_port
                    )
                    for fixed_charge in fixed_charges:
                        charge = fixed_charge.charge
                        cost += charge
                        delivery_transport_type_charge, created = DeliveryTransportTypeCharge.objects.get_or_create(
                            delivery_transport_type=delivery_transport_type,
                            copied_from_entity=get_entity_by_model(fixed_charge),
                            copied_from_entity_id=fixed_charge.id,
                        )
                        set_attrs(
                            delivery_transport_type_charge,
                            charge_name=fixed_charge.charge_type.name,
                            amount=charge,
                            amount_curreny=CurrencyHelper.USD_CURRENCY,
                            calculated_amount=cost,
                            calculated_amount_currency=CurrencyHelper.USD_CURRENCY,
                        )
                    #per unit charges
                    per_unit_charges = TransportPerUnitCharge.objects.filter(
                        transport_type=delivery_transport_type.transport_type,
                        costing_type=self.type,
                        trade_type=TransportFixedCharge.IMPORT,
                        port=self.transport_delivery_date_tracking.local_port
                    )
                    for per_unit_charge in per_unit_charges:
                        charge = per_unit_charge.get_cost()
                        cost += charge
                        delivery_transport_type_charge, created = DeliveryTransportTypeCharge.objects.get_or_create(
                            delivery_transport_type=delivery_transport_type,
                            copied_from_entity=get_entity_by_model(per_unit_charge),
                            copied_from_entity_id=per_unit_charge.id,
                        )
                        set_attrs(
                            delivery_transport_type_charge,
                            charge_name=per_unit_charge.charge_type.name,
                            amount=charge,
                            amount_curreny=CurrencyHelper.USD_CURRENCY,
                            calculated_amount=cost,
                            calculated_amount_currency=CurrencyHelper.USD_CURRENCY,
                        )
                
        return cost
    
    def get_our_port_to_factory_cost(self):
        cost = 0.00
        if self.type in [TRANSPORT_TYPE_EXW, TRANSPORT_TYPE_FOB, TRANSPORT_TYPE_CIF]:
            delivery_transport_types = self.transport_delivery_date_tracking.deliverytransporttype_set.all()

            transport_distance = get_object_or_none(TransportDistance, 
                                          {
                                              'pickup_location': self.transport_delivery_date_tracking.local_port.address,
                                              'destination': self.transport_delivery_date_tracking.local_port.address,
                                          })
            if transport_distance:
                if self.transport_mode in [TRANSPORT_MODE_SEA, TRANSPORT_MODE_AIR, TRANSPORT_MODE_LAND]:
                    for delivery_transport_type in delivery_transport_types:
                        transport_cost = delivery_transport_type.get_transport_cost(transport_distance.distance)
                        cost += transport_cost
                        delivery_transport_type_charge = DeliveryTransportTypeCharge.objects.get_or_create(
                            delivery_transport_type=delivery_transport_type,
                            copied_from_entity=get_entity_by_model(delivery_transport_type),
                            copied_from_entity_id=transport_distance.id,
                        )
                        set_attrs(
                            delivery_transport_type_charge,
                            charge_name=delivery_transport_type.name,
                            amount=transport_cost,
                            amount_curreny=CurrencyHelper.USD_CURRENCY,
                            calculated_amount=cost,
                            calculated_amount_currency=CurrencyHelper.USD_CURRENCY,
                        )
        return cost
    

class ConsolidateDeliveries:

    supplier_delivery_dates = None
    groups = {}

    def __init__(self, start_date, end_date):
        self.supplier_delivery_dates = SupplierDeliveryDate.objects.filter(
            last_ex_mill_date__gte=start_date,
            last_ex_mill_date__lte=end_date
        )
        self.supplier_delivery_date_grouping(TRANSPORT_TYPE_FOB)
        self.supplier_delivery_date_grouping(TRANSPORT_TYPE_EXW)
        # print(self.groups)



    def get_cut_off_date(self, freight_forwarder_port, last_ex_mill_date):
        freight_forwarder_port_calander = None
        freight_forwarder_port_calanders = freight_forwarder_port.freightforwarderportcalander_set.filter(cut_off_date__gte=last_ex_mill_date).order_by('cut_off_date')
        if freight_forwarder_port_calanders.exists():
            freight_forwarder_port_calander = freight_forwarder_port_calanders[0]
        return freight_forwarder_port_calander

    def supplier_delivery_date_grouping(self, incoterm):
        #transaction
        supplier_delivery_dates = self.supplier_delivery_dates
        if incoterm:
            supplier_delivery_dates = supplier_delivery_dates.filter(Q(supplierdeliverydatequantity__material_supplier__incoterm=incoterm))
        for supplier_delivery_date in self.supplier_delivery_dates:
            last_ex_mill_date = supplier_delivery_date.last_ex_mill_date
            supplier = supplier_delivery_date.general_po_supplier.supplier
            supplier_locaion_ports = SupplierLocationPort.objects.filter(
                supplier_location__supplier=supplier,
                # address=
            )
            ports = [supplier_location_port.port for supplier_location_port in supplier_locaion_ports]
            freight_forwarder_ports = FreightForwarderPort.objects.filter(
                port__in=ports
            )
            freight_forwarder_port_calander = None
            for freight_forwarder_port in freight_forwarder_ports:
                cut_off_date = self.get_cut_off_date(freight_forwarder_port, last_ex_mill_date)
                if freight_forwarder_port_calander:
                    if cut_off_date:
                        if freight_forwarder_port_calander.cut_off_date > cut_off_date.cut_off_date:
                            freight_forwarder_port_calander = cut_off_date
                        else:
                            freight_forwarder_port_calander = cut_off_date
            
            if freight_forwarder_port_calander:
                if str(freight_forwarder_port_calander.id) in self.groups:
                    self.groups[str(freight_forwarder_port_calander.id)]['supplier_delivery_dates'].append(
                        supplier_delivery_date
                    )
                else:
                    self.groups[str(freight_forwarder_port_calander.id)] = {
                        'freight_forwarder_port_calander': freight_forwarder_port_calander,
                        'supplier_delivery_dates': [supplier_delivery_date]
                    }
    
    def consolidate(self):
        for key, supplier_delivery_date_group in self.groups.items():
            freight_forwarder_port_calander = supplier_delivery_date_group['freight_forwarder_port_calander']
            supplier_delivery_dates = supplier_delivery_date_group['sipplier_delivery_dates']
            transport_delivery_date_tracking = TransportDeliveryDateTracking.objects.create(
                vendor_door_address=supplier_delivery_dates[0].general_po_supplier.supplier.supplier_location,
                vendor_door_expected_shipping_date=supplier_delivery_dates[0].last_ex_mill_date,
                foreign_port=supplier_delivery_dates[0].supplier_port,
                foreign_port_expected_date=freight_forwarder_port_calander.cut_off_date,
                # freight_volume
                # freight_volume_unit
                # freight_weight
                # freight_weight_unit
                # local_port
                # local_port_expected_date
                # expected_delivery_date
                # final_location
                # plant
                freight_forwarder=freight_forwarder_port_calander.freight_forwarder,
                # freight_forwarder_local_warehouse
                transport_mode=supplier_delivery_dates[0].supplier_port.transport_mode,
                type=supplier_delivery_dates[0].supplier_port.transport_type,
            )
            for supplier_delivery_date in supplier_delivery_dates:
                supplier_delivery_date.transport_tracking = transport_delivery_date_tracking
                supplier_delivery_date.save()
    

class ConsolidateLocalTransport:

    lcl_delivery_transport_types = None
    fcl_delivery_transport_types = None
    HAS_REMAINING_LOAD = 'has_remaining_load'
    NO_REMAINING_LOAD = 'no_remaining_load'
    EXACT_MATCH = 'exact_match'


    def __init__(self, start_date, end_date):
        delivery_transport_types = DeliveryTransportType.objects.filter(
            transport_delivery_date_tracking__local_port_expected_date__gte=start_date,
            transport_delivery_date_tracking__local_port_expected_date__lte=end_date
        )
        self.lcl_delivery_transport_types = delivery_transport_types.filter(transport_type__name='LCL')
        self.fcl_delivery_transport_types = delivery_transport_types.filter(transport_type__name__icontains='FCL')
        # print(self.lcl_delivery_transport_types)
        lcl_groups = self.group_lcl_delivery_transport_types()
        self.consolidation(lcl_groups)
        fcl_groups = self.group_fcl_delivery_transport_types()

    
    def consolidation(self, groups):
        for port, local_port_expected_dates in groups.items():
            for local_port_expected_date, delivery_transport_types in local_port_expected_dates.items():
                normalized_compactness, total_normalized_weight, total_normalized_volume = self.get_normalized_compactness_volume_weight(delivery_transport_types)
                vehicle_data = self.get_vehicles(normalized_compactness, total_normalized_weight, total_normalized_volume, delivery_transport_types)
                self.create_transport_delivery_date_tracking(vehicle_data, port)
                break #remove after debug
            break #remove after debug
                #create local delivery tracking
    
    def create_transport_delivery_date_tracking(self, vehicle_data, port, ):
        transport_vehicle_tracking = TransportVehicleTracking.objects.create()
        for vehicle in vehicle_data:
            transport_vehicle = TransportVehicle.objects.create(
                transport_vehicle_tracking = transport_vehicle_tracking
            )

    def group_lcl_delivery_transport_types(self):
        lcl_groups = {}
        for local_port_expected_date in self.lcl_delivery_transport_types.values_list('transport_delivery_date_tracking__local_port_expected_date', flat=True).distinct():
            delivery_transport_types = self.lcl_delivery_transport_types.filter(transport_delivery_date_tracking__local_port_expected_date=local_port_expected_date)
            for port in delivery_transport_types.values_list('transport_delivery_date_tracking__local_port', flat=True).distinct():
                local_port = get_object_or_none(Port, {'id': port})
                for delivery_transport_type in delivery_transport_types.filter(transport_delivery_date_tracking__local_port=local_port):
                    if str(port) in lcl_groups:
                        if str(local_port_expected_date) in lcl_groups[str(port)]:
                            lcl_groups[str(port)][str(local_port_expected_date)].append(delivery_transport_type)
                        else:
                            lcl_groups[str(port)][str(local_port_expected_date)] = [delivery_transport_type]
                    else:
                        lcl_groups[str(port)]= {
                            str(local_port_expected_date): [delivery_transport_type]
                        }
        return lcl_groups
    
    def group_fcl_delivery_transport_types(self):
        fcl_groups = {}
        for local_port_expected_date in self.fcl_delivery_transport_types.values_list('transport_delivery_date_tracking__local_port_expected_date', flat=True).distinct():
            delivery_transport_types = self.fcl_delivery_transport_types.filter(transport_delivery_date_tracking__local_port_expected_date=local_port_expected_date)
            for port in delivery_transport_types.values_list('transport_delivery_date_tracking__local_port', flat=True).distinct():
                local_port = get_object_or_none(Port, {'id': port})
                for delivery_transport_type in delivery_transport_types.filter(transport_delivery_date_tracking__local_port=local_port):
                    if str(port) in fcl_groups:
                        if str(local_port_expected_date) in fcl_groups[str(port)]:
                            fcl_groups[str(port)][str(local_port_expected_date)].append(delivery_transport_type)
                        else:
                            fcl_groups[str(port)][str(local_port_expected_date)] = [delivery_transport_type]
                    else:
                        fcl_groups[str(port)]= {
                            str(local_port_expected_date): [delivery_transport_type]
                        }
        return fcl_groups
    
    def get_total_normalized_volume_weight(self, delivery_transport_types):
        total_volume = 0.00
        total_weight = 0.00
        for delivery_transport_type in delivery_transport_types:
            total_volume += delivery_transport_type.get_normalized_volume()
            total_weight += delivery_transport_type.get_normalized_weight()
        return total_volume, total_weight
    
    def get_normalized_compactness_volume_weight(self, delivery_transport_types):
        total_normalized_volume, total_normalized_weight = self.get_total_normalized_volume_weight(delivery_transport_types)
        normalized_compactness = 0.00
        if total_normalized_volume > 0:
            normalized_compactness = total_normalized_weight/total_normalized_volume
            normalized_compactness = round(normalized_compactness, 4)
        
        return normalized_compactness, total_normalized_weight, total_normalized_volume
    
    def get_vehicles(self, compactness, total_weight, total_volume, delivery_transport_types):
        turn = 1
        delivery_transport_type_data = self.get_delivery_transport_type_data(delivery_transport_types)
        vehicles = []
        print(delivery_transport_type_data)
        while total_volume > 0 and total_weight > 0:
            print(turn)
            compactness, total_weight, total_volume, delivery_transport_type_data, vehicles = self.get_matching_vehicle(compactness, total_weight, total_volume, delivery_transport_type_data, vehicles)
            turn += 1
            # break #remove after debug
        print('*******************************************************************')
        print(vehicles)
        return vehicles
    
    def get_delivery_transport_type_data(self, delivery_transport_types):
        delivery_transport_type_data = []
        for delivery_transport_type in delivery_transport_types:
            delivery_transport_type_data.append(
                {
                    'delivery_transport_type': delivery_transport_type,
                    'normalized_volume': delivery_transport_type.get_normalized_volume()
                }
            )
        return delivery_transport_type_data
    
    def get_matching_vehicle(self, compactness, total_weight, total_volume, delivery_transport_type_data, vehicles):
        vehicle_types = VehicleType.objects.all()

        selected_vehicle_type_data = {}
        vehicle_data = {}
        
        print('total_volume', total_volume, 'total_weight', total_weight, 'compactness', compactness)
        for vehicle_type in vehicle_types:
            selected_vehicle_type_data = self.get_vehicle_type(compactness, total_weight, total_volume, selected_vehicle_type_data, vehicle_type)
        print(selected_vehicle_type_data)
        
        selected_vehicle_type = selected_vehicle_type_data.get('selected_vehicle_type', None)
        loaded_volume = selected_vehicle_type_data.get('loaded_volume', 0.00)
        loaded_weight = selected_vehicle_type_data.get('loaded_weight', 0.00)
        state = selected_vehicle_type_data.get('state', None)

        none_allocated_volume = loaded_volume
        lcl_details = []
        pickup_locations = []
        destinations = []

        for delivery_transport_type in delivery_transport_type_data:
            lcl_detail = {}
            pickup_location = {}
            destination = {}
            delivery_transport_type_normalized_volume = delivery_transport_type.get('normalized_volume', 0.00)
            if delivery_transport_type_normalized_volume > 0 and none_allocated_volume > 0:
                lcl_detail['delivery_transport_type'] = delivery_transport_type['delivery_transport_type']
                container_deliveries = delivery_transport_type['delivery_transport_type'].containerdelivery_set.all()
                for container_delivery in container_deliveries:
                    plant = container_delivery.get_plant()
                    if plant:
                        destination = self.get_address_data(plant.address)
                        if not destination in destinations:
                            destinations.append(destination)
                freight_forwarder_local_warehouse = delivery_transport_type['delivery_transport_type'].transport_delivery_date_tracking.freight_forwarder_local_warehouse
                pickup_location = self.get_address_data(freight_forwarder_local_warehouse)
                if not pickup_location in pickup_locations:
                    pickup_locations.append(pickup_location)
                if none_allocated_volume == delivery_transport_type_normalized_volume:
                    lcl_detail['volume'] = delivery_transport_type_normalized_volume
                    none_allocated_volume = 0
                lcl_details.append(lcl_detail)
        if len(lcl_details) > 0:
            vehicle_data = {
                'lcl_details': lcl_details,
                'pickup_locations': pickup_locations,
                'destinations': destinations,
                'vehicle_type': selected_vehicle_type
            }
            vehicles.append(vehicle_data)
                


        total_volume -= loaded_volume
        total_weight -= loaded_weight
        total_volume = round(total_volume, 4)
        total_weight = round(total_weight, 4)
        print('total_volume', total_volume, 'total_weight', total_weight, 'compactness', compactness)
        return compactness, total_weight, total_volume, delivery_transport_type_data, vehicles
    
    def get_address_data(self, address_object):
        data = {}
        fields = [
            'address_line_1',
            'address_line_2',
            'city',
            'country'
        ]
        if address_object:
            for field in fields:
                if hasattr(address_object, field):
                    data[field] = getattr(address_object, field)
        return data


    def compare_vehicle_type(self, load_value, loaded_value, total_value, state):
        select_new_vehicle = False

        if total_value == load_value: # exact match
            if not state == self.EXACT_MATCH:
                select_new_vehicle = True
                state = self.EXACT_MATCH
        elif total_value > load_value: # has remaining load
            if not state == self.EXACT_MATCH and not state == self.NO_REMAINING_LOAD:
                if total_value - load_value < total_value - loaded_value:
                    select_new_vehicle = True
                    state = self.HAS_REMAINING_LOAD
        elif total_value < load_value: # no remaining load
            if not state == self.EXACT_MATCH:
                if state == self.NO_REMAINING_LOAD:
                    if load_value - total_value < loaded_value - total_value:
                        select_new_vehicle = True
                        state = self.NO_REMAINING_LOAD
                elif state == self.HAS_REMAINING_LOAD:
                    select_new_vehicle = True
                    state = self.NO_REMAINING_LOAD
        return select_new_vehicle, state
    
    def get_vehicle_type(self, compactness, total_weight, total_volume, selected_vehicle_type_data, vehicle_type):
        selected_vehicle_type = selected_vehicle_type_data.get('selected_vehicle_type', None)
        loaded_volume = selected_vehicle_type_data.get('loaded_volume', 0.00)
        loaded_weight = selected_vehicle_type_data.get('loaded_weight', 0.00)
        state = selected_vehicle_type_data.get('state', None)

        vehicle_compactness = vehicle_type.get_normalized_compactness()
        if compactness > vehicle_compactness: # compare with weight
            load_weight = vehicle_type.get_normalized_maximum_weight()
            load_volume = load_weight/compactness
            load_volume = round(load_volume, 4)
            select_new_vehicle, state = self.compare_vehicle_type(load_weight, loaded_weight, total_weight, state)
            if select_new_vehicle:
                if state in [self.EXACT_MATCH, self.NO_REMAINING_LOAD]:
                    loaded_weight = total_weight
                    loaded_volume = total_volume
                    selected_vehicle_type = vehicle_type
                else:
                    loaded_weight = load_weight
                    loaded_volume = load_volume
                    selected_vehicle_type = vehicle_type
        else: # compare with volume
            load_volume = vehicle_type.get_normalized_maximum_volume()
            load_weight = load_volume*compactness
            load_weight = round(load_weight, 4)
            select_new_vehicle, state = self.compare_vehicle_type(load_volume, loaded_volume, total_volume, state)
            if select_new_vehicle:
                if state in [self.EXACT_MATCH, self.NO_REMAINING_LOAD]:
                    loaded_weight = total_weight
                    loaded_volume = total_volume
                    selected_vehicle_type = vehicle_type
                else:
                    loaded_weight = load_weight
                    loaded_volume = load_volume
                    selected_vehicle_type = vehicle_type            

        
        selected_vehicle_type_data = {
            'selected_vehicle_type': selected_vehicle_type,
            'loaded_volume': load_volume,
            'loaded_weight': load_weight,
            'state': state
        }
        return selected_vehicle_type_data