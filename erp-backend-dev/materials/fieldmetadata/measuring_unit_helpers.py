

class MaterialUnitMixin:
    def get_units(self, all_units, valid_units):
        units = []
        for unit in all_units:
            if unit[0] in valid_units:
                units.append(unit)
        return tuple(units)

    def convert_type_to_dict(self, data):
        return dict(tuple_row for tuple_row in data)


class PerMeasuringUnitHelper(MaterialUnitMixin):
    PER_METER_UNIT = 'per_meter'
    PER_CENTIMETER_UNIT = 'per_centimeter'
    PER_MILLIMETER_UNIT = 'per_millimeter'
    PER_YARD_UNIT = 'per_yard'
    PER_INCH_UNIT = 'per_inch'
    PER_FEET_UNIT = 'per_feet'
    PER_2500_METERS_UNIT = 'per_2500_meters'
    PER_5000_METERS_FEET_UNIT = 'per_5000_meters'

    PER_PIECE_UNIT = 'per_piece'

    PER_LENGTH_UNITS = [
        PER_METER_UNIT,
        PER_CENTIMETER_UNIT,
        PER_MILLIMETER_UNIT,
        PER_YARD_UNIT,
        PER_INCH_UNIT,
        PER_FEET_UNIT,
        PER_2500_METERS_UNIT,
        PER_5000_METERS_FEET_UNIT,
    ]

    PER_PIECE_UNITS = [
        PER_PIECE_UNIT
    ]

    ALL_PER_LENGTH_MEASURING_UNITS = (
        (PER_METER_UNIT, 'Per Metre'),
        (PER_CENTIMETER_UNIT, 'Per Centimetre'),
        (PER_MILLIMETER_UNIT, 'Per Millimetre'),
        (PER_YARD_UNIT, 'Per Yard'),
        (PER_INCH_UNIT, 'Per Inch'),
        (PER_FEET_UNIT, 'Per Feet'),
        (PER_PIECE_UNIT, 'Per Piece'),
        (PER_2500_METERS_UNIT, 'Per Cone (2500 Metres)'),
        (PER_5000_METERS_FEET_UNIT, 'Per Cone (5000 Metres)'),
    )

    def get_length_measuring_units(self):
        return self.get_units(self.ALL_PER_LENGTH_MEASURING_UNITS, self.PER_LENGTH_UNITS)

    def get_piece_units(self):
        return self.get_units(self.ALL_PER_LENGTH_MEASURING_UNITS, self.PER_PIECE_UNITS)
    
    def get_valid_material_valid_costing_unit(self, per_mesuring_unit):
        if per_mesuring_unit == self.PER_PIECE_UNIT:
            return MaterialUnitHelper.PIECES_UNIT_OPTION
        elif per_mesuring_unit in self.PER_LENGTH_UNITS:
            return MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION
        return None

    def get_per_unit_measuring_unit(self, unit):
        per_unit = None
        if unit == MaterialUnitHelper.METERS_UNIT:
            per_unit = self.PER_METER_UNIT
        elif unit == MaterialUnitHelper.PIECES_UNIT:
            per_unit = self.PER_PIECE_UNIT
        return per_unit


class MaterialUnitHelper(MaterialUnitMixin):
    MEASURING_UNIT_OF_LENGTH_OPTION = 'unit_of_length'
    PIECES_UNIT_OPTION = 'pieces_unit'

    CONSUMPTION_MEASURING_OPTIONS = (
        (PIECES_UNIT_OPTION, 'Number of Pieces'),
        (MEASURING_UNIT_OF_LENGTH_OPTION, 'Unit of Length'),
    )

    MILLIMETERS_UNIT_DISPLAY = 'Millimeters'
    METERS_UNIT_DISPLAY = 'Meters'
    PIECES_UNIT_DISPLAY = 'Pieces'

    # Measuring Units
    METERS_UNIT = 'meters'
    CENTIMETERS_UNIT = 'centimeters'
    MILLIMETERS_UNIT = 'millimeters'
    YARDS_UNIT = 'yards'
    INCHES_UNIT = 'inches'
    FEETS_UNIT = 'feets'
    METERS_2500_UNIT = '2500_meters'
    METERS_5000_UNIT = '5000_meters'

    PIECES_UNIT = 'pieces'

    LENGTH_UNITS = [
        METERS_UNIT,
        CENTIMETERS_UNIT,
        MILLIMETERS_UNIT,
        YARDS_UNIT,
        INCHES_UNIT,
        FEETS_UNIT,
        METERS_2500_UNIT,
        METERS_5000_UNIT
    ]

    PIECE_UNITS = [
        PIECES_UNIT
    ]

    ALL_MEASURING_UNITS = (
        (METERS_UNIT, METERS_UNIT_DISPLAY),
        (CENTIMETERS_UNIT, 'Centimetres'),
        (MILLIMETERS_UNIT, 'Millimetres'),
        (YARDS_UNIT, 'Yards'),
        (INCHES_UNIT, 'Inches'),
        (FEETS_UNIT, 'Feet'),
        (PIECES_UNIT, 'Pieces'),
        (METERS_2500_UNIT, 'Cone (2500 Meters)'),
        (METERS_5000_UNIT, 'Cone (5000 Meters)'),
    )

    ALL_LENGTH_UNITS = (
        (METERS_UNIT, METERS_UNIT_DISPLAY),
        (CENTIMETERS_UNIT, 'Centimetres'),
        (MILLIMETERS_UNIT, 'Millimetres'),
        (YARDS_UNIT, 'Yards'),
        (INCHES_UNIT, 'Inches'),
        (FEETS_UNIT, 'Feet'),
    )

    PER_UNIT_TO_UNIT_MAPPING = {
        PerMeasuringUnitHelper.PER_METER_UNIT: METERS_UNIT,
        PerMeasuringUnitHelper.PER_CENTIMETER_UNIT: CENTIMETERS_UNIT,
        PerMeasuringUnitHelper.PER_MILLIMETER_UNIT: MILLIMETERS_UNIT,
        PerMeasuringUnitHelper.PER_YARD_UNIT: YARDS_UNIT,
        PerMeasuringUnitHelper.PER_INCH_UNIT: INCHES_UNIT,
        PerMeasuringUnitHelper.PER_FEET_UNIT: FEETS_UNIT,
        PerMeasuringUnitHelper.PER_2500_METERS_UNIT: METERS_2500_UNIT,
        PerMeasuringUnitHelper.PER_5000_METERS_FEET_UNIT: METERS_5000_UNIT,
        PerMeasuringUnitHelper.PER_PIECE_UNIT: PIECES_UNIT,
    }

    @staticmethod
    def get_unit_to_per_unit_mapping():
        mappings = {}

        for key, value in MaterialUnitHelper.PER_UNIT_TO_UNIT_MAPPING.items():
            mappings[value] = key
        return mappings

    def get_length_measuring_units(self):
        return self.get_units(self.ALL_MEASURING_UNITS, self.LENGTH_UNITS)

    def get_piece_units(self):
        return self.get_units(self.ALL_MEASURING_UNITS, self.PIECE_UNITS)

    def convert_per_unit_to_unit(self, per_unit):
        return self.PER_UNIT_TO_UNIT_MAPPING.get(per_unit, None)

    def get_inch_conversion(self, unit):
        amount = 1
        if unit:
            mm_conversion = self.get_millimeter_conversion_amount(unit)
            amount = mm_conversion / 25.4
        return amount

    def get_meter_conversion_amount(self, unit):
        if unit:
            mm_conversion = self.get_millimeter_conversion_amount(unit)
            amount = mm_conversion / 1000
        else:
            amount = 1
        return amount
    
    def get_yard_conversion_amount(self, unit):
        if unit:
            mm_conversion = self.get_millimeter_conversion_amount(unit)
            amount = mm_conversion / 914.4
        else:
            amount = 1
        return amount

    def get_millimeter_conversion_amount(self, unit):
        if unit:
            if unit == self.METERS_UNIT:
                amount = 1000
            elif unit == self.CENTIMETERS_UNIT:
                amount = 10
            elif unit == self.YARDS_UNIT:
                amount = 914.4
            elif unit == self.INCHES_UNIT:
                amount = 25.4
            elif unit == self.FEETS_UNIT:
                amount = 304.8
            elif unit == self.MILLIMETERS_UNIT:
                amount = 1
            elif unit == self.METERS_2500_UNIT:
                amount = 1000 * 2500
            elif unit == self.METERS_5000_UNIT:
                amount = 1000 * 5000
            else:
                raise Exception("Invalid unit specified") # TODO minor - write custom exception
        else:
            amount = 1 # If unit is undefined return 1
        return amount

    @property
    def all_measuring_units_dictionary(self):
        return self.convert_type_to_dict(self.ALL_MEASURING_UNITS)

    def get_normalized_unit_based_on_category(self, unit):
        normalized_unit = None
        if unit == self.MEASURING_UNIT_OF_LENGTH_OPTION:
            normalized_unit = self.METERS_UNIT
        elif unit == self.PIECES_UNIT_OPTION:
            normalized_unit = self.PIECES_UNIT
        return normalized_unit

    # Do not change this
    def get_normalized_unit(self, unit):
        normalized_unit = None
        if unit in MaterialUnitHelper.LENGTH_UNITS:
            normalized_unit = MaterialUnitHelper.METERS_UNIT
        elif unit in MaterialUnitHelper.PIECE_UNITS:
            normalized_unit = MaterialUnitHelper.PIECES_UNIT
        return normalized_unit

    def convert_to_units(self, convert_unit, amount, current_units, raise_exception=True):
        normalized_amount = None
        if convert_unit == self.METERS_UNIT:
            normalized_amount = self.convert_to_meters(current_units, amount)
        elif convert_unit == self.PIECES_UNIT:
            normalized_amount = amount * 1
        elif raise_exception:
            raise Exception("Invalid convert unit specified")
        return normalized_amount

    def convert_to_meters(self, unit, conversion_value, raise_exception=True):
        value = None
        if unit in self.LENGTH_UNITS:
            conversion_rate = self.get_meter_conversion_amount(unit)
            value = conversion_value * conversion_rate

        elif raise_exception:
            raise Exception("Invalid unit. Unit: %s, Convert Unit " + str(unit))
        return value

    def get_valid_material_unit_for_unit_category(self, material_unit_category):
        valid_options = []
        if material_unit_category == self.MEASURING_UNIT_OF_LENGTH_OPTION:
            valid_options = self.LENGTH_UNITS
        elif material_unit_category == self.PIECES_UNIT_OPTION:
            valid_options = self.PIECE_UNITS
        return valid_options

    def valid_material_unit(self, material_unit, material_unit_category):
        valid_units = self.get_valid_material_unit_for_unit_category(material_unit_category)
        return material_unit in valid_units
    
    def get_normalized_unit_catergory(self, unit):
        normalized_unit_category = None
        if unit in MaterialUnitHelper.LENGTH_UNITS:
            normalized_unit_category = MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION
        elif unit in MaterialUnitHelper.PIECE_UNITS:
            normalized_unit_category = MaterialUnitHelper.PIECES_UNIT_OPTION
        return normalized_unit_category


class PerVolumeMeasuringUnitHelper(PerMeasuringUnitHelper):
    
    PER_CUBIC_METER_UNIT = 'per_cubic_meter'
    PER_CUBIC_CENTIMETER_UNIT = 'per_cubic_centimeter'
    PER_CUBIC_MILLIMETER_UNIT = 'per_cubic_millimeter'
    PER_CUBIC_INCH_UNIT = 'per_cubic_inch'
    PER_CUBIC_FEET_UNIT = 'per_cubic_feet'
    PER_CUBIC_YARD_UNIT = 'per_cubic_yard'

    PER_VOLUME_UNITS = [
        PER_CUBIC_METER_UNIT,
        PER_CUBIC_CENTIMETER_UNIT,
        PER_CUBIC_MILLIMETER_UNIT,
        PER_CUBIC_INCH_UNIT,
        PER_CUBIC_FEET_UNIT,
        PER_CUBIC_YARD_UNIT
    ]

    ALL_PER_VOLUME_MEASURING_UNITS = (
        (PER_CUBIC_METER_UNIT, 'Per Cubic Meter'),
        (PER_CUBIC_CENTIMETER_UNIT, 'Per Cubic Centimeter'),
        (PER_CUBIC_MILLIMETER_UNIT, 'Per Cubic Millimeter'),
        (PER_CUBIC_INCH_UNIT, 'Per Cubic Inch'),
        (PER_CUBIC_FEET_UNIT, 'Per Cubic Feet'),
        (PER_CUBIC_YARD_UNIT, 'Per Cubic Yard'),
    )

    def get_volume_per_units(self):
        return self.get_units(self.ALL_PER_VOLUME_MEASURING_UNITS, self.PER_VOLUME_UNITS)

    def get_per_unit_measuring_unit(self, unit):
        per_unit = None
        if unit == MaterialVolumeUnitHelper.CUBIC_METER_UNIT:
            per_unit = self.PER_CUBIC_METER_UNIT
        return per_unit

class MaterialVolumeUnitHelper(MaterialUnitHelper):

    CUBIC_METER_UNIT = 'cubic_meters'
    CUBIC_CENTIMETER_UNIT = 'cubic_centimeters'
    CUBIC_MILLIMETER_UNIT = 'cubic_millimeters'
    CUBIC_INCH_UNIT = 'cubic_inches'
    CUBIC_FEET_UNIT = 'cubic_feet'
    CUBIC_YARD_UNIT = 'cubic_yards'

    VOLUME_UNITS = [
        CUBIC_METER_UNIT,
        CUBIC_CENTIMETER_UNIT,
        CUBIC_MILLIMETER_UNIT,
        CUBIC_INCH_UNIT,
        CUBIC_FEET_UNIT,
        CUBIC_YARD_UNIT
    ]

    ALL_VOLUME_UNITS = (
        (CUBIC_METER_UNIT, 'Cubic Meters'),
        (CUBIC_CENTIMETER_UNIT, 'Cubic Centimeters'),
        (CUBIC_MILLIMETER_UNIT, 'Cubic Millimeters'),
        (CUBIC_INCH_UNIT, 'Cubic Inches'),
        (CUBIC_FEET_UNIT, 'Cubic Feet'),
        (CUBIC_YARD_UNIT, 'Cubic Yards'),
    )

    def get_volume_conversion_amount(self, unit):
        if unit:
            if unit == self.CUBIC_METER_UNIT:
                amount = self.get_millimeter_conversion_amount(self.METERS_UNIT) ** 3
            elif unit == self.CUBIC_CENTIMETER_UNIT:
                amount = self.get_millimeter_conversion_amount(self.CENTIMETERS_UNIT) ** 3
            elif unit == self.CUBIC_MILLIMETER_UNIT:
                amount = self.get_millimeter_conversion_amount(self.MILLIMETERS_UNIT) ** 3
            elif unit == self.CUBIC_INCH_UNIT:
                amount = self.get_millimeter_conversion_amount(self.INCHES_UNIT) ** 3
            elif unit == self.CUBIC_FEET_UNIT:
                amount = self.get_millimeter_conversion_amount(self.FEETS_UNIT) ** 3
            elif unit == self.CUBIC_YARD_UNIT:
                amount = self.get_millimeter_conversion_amount(self.YARDS_UNIT) ** 3
            else:
                raise Exception("Invalid unit specified") # TODO minor - write custom exception
        else:
            amount = 1
        return amount

    def get_normalized_volume_unit(self, unit):
        normalized_unit = None
        if unit in self.VOLUME_UNITS:
            normalized_unit = self.CUBIC_METER_UNIT
        return normalized_unit
    
    def get_amount_to_units(self, convert_unit, current_unit):
        convert_unit_amount = self.get_volume_conversion_amount(convert_unit)
        current_unit_amount = self.get_volume_conversion_amount(current_unit)
        conversion_amount = current_unit_amount / convert_unit_amount
        return conversion_amount
    
    def get_normalized_volume_unit_display(self, unit):
        normalized_unit = self.get_normalized_volume_unit(unit)
        for unit_tuple in self.ALL_VOLUME_UNITS:
            if unit_tuple[0] == normalized_unit:
                return unit_tuple[1]
        return None

    def convert_volume_to_units(self, convert_unit, amount, current_units, raise_exception=True):
        normalized_amount = None
        normalized_amount = amount * self.get_amount_to_units(convert_unit, current_units)
        return normalized_amount
    

class MaterialWeightUnitHelper:

    GRAMS_UNIT = 'grams'
    KILOGRAMS_UNIT = 'kilograms'
    MILLIGRAMS_UNIT = 'milligrams'
    POUNDS_UNIT = 'pounds'
    OUNCES_UNIT = 'ounces'

    WEIGHT_UNITS = [
        GRAMS_UNIT,
        KILOGRAMS_UNIT,
        MILLIGRAMS_UNIT,
        POUNDS_UNIT,
        OUNCES_UNIT
    ]

    ALL_WEIGHT_UNITS = (
        (GRAMS_UNIT, 'Grams'),
        (KILOGRAMS_UNIT, 'Kilograms'),
        (MILLIGRAMS_UNIT, 'Milligrams'),
        (POUNDS_UNIT, 'Pounds'),
        (OUNCES_UNIT, 'Ounces'),
    )

    def get_weight_conversion_amount(self, unit):
        if unit:
            if unit == self.KILOGRAMS_UNIT:
                amount = 1000
            elif unit == self.GRAMS_UNIT:
                amount = 1
            elif unit == self.MILLIGRAMS_UNIT:
                amount = 0.001
            elif unit == self.POUNDS_UNIT:
                amount = 453.592
            elif unit == self.OUNCES_UNIT:
                amount = 28.3495
            else:
                raise Exception("Invalid unit specified")
        else:
            amount = 1
        return amount
    
    def get_normalized_weight_unit(self, unit):
        normalized_unit = None
        if unit in self.WEIGHT_UNITS:
            normalized_unit = self.KILOGRAMS_UNIT
        return normalized_unit
    
    def get_amount_to_units(self, convert_unit, current_unit):
        convert_unit_amount = self.get_weight_conversion_amount(convert_unit)
        current_unit_amount = self.get_weight_conversion_amount(current_unit)
        conversion_amount = current_unit_amount / convert_unit_amount
        return conversion_amount
    
    def convert_weight_to_units(self, convert_unit, amount, current_units, raise_exception=True):
        normalized_amount = None
        normalized_amount = amount * self.get_amount_to_units(convert_unit, current_units)
        return normalized_amount
    
class DistanceUnitHelper:
    KILOMETERS_UNIT = 'kilometers'
    MILES_UNIT = 'miles'

    DISTANCE_UNITS = [
        KILOMETERS_UNIT,
        MILES_UNIT,
    ]

    ALL_DISTANCE_UNITS = (
        (KILOMETERS_UNIT, 'Kilometers'),
        (MILES_UNIT, 'Miles'),
    )

    def get_distance_conversion_amount(self, unit):
        if unit:
            if unit == self.KILOMETERS_UNIT:
                amount = 1000
            elif unit == self.MILES_UNIT:
                amount = 1609.34
            else:
                raise Exception("Invalid unit specified")
        else:
            amount = 1
        return amount
    
    def get_normalized_distance_unit(self, unit):
        normalized_unit = None
        if unit in self.DISTANCE_UNITS:
            normalized_unit = self.KILOMETERS_UNIT
        return normalized_unit
    
    def get_amount_to_units(self, convert_unit, current_unit):
        convert_unit_amount = self.get_distance_conversion_amount(convert_unit)
        current_unit_amount = self.get_distance_conversion_amount(current_unit)
        conversion_amount = current_unit_amount / convert_unit_amount
        return conversion_amount
    
    def convert_distance_to_units(self, convert_unit, amount, current_units, raise_exception=True):
        normalized_amount = None
        normalized_amount = amount * self.get_amount_to_units(convert_unit, current_units)
        return normalized_amount