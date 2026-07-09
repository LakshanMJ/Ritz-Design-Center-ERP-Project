from unittest import TestCase

from shared.tests.mixins.create_test_data_mixins import SharedTestDataMixin


class BaseTestCaseMixin(TestCase, SharedTestDataMixin):
    '''
        Use this as the base test case for every test
    '''
    def setUp(self):
        super().setUp()


