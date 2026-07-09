from transport.models import TransportType, VehicleType, TransportChangeReason
from shared.utils import get_object_or_none
from shared.models import Port, LocationCountry, Address, Plant


class TransportMetaData:

    TRANSPORT_FCL_45HQ_TYPE = 'FCL-45HQ'
    TRANSPORT_FCL_40HQ_TYPE = 'FCL-40HQ'
    TRANSPORT_FCL_40GP_TYPE = 'FCL-40GP'
    TRANSPORT_FCL_20GP_TYPE = 'FCL-20GP'

    TRANSPORT_FCL_TYPES = [
        TRANSPORT_FCL_45HQ_TYPE,
        TRANSPORT_FCL_40HQ_TYPE,
        TRANSPORT_FCL_40GP_TYPE,
        TRANSPORT_FCL_20GP_TYPE,
    ]
    TRANSPORT_LCL_TYPE = 'LCL'
    TRANSPORT_AIR_TYPE = 'Air'

    def create_meta_data(self):
        self.create_transport_types()
        self.create_vehicle_types()
        self.create_plants()
        self.create_transport_reasons()

    def create_transport_types(self):
        TRANSPORT_TYPES = self.TRANSPORT_FCL_TYPES
        TRANSPORT_TYPES.append(self.TRANSPORT_LCL_TYPE)

        for transport_type in self.TRANSPORT_FCL_TYPES:
            transport_type, created = TransportType.objects.get_or_create(
                name=transport_type,
                load_type=TransportType.CONTAINER_LOAD_TYPE
            )
            if created:
                print(f"Transport type created: {transport_type.name}")
        transport_type, created = TransportType.objects.get_or_create(
            name=self.TRANSPORT_AIR_TYPE,
            load_type=TransportType.AIR_CARGO_LOAD_TYPE
        )
        if created:
            print(f"Transport type created: {transport_type.name}")

    def get_country(self, country_name):
        return get_object_or_none(LocationCountry, {'name': country_name})
    
    def get_address(self, address):
        address, created = Address.objects.get_or_create(**address)
        if created:
            print(f"Address created: {address.get_verbose_address()}")
        return address
    
    def get_port(self, port):
        port, created = Port.objects.get_or_create(**port)
        if created:
            print(f"Port created: {port.name}")
        return port

    def create_plants(self):
        port = self.get_port({
            'name': 'Port of Colombo',
            'address': self.get_address({
                'address_line_1': 'No 19',
                'address_line_2': 'Chaithya Rd',
                'city': 'Colombo',
                'country': self.get_country('Sri Lanka')
            }),
            'port_type': 'sea',
        })
        plants = [
            {
            'name': 'Ritz Clothing Yapahuwa (Pvt) Ltd',
            'address': self.get_address({
                'address_line_1': 'Daladagama',
                'address_line_2': 'Anuradhapura Rd',
                'city': 'Uduweriya',
                'country': self.get_country('Sri Lanka')
            }),
            'port_type': port
            },
            {
            'name': 'Ritz Clothing Nikaweratiya (PVT) Ltd',
            'address': self.get_address({
                'address_line_1': 'No 20',
                'address_line_2': 'Kurunegala - Puttalam Hwy',
                'city': 'Nikaweratiya',
                'country': self.get_country('Sri Lanka')
            }),
            'port_type': port
            },
            {
            'name': 'Ritz Clothing Magallegama Nikaweratiya (PVT) Ltd',
            'address': self.get_address({
                'address_line_1': 'No 71',
                'address_line_2': 'Kurunegala - Puttalam Hwy',
                'city': 'Nikaweratiya',
                'country': self.get_country('Sri Lanka')
            }),
            'port_type': port
            },
            {
            'name': 'Ritz Clothing Humbuluwa (PVT) Ltd',
            'address': self.get_address({
                'address_line_1': '6th Mile Post',
                'address_line_2': 'Alawwa - Maharagama Rd',
                'city': 'Alawwa',
                'country': self.get_country('Sri Lanka')
            }),
            'port_type': port
            },
            {
            'name': 'Ritz Clothing Alawwa (PVT) Ltd',
            'address': self.get_address({
                'address_line_1': '6th Mile Post',
                'address_line_2': 'Alawwa - Maharagama Rd',
                'city': 'Alawwa',
                'country': self.get_country('Sri Lanka')
            }),
            'port_type': port
            },
        ]

        for plant in plants:
            plant, created = Plant.objects.get_or_create(**plant)
            if created:
                print(f"Plant created: {plant.name}")


    def create_vehicle_types(self):
        VEHICLES = [
            {
                'name': '45HQ',
                'maximum_volume': 86,
                'maximum_weight': 30480,
                'transport_types': [self.TRANSPORT_FCL_45HQ_TYPE]
            },
            {
                'name': '40HQ',
                'maximum_volume': 76,
                'maximum_weight': 30480,
                'transport_types': [self.TRANSPORT_FCL_40HQ_TYPE]
            },
            {
                'name': '40GP',
                'maximum_volume': 67,
                'maximum_weight': 30480,
                'transport_types': [self.TRANSPORT_FCL_40GP_TYPE]
            },
            {
                'name': '20GP',
                'maximum_volume': 33,
                'maximum_weight': 30480,
                'transport_types': [self.TRANSPORT_FCL_20GP_TYPE]
            },
            {
                'name': 'Batta',
                'maximum_volume': 2.5,
                'maximum_weight': 750,
                'transport_types': [self.TRANSPORT_LCL_TYPE, self.TRANSPORT_AIR_TYPE]
            },
            {
                'name': '14 1/2 Feet',
                'maximum_volume': 12,
                'maximum_weight': 2500,
                'transport_types': [self.TRANSPORT_LCL_TYPE, self.TRANSPORT_AIR_TYPE]
            },
        ]

        for vehicle in VEHICLES:
            transport_types = vehicle.pop('transport_types')
            vehicle['transport_cost_per_kilometer'] = 1.00
            vehicle_type, created = VehicleType.objects.get_or_create(
                **vehicle
            )
            if created:
                print(f"Vehicle created: {vehicle_type.name}")
                for transport_type in transport_types:
                    transport_type_object = get_object_or_none(TransportType,
                                                               {'name': transport_type})
                    if transport_type_object:
                        vehicle_type.transport_types.add(transport_type_object.id)
    
    def create_transport_reasons(self):
        FOREIGN = TransportChangeReason.FOREIGN
        LOCAL = TransportChangeReason.LOCAL
        IMPORT = 'import'
        reasons = {
            FOREIGN: {
                IMPORT: {
                    TransportChangeReason.TRANSPORT_MODE_CATEGORY: [
                        'Delivery Advancement',
                        'Vessel cut off delay',
                        'Predicted arrival delay of vessel'
                    ],
                    TransportChangeReason.FOREIGN_PORT_CATEGORY: [
                         'Catch faster vessel',
                         'Vessel delay at foreign port',
                         'Vessel load exceed at foreign port'
                    ],
                    TransportChangeReason.FORWARDER_CATEGORY: [
                        'Forwarder delay',
                        'Forwarder documentation issue',
                        'Forwarder capacity issue'
                    ],
                    TransportChangeReason.LOCAL_PORT_CATEGORY: [
                        'Customs clearance delay',
                        'Port congestion',
                        'Documentation issues',
                        'Container damage',
                        'Inspection delay'
                    ],
                    TransportChangeReason.MERGE_TO_EXISTING_TRANSPORT: [
                        'Delivery Advancement',
                        'Vessel cut off delay',
                        'Predicted arrival delay of vessel',
                        'Catch faster vessel',
                        'Vessel delay at foreign port',
                        'Vessel load exceed at foreign port',
                        'Forwarder delay',
                        'Forwarder documentation issue',
                        'Forwarder capacity issue',
                        'Customs clearance delay',
                        'Port congestion',
                        'Documentation issues',
                        'Container damage',
                        'Inspection delay'
                    ]
                }
            },
            LOCAL: {
                IMPORT: {
                    TransportChangeReason.TRANSPORT_MODE_CATEGORY: [
                        'Delivery Advancement',
                        'Vessel cut off delay',
                        'Predicted arrival delay of vessel'
                    ],
                    TransportChangeReason.LOCAL_PORT_CATEGORY: [
                        'Customs clearance delay',
                        'Port congestion',
                        'Documentation issues',
                        'Container damage',
                        'Inspection delay'
                    ],
                    TransportChangeReason.MERGE_TO_EXISTING_TRANSPORT: [
                        'Delivery Advancement',
                        'Vessel cut off delay',
                        'Predicted arrival delay of vessel',
                        'Customs clearance delay',
                        'Port congestion',
                        'Documentation issues',
                        'Container damage',
                        'Inspection delay'
                    ]
                }
            }
        }
        for location, location_data in reasons.items():
            for trade_type, trade_type_data in location_data.items():
                for category, category_data in trade_type_data.items():
                    for reason in category_data:
                        TransportChangeReason.objects.get_or_create(
                            location=location,
                            trade_type=trade_type,
                            reason_category=category,
                            reason=reason
                        )