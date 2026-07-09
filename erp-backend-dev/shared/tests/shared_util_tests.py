from shared.tests.mixins.base_test_mixins import BaseTestCaseMixin
from shared.utils import *


class TestSharedUtilFunctions(BaseTestCaseMixin):

    def test_convert_per_unit_cost(self):
        conversion = convert_per_unit_cost('meters', 1000, 'per_meter')
        self.assertEqual(conversion['cost'], 1000)
        self.assertEqual(conversion['per_cost_unit'], 'per_meter')

        conversion = convert_per_unit_cost('meters', 10, 'per_centimeter')
        self.assertEqual(conversion['cost'], 1000)
        self.assertEqual(conversion['per_cost_unit'], 'per_meter')


        conversion = convert_per_unit_cost('pieces', 10, 'per_piece')
        self.assertEqual(conversion['cost'], 10)
        self.assertEqual(conversion['per_cost_unit'], 'per_piece')

        try:
            conversion = convert_per_unit_cost('yards', 10, 'per_centimeters')
            self.fail("Invalid conversion. Only meter conversion is possible")
        except:
            pass

        try:
            conversion = convert_per_unit_cost('pieces', 10, 'per_centimeters')
            self.fail("Invalid conversion. Only meter conversion is possible")
        except:
            pass

        conversion = convert_per_unit_cost('pieces', 10, None)
        self.assertEqual(conversion['cost'], None)

