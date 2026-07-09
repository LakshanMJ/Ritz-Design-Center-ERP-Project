from datetime import datetime

import pytest
from dateutil.relativedelta import relativedelta
from model_bakery import baker

from shared.tests.mixins.base_test_mixins import BaseTestCaseMixin
from marketing.models import OrderCostingVersion, PurchaseOrder, ActualPOClub


@pytest.mark.django_db
class PreCostingTestCase(BaseTestCaseMixin):
    
    def setUp(self):
        super().setUp()

    def create_purchase_orders(self):
        pass

    def create_grn_po_packs(self):
        pass

    def test_(self):
        pass