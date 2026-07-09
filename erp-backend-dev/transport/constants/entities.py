from transport.models import TransportExWorkCharge, TransportFixedCharge, TransportPerUnitCharge, VehicleType

TRANSPORT_EXW_CHARGE_ENTITY = 'transport_exw_charge_entity'
TRANSPORT_FIXED_CHARGE_ENTITY = 'transport_fixed_charge_entity'
TRANSPORT_PER_UNIT_CHARGE_ENTITY = 'transport_per_unit_charge_entity'
TRANSPORT_VEHICLE_TYPE_ENTITY = 'vehicle_type'


TRANSPORT_ENTITY_MODEL_MAPPINGS = {
    TRANSPORT_EXW_CHARGE_ENTITY: TransportExWorkCharge,
    TRANSPORT_FIXED_CHARGE_ENTITY: TransportFixedCharge,
    TRANSPORT_PER_UNIT_CHARGE_ENTITY: TransportPerUnitCharge,
    TRANSPORT_VEHICLE_TYPE_ENTITY: VehicleType
}

def get_model_by_entity(entity):
    return TRANSPORT_ENTITY_MODEL_MAPPINGS.get(entity, None)

def get_entity_by_model(model):
    return_entity = None
    for entity, entity_model in TRANSPORT_ENTITY_MODEL_MAPPINGS.items():
        if entity_model == type(model):
            return_entity = entity
    return return_entity