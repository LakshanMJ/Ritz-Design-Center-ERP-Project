import math

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from marketing.mixins.invoice_mixins import DebitNoteMixin, RemediationDetailMixin
from marketing.models import SupplierPODeliveryInvoice
from shared.permissions.roles import MERCHANT_ROLE, STORES_USER_ROLE, FINANCE_ADMIN_ROLE, FINANCE_USER_ROLE
from shared.permissions.view_permissions import HasPermission
from rest_framework.generics import get_object_or_404, CreateAPIView
from marketing.models import SupplierPODeliveryInvoice, DebitNote, DebitNoteMaterial, ReplacementQuantityDeliveryDate, \
    SupplierPOGRNMaterial, SupplierPODeliveryInvoice, SupplierPO, \
    FabricGRNBatchNumber, SupplierPOGRNMaterialDetail, SupplierPOGRN, FabricGRNWidth, InHouseMaterial, SupplierDeliveryDate, SupplierActualDeliveryDate
from marketing.serializers import DebitNoteSerializer, SupplierPOActionSerializer
from materials.serializers.material_serializers import CustomerBrandMaterialBasicSerializer, \
    SupplierCustomerBrandMaterialSerializer
from shared.utils import convert_quantity_to_unit, valid_material_unit, \
    get_display_value_for_unit, get_material_unit_category, get_quantity_dictionary
from supplier_po.helpers.summary_calculator_helper import InvoiceDeliverySummary
from supplier_po.helpers.summary_calculator_helper import GRNMaterialSummaryCalculatorMixin
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination

class CommercialInvoiceDeliverySummaryView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        
        id = kwargs.get('pk', None)
        supplier_po = get_object_or_404(SupplierPO, pk=kwargs['supplier_po'])
        invoice = get_object_or_404(SupplierPODeliveryInvoice, id=id)
        data = InvoiceDeliverySummary(invoice, supplier_po).get_invoice_delivery_date_summarized_data()
        return Response(data, status=status.HTTP_200_OK)


class DebitNoteMetaDataView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request):
        grn_states = []
        for choice in DebitNote.STATE_CHOICES:
            grn_states.append({"id": choice[0], "name": choice[1]})

        metadata = {
            'grn_states': grn_states,
        }
        return Response(metadata)


# DS Reviewed  TODO - is this being used any more
class DebitNoteSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def post(self, request, *args, **kwargs):
        debit_note = get_object_or_404(DebitNote, pk=kwargs.get('pk', None))

        debit_note_attachment = request.data.get('debit_note_attachment', None)
        free_of_charge = request.data.get('free_of_charge', None)
        debit_note_status = request.data.get('status', None)
        debit_note.free_of_charge = free_of_charge
        debit_note.attachment = debit_note_attachment
        debit_note.status = debit_note_status
        debit_note.save()

        return Response({'success': True}, status=status.HTTP_200_OK)


# DS Reviewed
class DebitNoteDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]
    serializer_class = DebitNoteSerializer
    queryset = DebitNote.objects.all()


# DS Reviewed
class ReplacementFutureDeliveryDatesDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        data = []
        commercial_invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=kwargs.get('commercial_invoice_id', None))
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=kwargs.get('supplier_po_grn_material', None))

        deliveries = commercial_invoice.get_supplier_deliveries_from_replacement_deliveries( supplier_po_grn_material)  # DS Review note TODO - question. Does this not need the reason?
        for delivery in deliveries:
            data.append({
                'delivery_id': delivery.id,
                'date': delivery.confirmed_delivery_date
            })

        return Response(data)


# DS Review notes - this has review notes # TODO move RemediationDetailMixin and DebitNotemixin to invoice
class ColorToneDefectDebitNoteReplacementDetailView(APIView, RemediationDetailMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def get_replacement_grn_materials(self, supplier_po_grn_material):
        data = {
            'raise_types': self.get_raise_types(supplier_po_grn_material, DebitNoteMaterial.REJECTED_COLOR_TONE_REASON, ReplacementQuantityDeliveryDate.COLOR_TONE_REJECTED_REPLACEMENT_REASON),
            'grn_material_quantity_details': {},
            'replacement_delivery_date_details': []
        }
        debit_note_material = supplier_po_grn_material.get_active_debit_note_supplier_po_grn_material(DebitNoteMaterial.REJECTED_COLOR_TONE_REASON)

        data['grn_material_quantity_details'] = {
            'grn_material_id': supplier_po_grn_material.id,
            'total_quantity': supplier_po_grn_material.get_color_tone_rejected_total_replacement_quantity(),
            # DS Review Note TODO Dasith - need to review
            'total_debit_note_quantity': self.get_field_quantity_info_or_none(debit_note_material, 'total_quantity', 'total_quantity_units'),
            'total_replacement_quantity': supplier_po_grn_material.get_total_replacement_quantity(ReplacementQuantityDeliveryDate.COLOR_TONE_REJECTED_REPLACEMENT_REASON)
            # DS Review Note TODO Dasith - need to review
        }

        data['replacement_delivery_date_details'] = self.get_replacement_details(supplier_po_grn_material, ReplacementQuantityDeliveryDate.COLOR_TONE_REJECTED_REPLACEMENT_REASON)
        return data


class ColorToneDefectDebitNoteReplacementCreateUpdateView(CreateAPIView, DebitNoteMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def currently_assigned_to_debit_note(self, debit_note, supplier_po_grn_material):
        currently_assigned = False
        if debit_note:
            currently_assigned = DebitNoteMaterial.objects.filter(debit_note=debit_note, supplier_po_grn_material=supplier_po_grn_material, reason=DebitNoteMaterial.REJECTED_COLOR_TONE_REASON).exists()
        return currently_assigned

    def validate_quantities(self, supplier_po_grn_material):
        total_quantity = supplier_po_grn_material.get_color_tone_rejected_total_replacement_quantity()
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_total_quantity = convert_quantity_to_unit(normalized_unit, total_quantity['quantity'], total_quantity['quantity_units']).get('quantity')
        normalized_replacement_quantity = self.get_normalized_value(self.TOTAL_REPLACEMENT_QUANTITY_KEY, self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, normalized_unit)
        normalized_debit_note_quantity = self.get_normalized_value(self.TOTAL_DEBIT_NOTE_QUANTITY_KEY, self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, normalized_unit)

        if normalized_replacement_quantity + normalized_debit_note_quantity != normalized_total_quantity:
            normalized_unit_display = get_display_value_for_unit(normalized_unit)
            self.add_error(self.GENERAL_ERRORS_KEY, f'''
               The Replacement Total Quantity ({normalized_replacement_quantity} {normalized_unit_display}) and Debit Note Quantity ({normalized_debit_note_quantity} 
               {normalized_unit_display}) should add up to the Total Quantity''')
        # TODO - validate the individual quantities match the totals for debit note and replacements and the replacement SupplierDeliveryDates exist

    def validate_units(self, supplier_po_grn_material):
        raise_types = self.request.data.get('raise_types', {})
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_unit_catergory = get_material_unit_category(normalized_unit)
        debit_note_quantity_units = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, None)
        total_replacement_quantity_units = self.request.data.get(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, None)

        if not valid_material_unit(debit_note_quantity_units, normalized_unit_catergory) and raise_types['is_debit_note']:
            self.add_error(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, 'Invalid Total Debit Note Quantity Units')

        if not valid_material_unit(total_replacement_quantity_units, normalized_unit_catergory) and raise_types['is_replacement']:
            self.add_error(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, 'Invalid Total Replacement Quantity Units')

    def post(self, request, *args, **kwargs):
        self.errors = {self.GENERAL_ERRORS_KEY: [], }
        self.haveErrors = False

        self.VALIDATE_UNIT_KEYS = [
            self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY,
            self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY,
        ]

        commercial_invoice_id = kwargs.get('commercial_invoice_id', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=commercial_invoice_id)
        grn_material_id = kwargs.get('supplier_po_grn_material_id', None)
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)

        self.validate_data(invoice, supplier_po_grn_material)

        if self.haveErrors:
            response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            self.process_replacements(invoice, supplier_po_grn_material,
                                      ReplacementQuantityDeliveryDate.COLOR_TONE_REJECTED_REPLACEMENT_REASON)
            self.process_debit_note(invoice, supplier_po_grn_material, DebitNoteMaterial.REJECTED_COLOR_TONE_REASON)
            response = Response({'success': True})
        return response


# DS Reviewed
class BatchRejectionRemediationDetailView(APIView, RemediationDetailMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def get_replacement_grn_materials(self, supplier_po_grn_material):
        data = {
            'raise_types': self.get_raise_types(supplier_po_grn_material, DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON, ReplacementQuantityDeliveryDate.DEFECT_REJECTED_REPLACEMENT_REASON),
            'grn_material_quantity_details': {},
            'replacement_delivery_date_details': []
        }
        defect_debit_note_material = supplier_po_grn_material.get_active_debit_note_supplier_po_grn_material(DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON)
        cpi_debit_note_material = supplier_po_grn_material.get_active_debit_note_supplier_po_grn_material(DebitNoteMaterial.REJECTED_DEFECT_CPI_REASON)

        data['grn_material_quantity_details'] = {
            'grn_material_id': supplier_po_grn_material.id,
            'total_quantity': get_quantity_dictionary(supplier_po_grn_material.total_qa_rejected_quantity, supplier_po_grn_material.total_qa_rejected_quantity_units),
            'total_debit_note_quantity': self.get_field_quantity_info_or_none(defect_debit_note_material, 'total_quantity', 'total_quantity_units'),
            'total_cpi_quantity': self.get_field_quantity_info_or_none(cpi_debit_note_material, 'total_quantity', 'total_quantity_units'),
            'total_replacement_quantity': supplier_po_grn_material.get_total_replacement_quantity(ReplacementQuantityDeliveryDate.DEFECT_REJECTED_REPLACEMENT_REASON)
            # DS Review TODO - this line needs to be reviewed
        }
        data['replacement_delivery_date_details'] = self.get_replacement_details(supplier_po_grn_material, ReplacementQuantityDeliveryDate.DEFECT_REJECTED_REPLACEMENT_REASON)
        return data


class BatchRejectionRemediation(CreateAPIView, DebitNoteMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def validate_quantities(self, supplier_po_grn_material):
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_total_quantity = convert_quantity_to_unit(normalized_unit, supplier_po_grn_material.total_qa_rejected_quantity, supplier_po_grn_material.total_qa_rejected_quantity_units).get('quantity')
        normalized_replacement_quantity = self.get_normalized_value(self.TOTAL_REPLACEMENT_QUANTITY_KEY, self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, normalized_unit)
        normalized_debit_note_quantity = self.get_normalized_value(self.TOTAL_DEBIT_NOTE_QUANTITY_KEY, self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, normalized_unit)
        normalized_cpi_quantity = self.get_normalized_value(self.TOTAL_CPI_QUANTITY_KEY, self.TOTAL_CPI_QUANTITY_UNITS_KEY, normalized_unit)
        if normalized_replacement_quantity + normalized_debit_note_quantity + normalized_cpi_quantity != normalized_total_quantity:
            normalized_unit_display = get_display_value_for_unit(normalized_unit)
            self.add_error(self.GENERAL_ERRORS_KEY,
                           f'''
               The Replacement Total Quantity ({normalized_replacement_quantity} {normalized_unit_display}), Debit Note Quantity ({normalized_debit_note_quantity} 
               {normalized_unit_display}) and CPI Quantity ({normalized_cpi_quantity} {normalized_unit_display}) should add up to the Total Quantity'''
           )

    def currently_assigned_to_debit_note(self, debit_note, supplier_po_grn_material):
        currently_assigned = False
        if debit_note:
            currently_assigned_cpi = DebitNoteMaterial.objects.filter(debit_note=debit_note, supplier_po_grn_material=supplier_po_grn_material, reason=DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON).exists()
            currently_assigned_debit_note = DebitNoteMaterial.objects.filter(debit_note=debit_note, supplier_po_grn_material=supplier_po_grn_material, reason=DebitNoteMaterial.REJECTED_DEFECT_CPI_REASON).exists()
            currently_assigned = currently_assigned_cpi or currently_assigned_debit_note
        return currently_assigned

    def validate_units(self, supplier_po_grn_material):
        raise_types = self.request.data.get('raise_types', {})
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_unit_catergory = get_material_unit_category(normalized_unit)
        debit_note_quantity_units = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, None)
        total_replacement_quantity_units = self.request.data.get(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, None)
        total_cpi_quantity_units = self.request.data.get(self.TOTAL_CPI_QUANTITY_UNITS_KEY, None)

        if not valid_material_unit(debit_note_quantity_units, normalized_unit_catergory) and raise_types['is_debit_note']:
            self.add_error(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, 'Invalid Total Debit Note Quantity Units')

        if not valid_material_unit(total_replacement_quantity_units, normalized_unit_catergory) and raise_types['is_replacement']:
            self.add_error(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, 'Invalid Total Replacement Quantity Units')

        if not valid_material_unit(total_cpi_quantity_units, normalized_unit_catergory) and raise_types['is_cpi']:
            self.add_error(self.TOTAL_CPI_QUANTITY_UNITS_KEY, 'Invalid Total CPI Quantity Units')

    def post(self, request, *args, **kwargs):
        self.errors = {self.GENERAL_ERRORS_KEY: [], }
        self.haveErrors = False

        self.VALIDATE_UNIT_KEYS = [
            self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY,
            self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY,
            self.TOTAL_CPI_QUANTITY_KEY
        ]

        commercial_invoice_id = kwargs.get('commercial_invoice_id', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=commercial_invoice_id)
        grn_material_id = kwargs.get('supplier_po_grn_material_id', None)
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)

        self.validate_data(invoice, supplier_po_grn_material)

        if self.haveErrors:
            response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            self.process_replacements(invoice, supplier_po_grn_material, ReplacementQuantityDeliveryDate.DEFECT_REJECTED_REPLACEMENT_REASON)
            self.process_debit_note(invoice, supplier_po_grn_material, DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON)
            self.process_cpi_debit_note(invoice, supplier_po_grn_material, DebitNoteMaterial.REJECTED_DEFECT_CPI_REASON)
            response = Response({'success': True})
        return response


# DS Reviewed
class ShortageRemediationDetailView(APIView, RemediationDetailMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def get_replacement_grn_materials(self, supplier_po_grn_material):
        data = {
            'raise_types': self.get_raise_types(supplier_po_grn_material, DebitNoteMaterial.SHORT_REASON, ReplacementQuantityDeliveryDate.SHORT_REPLACEMENT_REASON),
            'grn_material_quantity_details': {},
            'replacement_delivery_date_details': []
        }
        debit_note_material = supplier_po_grn_material.get_active_debit_note_supplier_po_grn_material(
            DebitNoteMaterial.SHORT_REASON)

        data['grn_material_quantity_details'] = {
            'grn_material_id': supplier_po_grn_material.id,
            'total_quantity': get_quantity_dictionary(supplier_po_grn_material.total_deficit_quantity,
                                                      supplier_po_grn_material.total_deficit_quantity_units),
            'total_debit_note_quantity': self.get_field_quantity_info_or_none(debit_note_material, 'total_quantity',
                                                                              'total_quantity_units'),
            'total_replacement_quantity': supplier_po_grn_material.get_total_replacement_quantity(
                ReplacementQuantityDeliveryDate.SHORT_REPLACEMENT_REASON)
        }
        data['replacement_delivery_date_details'] = self.get_replacement_details(supplier_po_grn_material,
                                                                                 ReplacementQuantityDeliveryDate.SHORT_REPLACEMENT_REASON)
        return data


class ShortageRemediation(CreateAPIView, DebitNoteMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def validate_quantities(self, supplier_po_grn_material):
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_total_quantity = convert_quantity_to_unit(normalized_unit, supplier_po_grn_material.total_deficit_quantity, supplier_po_grn_material.total_deficit_quantity_units).get('quantity')
        normalized_replacement_quantity = self.get_normalized_value(self.TOTAL_REPLACEMENT_QUANTITY_KEY, self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, normalized_unit)
        normalized_debit_note_quantity = self.get_normalized_value(self.TOTAL_DEBIT_NOTE_QUANTITY_KEY, self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, normalized_unit)

        if normalized_replacement_quantity + normalized_debit_note_quantity != normalized_total_quantity:
            normalized_unit_display = get_display_value_for_unit(normalized_unit)
            self.add_error(self.GENERAL_ERRORS_KEY,
                           f'''
               The Replacement Total Quantity ({normalized_replacement_quantity} {normalized_unit_display}), Debit Note Quantity ({normalized_debit_note_quantity} 
               {normalized_unit_display}) and should add up to the Total Quantity'''
                           )

    def currently_assigned_to_debit_note(self, debit_note, supplier_po_grn_material):
        currently_assigned = False
        if debit_note:
            currently_assigned_debit_note = DebitNoteMaterial.objects.filter(debit_note=debit_note, supplier_po_grn_material=supplier_po_grn_material, reason=DebitNoteMaterial.SHORT_REASON).exists()
            currently_assigned = currently_assigned_debit_note
        return currently_assigned

    def validate_units(self, supplier_po_grn_material):
        raise_types = self.request.data.get('raise_types', {})
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_unit_catergory = get_material_unit_category(normalized_unit)
        debit_note_quantity_units = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, None)
        total_replacement_quantity_units = self.request.data.get(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, None)

        if not valid_material_unit(debit_note_quantity_units, normalized_unit_catergory) and raise_types['is_debit_note']:
            self.add_error(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, 'Invalid Total Debit Note Quantity Units')

        if not valid_material_unit(total_replacement_quantity_units, normalized_unit_catergory) and raise_types['is_replacement']:
            self.add_error(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, 'Invalid Total Replacement Quantity Units')

    def post(self, request, *args, **kwargs):
        self.errors = {self.GENERAL_ERRORS_KEY: [], }
        self.haveErrors = False

        self.VALIDATE_UNIT_KEYS = [
            self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY,
            self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY,
        ]

        commercial_invoice_id = kwargs.get('commercial_invoice_id', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=commercial_invoice_id)
        grn_material_id = kwargs.get('supplier_po_grn_material_id', None)
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)

        self.validate_data(invoice, supplier_po_grn_material)

        if self.haveErrors:
            response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            self.process_replacements(invoice, supplier_po_grn_material, ReplacementQuantityDeliveryDate.SHORT_REPLACEMENT_REASON)
            self.process_debit_note(invoice, supplier_po_grn_material, DebitNoteMaterial.SHORT_REASON)
            response = Response({'success': True})
        return response


class ExcessRemediationDetailView(APIView, RemediationDetailMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def get_replacement_grn_materials(self, supplier_po_grn_material):
        data = {
            'raise_types': self.get_raise_types(supplier_po_grn_material, DebitNoteMaterial.EXCESS_REASON),
            'grn_material_quantity_details': {},
            'replacement_delivery_date_details': []
        }
        excess_debit_note_material = supplier_po_grn_material.get_active_debit_note_supplier_po_grn_material(
            DebitNoteMaterial.EXCESS_REASON)

        data['grn_material_quantity_details'] = {
            'grn_material_id': supplier_po_grn_material.id,
            'total_quantity': get_quantity_dictionary(supplier_po_grn_material.total_excess_quantity, supplier_po_grn_material.total_excess_quantity_units),
            'total_debit_note_quantity': self.get_field_quantity_info_or_none(excess_debit_note_material, 'total_quantity', 'total_quantity_units'),
        }
        return data


class ExcessRemediation(CreateAPIView, DebitNoteMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def currently_assigned_to_debit_note(self, debit_note, supplier_po_grn_material):
        currently_assigned = False
        if debit_note:
            currently_assigned_debit_note = DebitNoteMaterial.objects.filter(debit_note=debit_note, supplier_po_grn_material=supplier_po_grn_material, reason=DebitNoteMaterial.EXCESS_REASON).exists()
            currently_assigned = currently_assigned_debit_note
        return currently_assigned

    def validate_quantities(self, supplier_po_grn_material):
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_total_quantity = convert_quantity_to_unit(normalized_unit, supplier_po_grn_material.total_excess_quantity, supplier_po_grn_material.total_excess_quantity_units).get('quantity')
        normalized_debit_note_quantity = self.get_normalized_value(self.TOTAL_DEBIT_NOTE_QUANTITY_KEY,self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, normalized_unit)
        if normalized_debit_note_quantity != normalized_total_quantity:
            normalized_unit_display = get_display_value_for_unit(normalized_unit)
            self.add_error(self.GENERAL_ERRORS_KEY,
                           f'''
               Debit Note Quantity ({normalized_debit_note_quantity} {normalized_unit_display}) and should equal to the Total Quantity'''
                           )

    def validate_units(self, supplier_po_grn_material):
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_unit_catergory = get_material_unit_category(normalized_unit)
        debit_note_quantity_units = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, None)

        if not valid_material_unit(debit_note_quantity_units, normalized_unit_catergory):
            self.add_error(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, 'Invalid Total Debit Note Quantity Units')

    def post(self, request, *args, **kwargs):
        self.errors = {self.GENERAL_ERRORS_KEY: [], }
        self.haveErrors = False

        commercial_invoice_id = kwargs.get('commercial_invoice_id', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=commercial_invoice_id)
        grn_material_id = kwargs.get('supplier_po_grn_material_id', None)
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)

        self.validate_data(invoice, supplier_po_grn_material)
        if self.haveErrors:
            response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            self.create_debit_note(invoice, supplier_po_grn_material, supplier_po_grn_material.total_excess_quantity,
                                   supplier_po_grn_material.total_excess_quantity_units,
                                   DebitNoteMaterial.EXCESS_REASON)
            response = Response({'success': True})
        return response


# DS Reviewed
class MismatchRemediationDetail(APIView, RemediationDetailMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def get_replacement_grn_materials(self, supplier_po_grn_material):
        data = {
            'raise_types': self.get_raise_types(supplier_po_grn_material, DebitNoteMaterial.MISMATCH_REASON),
            'grn_material_quantity_details': {},
            'replacement_delivery_date_details': []
        }

        mismatch_debit_note_material = supplier_po_grn_material.get_active_debit_note_supplier_po_grn_material(
            DebitNoteMaterial.MISMATCH_REASON)
        total_quantity = supplier_po_grn_material.get_mismatch_remediation_quantity()

        data['grn_material_quantity_details'] = {
            'grn_material_id': supplier_po_grn_material.id,
            'total_quantity': total_quantity,
            'total_debit_note_quantity': self.get_field_quantity_info_or_none(mismatch_debit_note_material, 'total_quantity', 'total_quantity_units'),
        }
        return data


class MismatchRemediation(CreateAPIView, DebitNoteMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def currently_assigned_to_debit_note(self, debit_note, supplier_po_grn_material):
        currently_assigned = False
        if debit_note:
            currently_assigned_debit_note = DebitNoteMaterial.objects.filter(debit_note=debit_note, supplier_po_grn_material=supplier_po_grn_material, reason=DebitNoteMaterial.MISMATCH_REASON).exists()
            currently_assigned = currently_assigned_debit_note.exists()
        return currently_assigned

    def validate_quantities(self, supplier_po_grn_material):
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_total_quantity = convert_quantity_to_unit(normalized_unit, supplier_po_grn_material.mismatch_quantity, supplier_po_grn_material.mismatch_quantity_units).get(
            'quantity')
        normalized_debit_note_quantity = self.get_normalized_value(self.TOTAL_DEBIT_NOTE_QUANTITY_KEY, self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, normalized_unit)
        if abs(normalized_debit_note_quantity) != abs(normalized_total_quantity):
            normalized_unit_display = get_display_value_for_unit(normalized_unit)
            self.add_error(self.GENERAL_ERRORS_KEY,
                           f'''
               Debit Note Quantity ({normalized_debit_note_quantity} {normalized_unit_display}) and should equal to the Total Quantity'''
                           )

    def validate_units(self, supplier_po_grn_material):
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_unit_catergory = get_material_unit_category(normalized_unit)
        debit_note_quantity_units = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, None)

        if not valid_material_unit(debit_note_quantity_units, normalized_unit_catergory):
            self.add_error(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, 'Invalid Total Debit Note Quantity Units')

    def post(self, request, *args, **kwargs):
        self.errors = {self.GENERAL_ERRORS_KEY: [], }
        self.haveErrors = False

        commercial_invoice_id = kwargs.get('commercial_invoice_id', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=commercial_invoice_id)
        grn_material_id = kwargs.get('supplier_po_grn_material_id', None)
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)

        if supplier_po_grn_material.mismatch_quantity < 0:
            self.validate_quantities(supplier_po_grn_material)
            if self.haveErrors:
                response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                self.create_debit_note(invoice, supplier_po_grn_material, abs(supplier_po_grn_material.mismatch_quantity), supplier_po_grn_material.mismatch_quantity_units, DebitNoteMaterial.MISMATCH_REASON)
                response = Response({'success': True})
            return response
        else:
            return Response({'success': False})


class SupplierPOFinancialDetailView(APIView, GRNMaterialSummaryCalculatorMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def get_shade_wise_roll_details(self, grn, material):
        data = []
        replacement_grns = SupplierPOGRN.objects.filter(
            replacement_grn=grn)  # TODO need to implement get Data from InHouseMaterial.

        if replacement_grns:
            for replacement_grn in replacement_grns:
                pack = replacement_grn.supplier_pack_list
                material_total_excess_quantity = pack.get_material_total_excess_quantity(material)
                shades = replacement_grn.get_shades()

                pack_data = {
                    'id': pack.id,
                    'grn_id': replacement_grn.id,
                    'grn_number': replacement_grn.grn_number,
                    'pack_list_name': pack.display_number,
                    'total_quantity': {
                        'quantity': material_total_excess_quantity['quantity'],
                        'quantity_units': material_total_excess_quantity['quantity_units'],
                        'quantity_units_display': material_total_excess_quantity['quantity_units_display'],
                    },
                    'shades': []
                }

                for shade in shades:

                    shade_data = {
                        'id': shade.id,
                        'shade': shade.shade_name,
                        'widths': []
                    }
                    widths = FabricGRNWidth.objects.filter(grn=replacement_grn)
                    for width in widths:

                        width_data = {
                            'id': width.id,
                            'width': width.actual_width,
                            'rolls': []
                        }
                        material_detail_ids = InHouseMaterial.objects.filter(
                            grn_material_detail__supplier_po_grn_material__supplier_po_grn=replacement_grn,
                            grn_material_detail__shade__supplier_po_shade=shade,
                            grn_material_detail__fabricgrndetail__actual_width=width
                        ).values_list('grn_material_detail', flat=True)
                        rolls = SupplierPOGRNMaterialDetail.objects.filter(id__in=material_detail_ids)
                        for roll in rolls:
                            roll_data = {
                                'id': roll.id,
                                'pack_number': roll.fabricgrndetail.pack_number,
                                'quantity': roll.actual_quantity,
                                'quantity_units': roll.get_actual_quantity_units_display(),
                            }
                            width_data['rolls'].append(roll_data)
                        if rolls:
                            shade_data['widths'].append(width_data)
                    if shade_data['widths']:
                        pack_data['shades'].append(shade_data)
                if pack_data['shades']:
                    data.append(pack_data)
        return data

    def get_pcl_data(self, supplier_po):
        import datetime
        from django.db.models import Sum
        data = []
        po_club = supplier_po.po_club
        deliveries = supplier_po.get_all_delivery_dates()

        for delivery in deliveries:
            grns = delivery.get_delivery_date_grns()
            price_breakdown = []
            for grn in grns:
                grn_materials = SupplierPOGRNMaterial.objects.filter(
                    supplier_po_grn=grn
                ).order_by('supplier_po_grn__id')
                for grn_material in grn_materials:
                    actual_delivery_date = grn_material.supplier_po_grn.get_actual_delivery_date()
                    price_breakdown.append({
                        'id': grn.id,
                        'display_number': '%s / %s / %s' % (
                        actual_delivery_date.delivery_date, grn.supplier_pack_list.display_number, grn.grn_number),
                        'material_label': grn_material.grn_material.customer_brand_material.material_label,
                        'verbose_reference_code': grn_material.grn_material.customer_brand_material.verbose_reference_code,
                        'total_price': grn_material.total_price
                    })

            total_price = SupplierPOGRNMaterial.objects.filter(
                supplier_po_grn__in=grns
            ).aggregate(total_price=Sum('total_price', default=0))
            data.append({
                'id': delivery.id,
                'display_number': delivery.display_number,
                'actual_date': delivery.actual_delivery_date.delivery_date if delivery.actual_delivery_date else None,
                'due_date': delivery.actual_delivery_date.delivery_date + datetime.timedelta(supplier_po.get_supplier_due_term()) if delivery.actual_delivery_date else None,
                'total_price': math.ceil(total_price['total_price']),  # TODO need to get from grn_materials
                'price_breaddown': price_breakdown
            })
        return data

    def get_formatted_summary(self, grns, po_club, supplier_po):
        data = self.get_po_club_grns_material_breakdown(po_club, grns, supplier_po)
        if data:
            data = data[0]
            data.pop('material', None)
        else:
            data = {}
        return data

    def get_calculated_values(self, grn, po_club, supplier_po):
        grn_queryset = SupplierPOGRN.objects.filter(id=grn.id)
        summary_data = self.get_formatted_summary(grn_queryset, po_club, supplier_po)
        return summary_data

    def get_replacement_data(self, grn, material):
        replacements = ReplacementQuantityDeliveryDate.objects.filter(
            supplier_po_grn_material__in=grn.supplierpogrnmaterial_set.all()
        )
        data = []
        pack = grn.supplier_pack_list
        for replacement in replacements:
            data.append({
                'id': replacement.id,
                'pack_list': pack.display_number,
                'delivery_display_number': replacement.replacement_expected_delivery_date.display_number,
                'date': replacement.replacement_expected_delivery_date.confirmed_delivery_date,
                'quantity': get_quantity_dictionary(replacement.quantity, replacement.quantity_units),
                'reason': replacement.reason,
                'reason_display': replacement.get_reason_display()
            })
        return data

    def get_cpi_breakdown(self, grn):
        pack_data = {}
        grn_materials = grn.supplierpogrnmaterial_set.all()
        pack = grn.supplier_pack_list
        pack_data = {
            'id': pack.id,
            'pack_list_name': pack.display_number,
            'batches': [],
        }

        if grn_materials:
            grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
                supplier_po_grn_material__in=grn_materials)
            batches = FabricGRNBatchNumber.objects.filter(
                id__in=grn_material_details.values_list('batch_number', flat=True)
            )

            for batch in batches:
                rolls = batch.get_cpi_rolls(grn_material_details)

                if rolls:
                    batch_data = {
                        'batch_id': batch.id,
                        'batch_name': batch.batch_number,
                        'supplier_po_grn_material_id': batch.grn_material.id,
                        'total_quantity': batch.get_total_quantity(rolls),
                        'rolls': []
                    }

                    for roll in rolls:
                        batch_data['rolls'].append(
                            {
                                'id': roll.id,
                                'pack_number': roll.fabricgrndetail.pack_number,
                                'quantity': roll.actual_quantity,
                                'quantity_units': roll.get_actual_quantity_units_display(),
                            }
                        )
                    pack_data['batches'].append(batch_data)
        return pack_data

    def get_receiving_breakdown(self, grn):
        data = []
        replacement_grns = SupplierPOGRN.objects.filter(replacement_grn=grn)
        if replacement_grns:
            for replacement_grn in replacement_grns:
                pack_data = {}
                grn_materials = replacement_grn.supplierpogrnmaterial_set.all()
                pack = replacement_grn.supplier_pack_list
                pack_data = {
                    'id': pack.id,
                    'pack_list_name': pack.display_number,
                    'batches': [],
                }
                if grn_materials:
                    grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
                        supplier_po_grn_material__in=grn_materials)
                    batches = FabricGRNBatchNumber.objects.filter(
                        id__in=grn_material_details.values_list('batch_number', flat=True)
                    )
                    for batch in batches:
                        material_detail_ids = InHouseMaterial.objects.filter(
                            grn_material_detail__supplier_po_grn_material__supplier_po_grn=replacement_grn,
                            grn_material_detail__batch_number=batch
                        ).values_list('grn_material_detail', flat=True)
                        rolls = SupplierPOGRNMaterialDetail.objects.filter(id__in=material_detail_ids)
                        if rolls:
                            batch_data = {
                                'batch_id': batch.id,
                                'batch_name': batch.batch_number,
                                'supplier_po_grn_material_id': batch.grn_material.id,
                                'total_quantity': batch.get_total_quantity(rolls),
                                'rolls': []
                            }

                            for roll in rolls:
                                batch_data['rolls'].append(
                                    {
                                        'id': roll.id,
                                        'pack_number': roll.fabricgrndetail.pack_number,
                                        'quantity': roll.actual_quantity,
                                        'quantity_units': roll.get_actual_quantity_units_display(),
                                    }
                                )
                            pack_data['batches'].append(batch_data)
                        data.append(pack_data)
        return data

    def get_leftover_breakdown(self, grn, material):
        pack_data = {}
        pack = grn.supplier_pack_list
        material_total_excess_quantity = pack.get_material_total_excess_quantity(material)
        pack_data = {
            'id': pack.id,
            'pack_list_name': pack.display_number,
            'total_quantity': material_total_excess_quantity,
            'replacement_details': self.get_shade_wise_roll_details(grn, material)
        }
        return pack_data

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po = SupplierPO.objects.get(pk=supplier_po_id)
        materials = supplier_po.get_supplier_po_material_list()
        response_data = {
            'pcl_data': [],
            'materials': [],
        }

        for material in materials:
            material_data = SupplierCustomerBrandMaterialSerializer(material).data
            material_data['deliveries'] = []

            deliveries = supplier_po.get_material_delivery_dates(material)
            for delivery in deliveries:
                delivery_data = {
                    'id': delivery.id,
                    'display_number': delivery.display_number,
                    'grns': []
                }

                grns = delivery.get_delivery_date_grns()
                for grn in grns:
                    grn_data = {
                        'id': grn.id,
                        'display_number': grn.grn_number,
                        'debit_note': {},
                        'cpi_breakdown': self.get_cpi_breakdown(grn),
                        'receiving_breakdown': self.get_receiving_breakdown(grn),
                        'leftover_breakdown': self.get_leftover_breakdown(grn, material),
                        'replacement_data': self.get_replacement_data(grn, material),
                        'calculated_summary': self.get_calculated_values(grn, grn.supplier_po.po_club, supplier_po)
                    }

                    debit_note = grn.get_debit_note()
                    if debit_note:
                        debit_note_data = {
                            'id': debit_note.id,
                            'display_number': debit_note.display_number,
                            'quantities': []
                        }

                        quantities = debit_note.debitnotematerial_set.all()
                        for quantity in quantities:
                            quantity_data = {
                                'id': quantity.id,
                                'pack_list_display_number': quantity.supplier_po_grn_material.supplier_po_grn.supplier_pack_list.display_number,
                                'reason': quantity.reason,
                                'reason_display': quantity.get_reason_display(),
                                'unit_price': quantity.unit_price,
                                'unit_price_units': quantity.unit_price_units,
                                'total_quantity': quantity.total_quantity,
                                'total_quantity_units': quantity.total_quantity_units,
                                'total_quantity_units_display': quantity.get_total_quantity_units_display(),
                                'total_price': quantity.total_price,
                            }
                            debit_note_data['quantities'].append(quantity_data)
                        grn_data['debit_note'] = debit_note_data
                    delivery_data['grns'].append(grn_data)
                material_data['deliveries'].append(delivery_data)
            response_data['materials'].append(material_data)
            response_data['pcl_data'] = self.get_pcl_data(supplier_po)
        return Response(response_data)


class WidthRemediationDetailView(APIView, RemediationDetailMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def get_replacement_grn_materials(self, supplier_po_grn_material):
        data = {
            'raise_types': self.get_raise_types(supplier_po_grn_material, ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON, ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON),
            'grn_material_quantity_details': {},
            'replacement_delivery_date_details': []
        }

        data['grn_material_quantity_details'] = {
            'grn_material_id': supplier_po_grn_material.id,
            'total_quantity': get_quantity_dictionary(supplier_po_grn_material.width_replacement_quantity,
                                                      supplier_po_grn_material.width_replacement_quantity),
            'total_replacement_quantity': supplier_po_grn_material.get_total_replacement_quantity(
                ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON)
        }
        data['replacement_delivery_date_details'] = self.get_replacement_details(supplier_po_grn_material,
                                                                                 ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON)
        return data


class WidthRemediationCreateView(CreateAPIView, DebitNoteMixin):
    permission_classes = (HasPermission,)
    write_roles = [FINANCE_USER_ROLE, ]

    def post(self, request, *args, **kwargs):
        self.errors = {self.GENERAL_ERRORS_KEY: [], }
        self.haveErrors = False

        self.VALIDATE_UNIT_KEYS = [
            self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY,
        ]

        commercial_invoice_id = kwargs.get('commercial_invoice_id', None)
        invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=commercial_invoice_id)
        grn_material_id = kwargs.get('supplier_po_grn_material_id', None)
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=grn_material_id)

        self.validate_data(invoice, supplier_po_grn_material)

        if self.haveErrors:
            response = Response(self.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            self.process_replacements(invoice, supplier_po_grn_material, ReplacementQuantityDeliveryDate.WIDTH_MISMATCH_REPLACEMENT_REASON)
            response = Response({'success': True})
        return response
    

class PendingCommercialInvoiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = SupplierPOActionSerializer
    queryset = SupplierPO.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        customer_id = self.request.query_params.get('customer', None)
        invoices = SupplierPODeliveryInvoice.objects.filter().exclude(ci_state__in=[SupplierPODeliveryInvoice.CLOSED_STATE, SupplierPODeliveryInvoice.CANCELED_STATE])
        supplier_po_ids = SupplierActualDeliveryDate.objects.filter(supplier_po_delivery_invoice__in=invoices).values_list('supplier_po', flat=True)
        if customer_id and customer_id != 'all':
            qs = qs.filter(id__in=supplier_po_ids, general_po_supplier__general_po__costing__order__customer_id=customer_id)
        else:
            qs = qs.filter(id__in=supplier_po_ids)
        return qs
    

class CompletedCommercialInvoiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = SupplierPOActionSerializer
    queryset = SupplierPO.objects.all().order_by('-id')
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        qs = super().get_queryset()
        customer_id = self.request.query_params.get('customer', None)
        invoices = SupplierPODeliveryInvoice.objects.filter(ci_state__in=[SupplierPODeliveryInvoice.CLOSED_STATE, SupplierPODeliveryInvoice.CANCELED_STATE])
        supplier_po_ids = SupplierActualDeliveryDate.objects.filter(supplier_po_delivery_invoice__in=invoices).values_list('supplier_po', flat=True)
        if customer_id and customer_id != 'all':
            qs = qs.filter(id__in=supplier_po_ids, general_po_supplier__general_po__costing__order__customer_id=customer_id)
        else:
            qs = qs.filter(id__in=supplier_po_ids)
        return qs