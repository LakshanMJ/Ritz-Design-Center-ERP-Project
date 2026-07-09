from abc import abstractmethod

from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from marketing.exceptions.invoice_exceptions import InvoiceMismatchException
from marketing.models import ReplacementQuantityDeliveryDate, DebitNote, DebitNoteMaterial, SupplierDeliveryDate, \
    SupplierPOGRNMaterial, SupplierPODeliveryInvoice
from shared.utils import convert_quantity_to_unit, add_error_to_dictionary, get_display_value_for_unit, \
    valid_material_unit, get_object_or_none, get_float_or_zero, get_material_unit_category, get_quantity_dictionary


class DebitNoteMixin:
    GENERAL_ERRORS_KEY = 'general_errors'
    REPLACEMENT_DATA_ERRORS = 'replacement_data_errors'
    TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY = 'total_debit_note_quantity_units'
    TOTAL_DEBIT_NOTE_QUANTITY_KEY = 'total_debit_note_quantity'

    TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY = 'total_replacement_quantity_units'
    TOTAL_REPLACEMENT_QUANTITY_KEY = 'total_replacement_quantity'

    TOTAL_CPI_QUANTITY_UNITS_KEY = 'total_cpi_quantity_units'
    TOTAL_CPI_QUANTITY_KEY = 'total_cpi_quantity'
    errors = {GENERAL_ERRORS_KEY:[], REPLACEMENT_DATA_ERRORS:{}}

    VALIDATE_UNIT_KEYS = [
        TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY,
        TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY,
        TOTAL_CPI_QUANTITY_UNITS_KEY,
    ]

    def validate_quantities(self, supplier_po_grn_material):
        pass

    def validate_replacement_date_data_quantities(self):
        replacement_dates = self.request.data.get('replacement_date_data', [])
        error_data = {}
        index = 0

        for replacement_date in replacement_dates:
            errors = {}
            delivery_date_id = replacement_date.get('delivery_date_id', None)
            confirmed_delivery_date = replacement_date.get('confirmed_delivery_date', None)
            replacement_quantity = replacement_date.get('replacement_quantity', None)
            replacement_quantity_units = replacement_date.get('replacement_quantity_units', None)

            if not confirmed_delivery_date and not delivery_date_id:
                errors["confirmed_delivery_date"] = "Select Date"
            if not replacement_quantity:
                errors["replacement_quantity"] = "Enter Quantity"
            if not replacement_quantity_units:
                errors["replacement_quantity_units"] = "Select Units"

            if errors:
                error_data[str(index)] = errors
            index += 1
            
        if error_data:
            self.add_error(self.REPLACEMENT_DATA_ERRORS, error_data)

    def currently_assigned_to_debit_note(self, debit_note, supplier_po_grn_material):
        return False

    def add_error(self, error_key, error_value):
        self.haveErrors = True
        if error_key == self.GENERAL_ERRORS_KEY:
            self.errors[self.GENERAL_ERRORS_KEY].append(error_value)
        elif error_key == self.REPLACEMENT_DATA_ERRORS:
            if self.REPLACEMENT_DATA_ERRORS not in self.errors:
                self.errors[self.REPLACEMENT_DATA_ERRORS] = {}
            self.errors[self.REPLACEMENT_DATA_ERRORS].update(error_value)
        else:
            add_error_to_dictionary(self.errors, error_key, error_value, 'string')

    def get_normalized_value(self, quantity_key, quantity_units_key, normalized_unit):
        quantity = self.request.data.get(quantity_key, None)
        quantity_units_key = self.request.data.get(quantity_units_key, None)
        normalized_replacement_quantity = convert_quantity_to_unit(normalized_unit, quantity, quantity_units_key).get('quantity')
        return normalized_replacement_quantity

    def validate_units(self, supplier_po_grn_material):
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_unit_catergory = get_material_unit_category(normalized_unit)
        errors = {
            self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY: 'Invalid Total Replacement Quantity Units',
            self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY: 'Invalid Total Replacement Quantity Units',
            self.TOTAL_CPI_QUANTITY_UNITS_KEY: 'Invalid CPI Quantity Units',
        }

        unit_value_mappings = {
            self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY: self.TOTAL_DEBIT_NOTE_QUANTITY_KEY,
            self.TOTAL_CPI_QUANTITY_UNITS_KEY: self.TOTAL_CPI_QUANTITY_KEY,
            self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY: self.TOTAL_REPLACEMENT_QUANTITY_KEY,
        }
        # debit_note_quantity_units = self.request.POST.get(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, None)
        # total_replacement_quantity_units = self.request.POST.get(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, None)
        # total_cpi_quantity_units = self.request.POST.get(self.TOTAL_CPI_QUANTITY_UNITS_KEY, None)

        for unit in self.VALIDATE_UNIT_KEYS:
            quantity_key = unit_value_mappings.get(unit, None)
            quantity_value = get_float_or_zero(self.request.data.get(quantity_key, 0))
            if not valid_material_unit(normalized_unit, normalized_unit_catergory) and quantity_value > 0:
                error = errors.get(unit, 'N/A')
                self.add_error(unit, error)

    def check_debit_note_status(self, invoice, supplier_po_grn_material):
        total_debit_note_quantity = 0
        debit_note = invoice.get_active_debit_note()

        debit_note_quantity = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_KEY, 0)
        cpi_debit_note_quantity = self.request.data.get(self.TOTAL_CPI_QUANTITY_KEY, 0)
        if debit_note_quantity and cpi_debit_note_quantity: 
            total_debit_note_quantity = debit_note_quantity + cpi_debit_note_quantity
        currently_assigned_to_debit_note = self.currently_assigned_to_debit_note(debit_note, supplier_po_grn_material)
        # TODO - check if there is also if there is an existing debit note

        if total_debit_note_quantity > 0 and debit_note.debit_note_editable:
            self.add_error(self.GENERAL_ERRORS_KEY, 'There is an existing debit note. You will have to cancel it before you can perform this action.')

    def validate_data(self, invoice, supplier_po_grn_material):
        self.validate_units(supplier_po_grn_material)
        self.check_debit_note_status(invoice, supplier_po_grn_material)

        if not self.haveErrors:
            self.validate_quantities(supplier_po_grn_material)
            self.validate_replacement_date_data_quantities()

        if invoice != supplier_po_grn_material.supplier_po_grn.get_invoice():
            self.add_error(self.GENERAL_ERRORS_KEY, 'Provided Invoice and Supplier PO GRN Material did not match')

        # TODO - handle validation when something has a color tone rejection and a defected batch - it should considered with the defected rolls
        
    def process_delete_replacements(self, supplier_po_grn_material, is_replacement, replacement_delivery_deleted_ids, reason):
        if not is_replacement:
            ReplacementQuantityDeliveryDate.objects.filter(
                reason=reason,
                supplier_po_grn_material=supplier_po_grn_material
            ).delete()
        if replacement_delivery_deleted_ids:
            ReplacementQuantityDeliveryDate.objects.filter(id__in=replacement_delivery_deleted_ids).delete()

    def process_replacements(self, invoice, supplier_po_grn_material, reason):
        raise_types = self.request.data.get('raise_types', {})
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        total_replacement_quantity = self.request.data.get(self.TOTAL_REPLACEMENT_QUANTITY_KEY, 0)
        total_replacement_quantity_units = self.request.data.get(self.TOTAL_REPLACEMENT_QUANTITY_UNITS_KEY, None)
        normalized_total_replacement_quantity = convert_quantity_to_unit(normalized_unit, total_replacement_quantity, total_replacement_quantity_units).get('quantity')
        replacement_delivery_deleted_ids = self.request.data.get('replacement_delivery_deleted_ids', None)

        #supplier_po_grn_material.total_replacement_quantity = normalized_total_replacement_quantity
        #supplier_po_grn_material.total_replacement_quantity_units = normalized_unit
        #supplier_po_grn_material.save()
        if raise_types['is_replacement'] and total_replacement_quantity > 0:
            replacement_dates = self.request.data.get('replacement_date_data', [])
            valid_ids = []
            for replacement_date_data in replacement_dates:
                delivery_date_id = replacement_date_data.get('delivery_date_id', None)
                confirmed_delivery_date = replacement_date_data.get('confirmed_delivery_date', None)
                replacement_quantity = replacement_date_data.get('replacement_quantity', None)
                replacement_quantity_units = replacement_date_data.get('replacement_quantity_units', None)
                normalized_replacement_quantity = convert_quantity_to_unit(normalized_unit, replacement_quantity, replacement_quantity_units).get('quantity', 0)

                if normalized_replacement_quantity > 0:
                    if delivery_date_id:
                        del_date = SupplierDeliveryDate.objects.get(pk=delivery_date_id)
                    else:
                        #supplier_po = invoice.get_supplier_po()
                        del_date, created = SupplierDeliveryDate.objects.get_or_create(
                            general_po_supplier=supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier,
                            confirmed_delivery_date=confirmed_delivery_date
                        )

                    delivery = ReplacementQuantityDeliveryDate.objects.get_or_create(
                        reason=reason,
                        supplier_po_grn_material=supplier_po_grn_material,
                        replacement_expected_delivery_date=del_date
                    )[0]
                    delivery.quantity = normalized_replacement_quantity
                    delivery.quantity_units = normalized_unit
                    delivery.save()
                    valid_ids.append(delivery.pk)
        self.process_delete_replacements(supplier_po_grn_material, raise_types['is_replacement'], replacement_delivery_deleted_ids, reason)

    def create_debit_note(self, invoice, supplier_po_grn_material, quantity, quantity_units, reason):
        debit_note = invoice.get_active_debit_note()
        normalized_unit = supplier_po_grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        normalized_debit_note_quantity = convert_quantity_to_unit(normalized_unit, quantity, quantity_units).get('quantity')
        if normalized_debit_note_quantity > 0:
            if not debit_note:
                debit_note = DebitNote.objects.create(
                    commercial_invoice=invoice
                )

            debit_note_material = DebitNoteMaterial.objects.get_or_create(
                debit_note=debit_note,
                supplier_po_grn_material=supplier_po_grn_material,
                reason=reason
            )[0]
            debit_note_material.total_quantity = normalized_debit_note_quantity
            debit_note_material.total_quantity_units = normalized_unit
            debit_note_material.unit_price = supplier_po_grn_material.grn_price
            debit_note_material.total_price = supplier_po_grn_material.get_price_from_quantity(normalized_debit_note_quantity)
            debit_note_material.save()
        else:
            debit_note_material = get_object_or_none(
                DebitNoteMaterial,
                {
                    'debit_note': debit_note,
                    'supplier_po_grn_material':  supplier_po_grn_material,
                    'reason': reason
                }
            )
            if debit_note_material:
                debit_note_material.delete()

    def process_debit_note(self, invoice, supplier_po_grn_material, reason):
        debit_note_quantity = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_KEY, None)
        debit_note_quantity_units = self.request.data.get(self.TOTAL_DEBIT_NOTE_QUANTITY_UNITS_KEY, None)
        self.create_debit_note(invoice, supplier_po_grn_material, debit_note_quantity, debit_note_quantity_units, reason)

    def process_cpi_debit_note(self, invoice, supplier_po_grn_material, reason):
        cpi_quantity = self.request.data.get(self.TOTAL_CPI_QUANTITY_KEY, None)
        cpi_quantity_units = self.request.data.get(self.TOTAL_CPI_QUANTITY_UNITS_KEY, None)
        self.create_debit_note(invoice, supplier_po_grn_material, cpi_quantity, cpi_quantity_units, reason)


class RemediationDetailMixin:

    @abstractmethod
    def get_replacement_grn_materials(self, supplier_po_grn_material):
        ...

    def get_raise_types(self, grn_material, debit_note_reason, repleacement_reason=None):
        data = {
            'is_debit_note': False,
            'is_replacement': False,
            'is_cpi': False
        }
        active_debit_note_material = grn_material.get_active_debit_note_supplier_po_grn_material(debit_note_reason)
        is_replacements_created = grn_material.is_replacements_created(repleacement_reason)
        if debit_note_reason == DebitNoteMaterial.REJECTED_DEFECT_DEBIT_NOTE_REASON:
            cpi_active_debit_note_material = grn_material.get_active_debit_note_supplier_po_grn_material(DebitNoteMaterial.REJECTED_DEFECT_CPI_REASON)
            if cpi_active_debit_note_material:
                data['is_cpi'] = True

        if active_debit_note_material:
            data['is_debit_note'] = True
        if is_replacements_created:
            data['is_replacement'] = True
        
        return data

    def get_replacement_details(self, supplier_po_grn_material, reason):
        delivery_dates = supplier_po_grn_material.get_replacement_delivery_details(reason)
        data = []
        for delivery_date in delivery_dates:
            data.append(
                {
                    'replacement_delivery_date_id': delivery_date.id,
                    'replacement_quantity': delivery_date.quantity,
                    'replacement_quantity_units': delivery_date.quantity_units,
                    'delivery_date_id': delivery_date.replacement_expected_delivery_date.id,
                    'confirmed_delivery_date': delivery_date.replacement_expected_delivery_date.confirmed_delivery_date
                }
            )
        return data

    def get_field_quantity_info_or_none(self, db_object, quantity_field, quantity_units_field):
        data = None
        if db_object:
            quantity = getattr(db_object, quantity_field, None)
            quantity_units = getattr(db_object, quantity_units_field, None)
            data = get_quantity_dictionary(quantity, quantity_units)
        return data

    def validate_supplier_po_grn_material_commercial_invoice(self, supplier_po_grn_material, commercial_invoice):
        if supplier_po_grn_material.supplier_po_grn.get_invoice() != commercial_invoice:
            raise InvoiceMismatchException("The provided invoice did not match the data provided")

    def get(self, request, *args, **kwargs):
        commercial_invoice_id = kwargs.get('commercial_invoice_id', None)
        commercial_invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=commercial_invoice_id)
        supplier_po_grn_material = get_object_or_404(SupplierPOGRNMaterial, pk=kwargs.get('supplier_po_grn_material_id', None))
        self.validate_supplier_po_grn_material_commercial_invoice(supplier_po_grn_material, commercial_invoice)
        grn_material_quantity_details = self.get_replacement_grn_materials(supplier_po_grn_material)

        return Response(grn_material_quantity_details, status=status.HTTP_200_OK)
