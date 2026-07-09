from marketing.models import GeneralPO, ActualPOClub, PurchaseOrder
from shared.approvals.constants.task_entities import TASK_ENTITY_CHOICES, GENERAL_PO_ENTITY, PO_CLUB_ENTITY, PURCHASE_ORDER_ENTITY, ORDER_COSTING_VERSION
from supplier_po.models import GeneralPOMaterialQuantity
from supplier_po.general_po.serializers import GeneralPOMaterialQuantitySerializer
from marketing.serializers import BomSerializer
from marketing.models import PurchaseOrderBom
from datetime import datetime, timedelta
import pytz


class CostingTimelineHelper:

    def __init__(self, request, order_costing_version):
            self.version = order_costing_version
            self.request = request

    @staticmethod
    def get_date_display(date):
        str_date = None
        if date:
            str_date = date.strftime("%Y-%m-%d %I:%M:%S %p")
        return str_date
    
    def get_costing_data(self):
        if self.version.created.date() == self.version.approved_date:
            approved_date = self.version.created + timedelta(hours=1)
        else:
            if self.version.approved_date:
                approved_date = datetime.combine(self.version.approved_date, datetime.min.time(), tzinfo=pytz.UTC)
            else:
                approved_date = None

        activities = [
            ('Order Costing Created', self.version.created),
            ('Order Costing Approved', approved_date),
        ]
        
        data = []
        for activity, date in activities:
            if date:
                data.append(
                    {
                        'id': self.version.id,
                        'date': date,
                        'date_display': self.get_date_display(date),
                        'activity': activity,
                        'entity': ORDER_COSTING_VERSION,
                        'display_number': self.version.display_number,
                    }
                )
        return data
    
    def get_general_po_data(self):
        data = []
        general_pos = GeneralPO.objects.filter(costing=self.version, po_club=None).order_by('created')
        for general_po in general_pos:
            general_po_data = {
                'id': general_po.id,
                'date': general_po.created,
                'date_display': self.get_date_display(general_po.created),
                'activity': dict(TASK_ENTITY_CHOICES).get(GENERAL_PO_ENTITY),
                'entity': GENERAL_PO_ENTITY,
                'display_number': general_po.display_number,
            }
            data.append(general_po_data)
        return data

    def get_po_club_data(self):
        data = []
        club_ids = PurchaseOrder.objects.filter(costing_version=self.version).values_list('actual_po_club', flat=True)
        po_clubs = ActualPOClub.objects.filter(id__in=club_ids).order_by('created')

        for po_club in po_clubs:
            po_club_data = {
                'id': po_club.id,
                'date': po_club.created,
                'date_display': self.get_date_display(po_club.created),
                'activity': dict(TASK_ENTITY_CHOICES).get(PO_CLUB_ENTITY),
                'entity': PO_CLUB_ENTITY,
                'display_number': po_club.display_number,
                'pos': []
            }
            pos = PurchaseOrder.objects.filter(actual_po_club=po_club).order_by('created')
            for po in pos:
                boms = PurchaseOrderBom.objects.filter(purchase_order=po).order_by('material__material_detail__generic_material__user_material')
                po_club_data['pos'].append({
                    'id': po.id,
                    'date': po.created,
                    'date_display': self.get_date_display(po.created),
                    'activity': dict(TASK_ENTITY_CHOICES).get(PURCHASE_ORDER_ENTITY),
                    'entity': PURCHASE_ORDER_ENTITY,
                    'display_number': po.display_number,
                    #'data': BomSerializer(boms, many=True).data
                })
            data.append(po_club_data)
        return data
    
    def get_combined_data(self):
        costing_data = self.get_costing_data()
        general_po_data = self.get_general_po_data()
        po_club_data = self.get_po_club_data()
        combined_data = costing_data + general_po_data + po_club_data
        combined_data = sorted(combined_data, key=lambda x: x['date'])
        return combined_data