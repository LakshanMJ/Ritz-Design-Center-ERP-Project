from transport.models import TransportDeliveryDateTracking, TransportDistance, DeliveryTransportTypeCharge, TransportFixedCharge, TransportPerUnitCharge,\
TRANSPORT_MODE_AIR, TRANSPORT_MODE_SEA, TRANSPORT_MODE_LAND, TRANSPORT_TYPE_EXW, TRANSPORT_TYPE_FOB, TRANSPORT_TYPE_CIF
from shared.helpers.currency_helper import CurrencyHelper
from shared.utils import get_object_or_none, set_attrs
from transport.constants.entities import get_entity_by_model

class ExportTransportCost:

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
            self.customer = transport_delivery_date_tracking.get_customer()
            self.type = transport_delivery_date_tracking.type
    
    def calculate_export_transport_cost(self):
        our_door_to_our_port_cost = self.get_our_door_to_our_port_cost()
        our_port_to_customer_port_cost = self.get_our_port_to_customer_port_cost()

    def get_our_door_to_our_port_cost(self):
        cost = 0.00
        delivery_transport_types = self.transport_delivery_date_tracking.deliverytransporttype_set.all()
        if self.type in [TRANSPORT_TYPE_CIF, TRANSPORT_TYPE_EXW, TRANSPORT_TYPE_FOB]:

            transport_distance = get_object_or_none(TransportDistance,
                                        {
                                            'pickup_location': self.transport_delivery_date_tracking.freight_forwarder_local_warehouse.address,
                                            'destination': self.transport_delivery_date_tracking.local_port.address,
                                        })
            if transport_distance:
                if self.transport_mode in [TRANSPORT_MODE_SEA, TRANSPORT_MODE_AIR, TRANSPORT_MODE_LAND]:
                    for delivery_transport_type in delivery_transport_types:
                        if self.type == TRANSPORT_TYPE_EXW:
                            transport_cost = 0.00
                        else:
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
                            calculated_amount_currency=CurrencyHelper.USD_CURRENCY
                        )
        return cost
    
    def get_our_port_to_customer_port_cost(self):
        #Fixed_charges
        fixed_cost = 0.00
        delivery_transport_types = self.transport_delivery_date_tracking.deliverytransporttype_set.all()
        for delivery_transport_type in delivery_transport_types:
            fixed_charges = TransportFixedCharge.objects.filter(
                transport_type=delivery_transport_type.transport_type,
                costing_type=self.type,
                trade_type=TransportFixedCharge.EXPORT,
                port=self.transport_delivery_date_tracking.local_port
            )
            for fixed_charge in fixed_charges:
                if self.type == TRANSPORT_TYPE_EXW:
                    charge = 0.00
                else:
                    charge = fixed_charge.charge
                fixed_cost += charge
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
                    calculated_amount=fixed_cost,
                    calculated_amount_currency=CurrencyHelper.USD_CURRENCY,
                )
        #perunit_charges
        per_unit_cost = 0.00
        for delivery_transport_type in delivery_transport_types:
            per_unit_charges = TransportPerUnitCharge.objects.filter(
                transport_type=delivery_transport_type.transport_type,
                costing_type=self.type,
                trade_type=TransportFixedCharge.EXPORT,
                port=self.transport_delivery_date_tracking.local_port
            )
            for per_unit_charge in per_unit_charges:
                if self.type == TRANSPORT_TYPE_EXW:
                    charge = 0.00
                else:
                    if self.transport_mode == TRANSPORT_MODE_AIR:
                        charge = per_unit_charge.get_cost(delivery_transport_type.weight)
                    else:
                        charge = per_unit_charge.get_cost(delivery_transport_type.volume)
                per_unit_cost += charge
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
                    calculated_amount=per_unit_cost,
                    calculated_amount_currency=CurrencyHelper.USD_CURRENCY,
                )
        return fixed_cost+per_unit_cost