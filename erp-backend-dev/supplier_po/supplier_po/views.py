from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from marketing.models import ActualPOClub, PurchaseOrderBom, PurchaseOrder
from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper
from materials.models import SupplierCustomerBrandMaterial, Material, CustomerBrandMaterial
from materials.scripts.supplier_po_bom_generator import NewGenerateSupplierPOs
from shared.permissions.roles import MERCHANT_ROLE, STORES_USER_ROLE
from shared.permissions.view_permissions import HasPermission
from shared.utils import get_object_or_none, calculate_queryset_total_normalized_quantity
from supplier_po.helpers.summary_calculator_helper import POClubDeliverySummary, DeliveryDateSummary
from supplier_po.models import SupplierPO, SupplierDeliveryDateQuantity, SupplierDeliveryDate, \
    SupplierPODeliveryInvoice, SupplierActualDeliveryDate, SupplierPOInvoiceDeliveryNote, SupplierPOGRN, \
    SupplierPODeliveryInvoicePackList, GeneralPOSupplier, SupplierDeliveryDateQuantityPOAllocation, \
    GeneralPOMaterialQuantity, GeneralPOSupplierMaterialPrice, GeneralPO, SupplierPOGRNMaterialDetail, \
    SupplierPOGRNMaterial, FabricGRNBatchNumber, SupplierPOFabricColorTone, SupplierPOFabricShade
from supplier_po.supplier_po.serializers import SupplierPOSerializer, SupplierPODetailSerializer, \
    SupplierPODeliveryInvoiceSerializer, SupplierPODeliveryDateSerializer, SupplierPOBasicListSerializer, \
    SupplierPODeliveryDateMaterialSerializer, SupplierPODetailsSerializer, SupplierPODeliveryInvoiceListSerializer, SupplierPODeliveryInvoiceBasicSerializer, \
    SupplierPOUpdateSerializer, SupplierPOMainSerializer, SupplierPODetailMainSerializer
from shared.models import Supplier, InHouseMaterial
from materials.models import FabricColorTone
from marketing.serializers import SupplierPOFabricShadeSerializer
from shared.helpers.general_results_set_pagination import GeneralLargeResultsSetPagination

class SupplierPODetailView(generics.ListAPIView):
    serializer_class = SupplierPOSerializer
    queryset = SupplierPO.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (MERCHANT_ROLE, )

    def get_queryset(self):
        id = self.kwargs.get('id', None)
        is_po_club = self.request.GET.get('is_po_club')
        if is_po_club == 'true':
            actual_club = get_object_or_404(ActualPOClub, pk=id)
            general_po_suppliers = GeneralPOSupplier.objects.filter(general_po__po_club=actual_club)
        else:
            general_po = get_object_or_404(GeneralPO, pk=id)
            general_po_suppliers = GeneralPOSupplier.objects.filter(general_po=general_po)
        qs = SupplierPO.objects.filter(general_po_supplier__in=general_po_suppliers)
        return qs


class SupplierPODeliveries(APIView):
    # DS Reviewed 7/27
    permission_classes = (HasPermission, )

    def get(self, request, *args, **kwargs):
        id = kwargs.get('id', None)
        is_po_club = self.request.GET.get('is_po_club')
        if is_po_club == 'true':
            actual_club = get_object_or_404(ActualPOClub, pk=id)
            general_po_suppliers = GeneralPOSupplier.objects.filter(general_po__po_club=actual_club)
        else:
            general_po = get_object_or_404(GeneralPO, pk=id)
            general_po_suppliers = GeneralPOSupplier.objects.filter(general_po=general_po)
        supplier_pos = SupplierPO.objects.filter(general_po_supplier__in=general_po_suppliers).order_by('id')
        data = SupplierPODetailSerializer(supplier_pos, many=True).data
        return Response(data)
    

class SupplierPOLeftOverDetailView(APIView):
    # DS Reviewed 7/27
    permission_classes = (HasPermission, )

    def get(self, request, *args, **kwargs):
        from supplier_po.supplier_po.serializers import SupplierPOLeftOverMaterialSerializer
        id = kwargs.get('id', None)
        is_po_club = self.request.GET.get('is_po_club')
        if is_po_club == 'true':
            actual_club = get_object_or_404(ActualPOClub, pk=id)
            general_po_suppliers = GeneralPOSupplier.objects.filter(general_po__po_club=actual_club)
        else:
            general_po = get_object_or_404(GeneralPO, pk=id)
            general_po_suppliers = GeneralPOSupplier.objects.filter(general_po=general_po)
        supplier_po_ids = InHouseMaterial.objects.filter(grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po__general_po_supplier__in=general_po_suppliers, 
                                             state=InHouseMaterial.LEFT_OVER_STATUS).values_list('grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_po', flat=True).distinct()
        pos = SupplierPO.objects.filter(id__in=supplier_po_ids)
        data = SupplierPOLeftOverMaterialSerializer(pos, many=True).data
        return Response(data)
    

class SupplierDeliveryDateFOCDetailView(APIView):
    permission_classes = (HasPermission, )

    def get(self, request, *args, **kwargs):
        from supplier_po.supplier_po.serializers import SupplierCustomerBrandMaterialSerializer
        delivery_date_id = kwargs.get('delivery_date_id', None)
        supplier_delivery_date = get_object_or_404(SupplierDeliveryDate, pk=delivery_date_id)

        replacement_materials = supplier_delivery_date.get_replacement_materials()
        material_ids = replacement_materials.filter().values_list('supplier_po_grn_material__grn_material', flat=True).distinct()
        materials = SupplierCustomerBrandMaterial.objects.filter(id__in=material_ids)

        data = []
        for material in materials:
            quantity = supplier_delivery_date.get_delivery_date_replacement_quantity(material)
            data.append({
                **SupplierCustomerBrandMaterialSerializer(material).data,
                'quantity': quantity
            })

        return Response(data)


class InvoiceBySupplierPOListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    serializer_class = SupplierPODeliveryInvoiceSerializer
    queryset = SupplierPODeliveryInvoice.objects.all().order_by('id')
    pagination_class = GeneralLargeResultsSetPagination

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po= get_object_or_404(SupplierPO, pk=supplier_po_id)

        invoices = supplier_po.get_invoices()
        context = {'supplier_po': supplier_po}
        data = SupplierPODeliveryInvoiceSerializer(invoices, context=context, many=True).data
        return Response(data)
    

class InvoiceListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    serializer_class = SupplierPODeliveryInvoiceSerializer
    queryset = SupplierPODeliveryInvoice.objects.all().order_by('id')
    pagination_class = GeneralLargeResultsSetPagination

    def get_queryset(self):
        supplier_po = get_object_or_404(SupplierPO, pk=self.kwargs['supplier_po_id'])
        supplier_po_delivery_invoice_ids = SupplierActualDeliveryDate.objects.filter(
            supplier_po__general_po_supplier__supplier=supplier_po.general_po_supplier.supplier,
            supplier_po=supplier_po
        ).values_list('supplier_po_delivery_invoice', flat=True)
        qs = super().get_queryset().filter(id__in=supplier_po_delivery_invoice_ids)
        return qs


class DeliveryinvoiceDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    serializer_class = SupplierPODeliveryDateSerializer
    queryset = SupplierDeliveryDate.objects.all().order_by('id')


class SupplierPODeliverySaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def validate_data(self, supplierpoinvoicedeliverynote_set):
        errors = {}
        delivery_index = 0
        if not supplierpoinvoicedeliverynote_set:
            errors = {'delivery_note_error': 'Please add delivery note data.'}
        else:
            for delivery_note_data in supplierpoinvoicedeliverynote_set:
                delivery_note_file_attachment_data = delivery_note_data.get('delivery_note')
                delivery_note_supplier_display_number = delivery_note_data.get('supplier_display_number')
                pack_list = delivery_note_data.get('pack_list', [])

                delivery_errors = {}

                if not delivery_note_file_attachment_data:
                    delivery_errors['delivery_note_attachment_error'] = 'Delivery note attachment missing.'
                if not delivery_note_supplier_display_number:
                    delivery_errors['delivery_note_number_error'] = 'Delivery note number missing.'

                pack_list_errors = {}
                pack_list_index = 0
                for pack in pack_list:
                    pack_list_file_attachment_data = pack.get('pack_list')
                    supplier_display_number = pack.get('supplier_display_number')

                    pack_errors = {}
                    if not pack_list_file_attachment_data:
                        pack_errors['pack_list_attachment_error'] = 'Pack list attachment missing.'
                    if not supplier_display_number:
                        pack_errors['pack_list_number_error'] = 'Pack list number missing.'

                    if pack_errors:
                        pack_list_errors[pack_list_index] = pack_errors

                    pack_list_index += 1

                if pack_list_errors:
                    delivery_errors['pack_list_errors'] = pack_list_errors

                if delivery_errors:
                    errors[delivery_index] = delivery_errors
                delivery_index += 1
        return errors

    def delete_delivery_note(self, deleted_delivery_note_ids):
        errors = []
        for delivery_id in deleted_delivery_note_ids:
            dnote = SupplierPOInvoiceDeliveryNote.objects.get(pk=delivery_id)
            pack_list = dnote.supplierpodeliveryinvoicepacklist_set.all()
            is_exist = SupplierPOGRN.objects.filter(supplier_pack_list__in=pack_list).exists()
            if is_exist:
                errors.append({
                    'delivery_note_id': dnote.id,
                    'msg': '%s %s' % (dnote.display_number, 'has grn data. Cannot be deleted')
                })
            else:
                dnote.delete()
        return errors

    def update_pack_list(self, supplier_po_delivery_invoice, supplierpoinvoicedeliverynote_set):
        errors = self.validate_data(supplierpoinvoicedeliverynote_set)
        if not errors:
            for delivery_note_data in supplierpoinvoicedeliverynote_set:
                delivery_note_id = delivery_note_data['id']
                delivery_note_file_attachment_data = delivery_note_data['delivery_note']

                if delivery_note_id:
                    delivery_note = SupplierPOInvoiceDeliveryNote.objects.get(pk=delivery_note_id)
                else:
                    delivery_note = SupplierPOInvoiceDeliveryNote.objects.create(
                        supplier_po_delivery_invoice=supplier_po_delivery_invoice,
                    )
                delivery_note.delivery_note_id = delivery_note_file_attachment_data['id']
                delivery_note.supplier_display_number = delivery_note_data['supplier_display_number']
                delivery_note.save()

                pack_list = delivery_note_data['pack_list']
                for pack in pack_list:
                    pack_list_id = pack['id']
                    pack_list_file_attachment_data = pack['pack_list']
                    if pack_list_id:
                        pack_obj = SupplierPODeliveryInvoicePackList.objects.get(pk=pack_list_id)
                    else:
                        pack_obj = SupplierPODeliveryInvoicePackList.objects.create(
                            supplier_po_delivery_note=delivery_note
                        )
                    pack_obj.pack_list_id = pack_list_file_attachment_data['id']
                    pack_obj.supplier_display_number = pack['supplier_display_number']
                    pack_obj.save()
        return errors

    def post(self, request, *args, **kwargs):
        errors = None
        delivery_date_id = kwargs.get('delivery_date_id', None)
        supplier_delivery_date = get_object_or_404(SupplierDeliveryDate, pk=delivery_date_id)
        supplier_po = supplier_delivery_date.general_po_supplier.supplier_po

        actual_delivery_date_data = request.data.get('actual_delivery_date', {})
        supplier_po_delivery_invoice_data = request.data.get('supplier_po_delivery_invoice',
                                                             {})  # actual_delivery_date_data['supplier_po_delivery_invoice']
        proforma_invoice_file_attachment_data = request.data.get('performa_invoice', {})
        supplier_display_number = request.data.get('supplier_display_number', None)
        deleted_delivery_note_ids = request.data.get('deleted_delivery_note_ids', [])
        payment_due_date = request.data.get('payment_due_date', None)
        advance_payment_due_date = request.data.get('advance_payment_due_date', None)
        advance_payment = request.data.get('advance_payment', None)

        supplier_po.advance_payment_due_date = advance_payment_due_date
        supplier_po.advance_payment = advance_payment
        supplier_po.save()

        if proforma_invoice_file_attachment_data:
            supplier_po.proforma_invoice_id = proforma_invoice_file_attachment_data['id']
            supplier_po.save()
        
        if supplier_display_number:
            supplier_po.proforma_invoice_supplier_display_number = supplier_display_number
            supplier_po.save()

        if supplier_po_delivery_invoice_data:
            id = supplier_po_delivery_invoice_data['id']
            invoice_file_attachment_data = supplier_po_delivery_invoice_data['invoice']

            if id:
                supplier_po_delivery_invoice = get_object_or_404(SupplierPODeliveryInvoice, pk=id)
            else:
                if supplier_delivery_date.actual_delivery_date:
                    is_exist = supplier_delivery_date.actual_delivery_date.supplier_po_delivery_invoice.get_all_invoice_grns().exists()
                    if is_exist:
                        return Response({'errors': {'common_errors': "Invoice already created. Add a new Delivery Note or Pack List and start the GRN"}}, status=status.HTTP_403_FORBIDDEN)
                else:
                    supplier_po_delivery_invoice = SupplierPODeliveryInvoice.objects.create(
                        supplier_invoice_number=supplier_po_delivery_invoice_data['supplier_invoice_number']
                    )

            if invoice_file_attachment_data:
                supplier_po_delivery_invoice.invoice_id = invoice_file_attachment_data['id']
                supplier_po_delivery_invoice.save()

            if actual_delivery_date_data:
                actual_delivery_date = SupplierActualDeliveryDate.objects.get(pk=actual_delivery_date_data['id'])
            else:
                actual_delivery_date, created = SupplierActualDeliveryDate.objects.get_or_create(
                    supplier_po=supplier_delivery_date.general_po_supplier.supplier_po,
                    supplier_po_delivery_invoice=supplier_po_delivery_invoice
                )
            supplier_po_delivery_invoice.payment_due_date = payment_due_date
            supplier_po_delivery_invoice.save()
            actual_delivery_date.supplier_po_delivery_invoice = supplier_po_delivery_invoice
            actual_delivery_date.save()
            supplier_delivery_date.actual_delivery_date = actual_delivery_date
            supplier_delivery_date.save()

            supplierpoinvoicedeliverynote_set = supplier_po_delivery_invoice_data['supplierpoinvoicedeliverynote_set']
            errors = self.update_pack_list(supplier_po_delivery_invoice, supplierpoinvoicedeliverynote_set)
        else:
            errors = {'invoice_error': 'Please add invoice data.'}

        if deleted_delivery_note_ids:
            errors = self.delete_delivery_note(deleted_delivery_note_ids)

        if errors:
            http_response = Response({'errors': errors, 'status': False}, status=status.HTTP_400_BAD_REQUEST)
        else:
            http_response = Response({'status': True})
        return http_response
    

class SupplierPODeliveryNoteDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def post(self, request, *args, **kwargs):
        delivery_note_id = kwargs.get('delivery_note_id', None)
        dnote = get_object_or_404(SupplierPOInvoiceDeliveryNote, pk=delivery_note_id)
        pack_list = dnote.supplierpodeliveryinvoicepacklist_set.all()
        is_exist = SupplierPOGRN.objects.filter(supplier_pack_list__in=pack_list).exists()
        if is_exist:
            http_response = Response({'delivery_note_error': 'Delivery Note has grn data. Cannot be deleted'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            dnote.supplierpodeliveryinvoicepacklist_set.all().delete()
            dnote.delete()
            http_response = Response({'success': True})
        return http_response
    

class SupplierPOPackListDeleteView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def post(self, request, *args, **kwargs):
        pack_list_id = kwargs.get('pack_list_id', None)
        pack_list = get_object_or_404(SupplierPODeliveryInvoicePackList, pk=pack_list_id)
        is_exist = SupplierPOGRN.objects.filter(supplier_pack_list=pack_list).exists()
        if is_exist:
            http_response = Response({'pack_list_error': 'Pack List has grn data. Cannot be deleted'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            pack_list.delete()
            http_response = Response({'success': True})
        return http_response



class ClubDeliverySummaryBreakdown(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po = get_object_or_404(SupplierPO, id=supplier_po_id)
        po_club = supplier_po.po_club
        data = POClubDeliverySummary(po_club, supplier_po).get_actual_delivery_date_summarized_data()
        return Response(data)


class MaterialQuantitySummaryByDeliveryDateDetailView(APIView):
    permission_classes = (HasPermission,)

    def get(self, request, supplier_po):
        supplier_po = get_object_or_404(SupplierPO, pk=supplier_po)
        deliveries = supplier_po.get_all_delivery_dates()
        data = []

        for delivery in deliveries:
            delivery_data = {
                'id': delivery.id,
                'delivery_display': delivery.display_number,
                'confirmed_delivery_date': delivery.confirmed_delivery_date,
                'actual_delivery_date': delivery.actual_delivery_date.delivery_date if delivery.actual_delivery_date else None,
                # 'materials': DeliveryDateSummary(delivery, supplier_po).get_delivery_date_summarized_data()
                'materials': DeliveryDateSummary(delivery).get_delivery_date_summarized_data()
            }
            data.append(delivery_data)
        return Response(data)


class SupplierPODeliveryDateMaterialDetailView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    serializer_class = SupplierPOBasicListSerializer
    queryset = SupplierPO.objects.all().order_by('-id')


class SupplierPOMaterialListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, pk):
        supplier_po = SupplierPO.objects.get(pk=pk)
        #supplier_delivery_date = request.data.get('supplier_delivery_date', None)
        #supplier_invoice = request.data.get('supplier_invoice', None)
        serializer = SupplierPODeliveryDateMaterialSerializer(supplier_po, many=False).data
        return Response(serializer)


class SupplierPOListView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPOMainSerializer
    queryset = SupplierPO.objects.all().order_by('-id')

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        pagination = GeneralLargeResultsSetPagination()
        paginated_data = pagination.paginate_queryset(serializer.data, request, view=self)
        if paginated_data is not None:
            return pagination.get_paginated_response(paginated_data)

        return Response(serializer.data)


class SupplierPOUpdateView(generics.UpdateAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = SupplierPOUpdateSerializer
    queryset = SupplierPO.objects.all()
    lookup_field = 'pk'


class SupplierPODetailMainView(generics.RetrieveAPIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    serializer_class = SupplierPODetailMainSerializer
    queryset = SupplierPO.objects.all()
    lookup_field = 'pk'


class DeliveryDateDetailView(generics.ListAPIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]
    serializer_class = SupplierPODeliveryDateSerializer
    queryset = SupplierDeliveryDate.objects.all().order_by('id')

    def get_queryset(self):
        supplier_po = get_object_or_404(SupplierPO, pk=self.kwargs['supplier_po'])
        qs = supplier_po.supplier_po_delivery_dates
        return qs


class DeliveryDateMaterialByPOListView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def get(self, request, delivery_date_id):
        response = {
            'purchase_orders': [],
            'quantities': []
        }
        delivery_date = get_object_or_404(SupplierDeliveryDate, pk=delivery_date_id)

        quantities = DeliveryDateSummary(delivery_date).get_delivery_date_summarized_data()
        response['quantities'] = quantities

        po_club = delivery_date.general_po_supplier.general_po.po_club
        if po_club:
            purchase_orders = po_club.get_purchase_orders().order_by('id')
            for purchase_order in purchase_orders:
                response['purchase_orders'].append(
                    {
                        'id': purchase_order.id,
                        'name': purchase_order.name,
                        'display_number': purchase_order.display_number,
                        'ritz_code': purchase_order.ritz_code
                    }
                )
        return Response(response)


class SupplierPOAddSupplierCreateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def post(self, request, *args, **kwargs):
        response = {}
        general_po_material_quantity_id = self.kwargs.get('general_po_material_quantity_id')
        general_po_material_quantity = get_object_or_404(GeneralPOMaterialQuantity, pk=general_po_material_quantity_id)
        supplier_id = self.kwargs.get('general_po_material_quantity_id')
        supplier = get_object_or_404(Supplier, pk=general_po_material_quantity_id)
        material = general_po_material_quantity.default_material_supplier.supplier_material.customer_brand_material

        return Response(response)


class InspectionSummaryListView(APIView):
    permission_classes = (HasPermission,)

    def get_supplier_po_grns(self):
        supplier_po_grns = []
        supplier_po_id = self.kwargs.get('supplier_po_id', None)
        supplier_delivery_date_id = self.kwargs.get('supplier_delivery_date_id', None)
        supplier_pack_list_id = self.kwargs.get('supplier_pack_list_id', None)
        supplier_delivery_note_id = self.kwargs.get('supplier_delivery_note_id', None)
        supplier_invoice_id = self.kwargs.get('supplier_invoice_id', None)

        if supplier_po_id:
            supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)
            supplier_po_grns = supplier_po.get_grns()

        if supplier_delivery_date_id:
            supplier_delivery_date = get_object_or_404(SupplierDeliveryDate, pk=supplier_delivery_date_id)
            supplier_po_grns = supplier_delivery_date.get_delivery_date_grns()

        if supplier_pack_list_id:
            supplier_po_grns = SupplierPOGRN.objects.filter(supplier_pack_list=supplier_pack_list_id)

        if supplier_delivery_note_id:
            supplier_po_grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note=supplier_delivery_note_id)

        if supplier_invoice_id:
            supplier_po_grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice=supplier_invoice_id)

        return supplier_po_grns

    def get_roll_to_roll_shading_rolls(self, batch, attempt):
        roll_to_roll_shading_rolls = SupplierPOGRNMaterialDetail.objects.filter(
            batch_number=batch, inspection_attempt=attempt,
            shade_category=SupplierPOGRNMaterialDetail.SHADE_CATEGORY_ROLL_TO_ROLL_SHADING,
        ).exclude(inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)
        return roll_to_roll_shading_rolls

    def get_within_the_roll_shading_rolls(self, batch, attempt):
        within_the_roll_shading_rolls = SupplierPOGRNMaterialDetail.objects.filter(
            batch_number=batch, inspection_attempt=attempt,
            shade_category=SupplierPOGRNMaterialDetail.SHADE_CATEGORY_WITHIN_THE_ROLL_SHADING
        ).exclude(inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)
        return within_the_roll_shading_rolls

    def get_final_summary(self, batch):
        data = {}
        normalized_unit = batch.grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        material_details = SupplierPOGRNMaterialDetail.objects.filter(batch_number=batch).exclude(inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)
        total_inspection_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_unit, 'actual_quantity', 'actual_quantity_units')

        data = {
            'name': 'Final',
            'total_inspection_quantity': total_inspection_quantity,
            'total_inspection_quantity_units': MaterialUnitHelper.METERS_UNIT_DISPLAY,
            'qa_status': batch.inspection_status,
            'avg_defect_rate_per_100_square_yards': batch.avg_defect_rate_per_100_square_yards
        }
        return data

    def get_failed_rolls(self, batch):
        material_details = SupplierPOGRNMaterialDetail.objects.filter(batch_number=batch, qa_inspection_passed=False)
        return material_details

    def get_average_value_point(self, batch):
        total_length_value_with_average = 0
        total_average_value = 0
        normalized_unit = batch.grn_material.grn_material.customer_brand_material.material_normalized_measuring_unit
        material_details = SupplierPOGRNMaterialDetail.objects.filter(batch_number=batch).exclude(inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)

        total_length = calculate_queryset_total_normalized_quantity(material_details, normalized_unit, 'actual_quantity', 'actual_quantity_units')
        for material in material_details:
            quantity = material.actual_quantity
            average_value = material.defect_rate_per_100_square_yards
            total_length_value_with_average += (quantity * average_value)
            total_length += quantity
        total_average_value = total_length_value_with_average / total_length
        return round(total_average_value, 4)

    def get(self, request, *args, **kwargs):
        data = []
        supplier_po_grns = self.get_supplier_po_grns()

        for supplier_po_grn in supplier_po_grns:
            material_ids = SupplierPOGRNMaterial.objects.filter(
                supplier_po_grn=supplier_po_grn,
                grn_material__customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL
            ).values_list('grn_material', flat=True)
            materials = SupplierCustomerBrandMaterial.objects.filter(id__in=material_ids).order_by('id')
            grn_details = {
                'grn_id': supplier_po_grn.id,
                'grn_name': supplier_po_grn.grn_number,
                'materials': []
            }

            for material in materials:
                grn_materials = supplier_po_grn.supplierpogrnmaterial_set.all().filter(grn_material=material)
                batches = FabricGRNBatchNumber.objects.filter(grn_material__in=grn_materials).order_by('batch_number')

                material_details = {
                    'material_id': material.id,
                    'name': material.customer_brand_material.verbose_reference_code,
                    'batches': []
                }

                for batch in batches:
                    batch_details = {
                        'batch_id': batch.id,
                        'batch_number': batch.batch_number,
                        'summary': []
                    }

                    from django.db.models import Count
                    queryset = SupplierPOGRNMaterialDetail.objects.filter(
                        batch_number=batch).exclude(
                        inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED
                    ).values('inspection_attempt').annotate(ids=Count('id')).order_by('inspection_attempt')
                    summary = []

                    for attempt in queryset:
                        name = '%s %s' % ('Sample', attempt['inspection_attempt'])
                        details_query = SupplierPOGRNMaterialDetail.objects.filter(batch_number=batch,
                                                                                   inspection_attempt=attempt[
                                                                                       'inspection_attempt'])
                        roll_to_roll_shading_rolls = self.get_roll_to_roll_shading_rolls(batch,
                                                                                         attempt['inspection_attempt'])
                        within_the_roll_shading_rolls = self.get_within_the_roll_shading_rolls(batch, attempt[
                            'inspection_attempt'])
                        failed_rolls = self.get_failed_rolls(batch)
                        average_point_value = self.get_average_value_point(batch)
                        ids = [item.fabricgrndetail.pack_number for item in details_query]
                        summary_item = {
                            'name': name,
                            'pack_numbers': ids,
                            'average_point_value': average_point_value,
                            'Remarks': 'Test',
                            'roll_to_roll_shading_rolls': [],
                            'within_the_roll_shading_rolls': [],
                            'failed_rolls': []
                        }

                        for roll in failed_rolls:
                            summary_item['failed_rolls'].append(roll.fabricgrndetail.pack_number)

                        for roll_to_roll_shading_roll in roll_to_roll_shading_rolls:
                            summary_item['roll_to_roll_shading_rolls'].append(
                                roll_to_roll_shading_roll.fabricgrndetail.pack_number)

                        for within_the_roll_shading_roll in within_the_roll_shading_rolls:
                            summary_item['within_the_roll_shading_rolls'].append(
                                within_the_roll_shading_roll.fabricgrndetail.pack_number)

                        summary.append(summary_item)
                    final_summary = self.get_final_summary(batch)
                    summary.append(final_summary)
                    batch_details['summary'] = summary
                    material_details['batches'].append(batch_details)
                grn_details['materials'].append(material_details)
            data.append(grn_details)
        return Response(data)


class ShadeSummaryListView(APIView):
    permission_classes = (HasPermission,)
    _filters = {
        'supplier_po_grn': 'supplier_po_grn_material__supplier_po_grn',
        'supplier_po_grn_materials': 'supplier_po_grn_material',
        'batch_number': 'batch_number',
        'shade': 'shade',
        'shade_group': 'shade__supplier_po_shade'
    }

    def get_distinct_queryset(self, queryset, distinct_path):
        distinct_queryset = queryset.distinct(distinct_path)
        return_distinct_queryset = []
        attributes = distinct_path.split('__')
        for element in distinct_queryset:
            for attribute in attributes:
                element = element.__getattribute__(attribute)
            return_distinct_queryset.append(element)
        return return_distinct_queryset

    def get_supplier_po_grns(self):
        supplier_po_grns = []
        supplier_po_id = self.kwargs.get('supplier_po_id', None)
        supplier_delivery_date_id = self.kwargs.get('supplier_delivery_date_id', None)
        supplier_pack_list_id = self.kwargs.get('supplier_pack_list_id', None)
        supplier_delivery_note_id = self.kwargs.get('supplier_delivery_note_id', None)
        supplier_invoice_id = self.kwargs.get('supplier_invoice_id', None)

        if supplier_po_id:
            supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)
            supplier_po_grns = supplier_po.get_grns()

        if supplier_delivery_date_id:
            supplier_delivery_date = get_object_or_404(SupplierDeliveryDate, pk=supplier_delivery_date_id)
            supplier_po_grns = supplier_delivery_date.get_delivery_date_grns()

        if supplier_pack_list_id:
            supplier_po_grns = SupplierPOGRN.objects.filter(supplier_pack_list=supplier_pack_list_id)

        if supplier_delivery_note_id:
            supplier_po_grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note=supplier_delivery_note_id)

        if supplier_invoice_id:
            supplier_po_grns = SupplierPOGRN.objects.filter(supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice=supplier_invoice_id)

        return supplier_po_grns

    def get(self, request, *args, **kwargs):
        filters = self._filters
        return_data = []
        supplier_po_grns = self.get_supplier_po_grns()

        for supplier_po_grn in supplier_po_grns:
            supplier_po_grn_queryset = SupplierPOGRNMaterialDetail.objects.filter( **{filters['supplier_po_grn']: supplier_po_grn})
            supplier_po_grn_materials = self.get_distinct_queryset(supplier_po_grn_queryset, filters['supplier_po_grn_materials'])
            supplier_po_material_data = []

            for supplier_po_grn_material in supplier_po_grn_materials:
                if supplier_po_grn_material.grn_material.customer_brand_material.material_type == Material.FABRIC_MATERIAL:
                    supplier_po_grn_material_queryset = supplier_po_grn_queryset.filter(**{filters['supplier_po_grn_materials']: supplier_po_grn_material})
                    shade_groups = self.get_distinct_queryset(supplier_po_grn_material_queryset, filters['shade_group'])
                    shade_groups_data = []
                    for shade_group in shade_groups:
                        if shade_group:
                            shade_group_data = {
                                'shade_name': shade_group.shade_name,
                                'shade_group_id': shade_group.id,
                                'display_order': shade_group.display_order,
                                'shades': []
                            }
                            for shade in shade_group.grnbatchnumbershade_set.all():
                                shade_group_data['shades'].append(
                                    {
                                        'shade': shade.shade,
                                        'shade_id': shade.id
                                    }
                                )
                            shade_groups_data.append(shade_group_data)

                    batch_numbers = self.get_distinct_queryset(supplier_po_grn_material_queryset, filters['batch_number'])
                    batch_number_data = []

                    for batch_number in batch_numbers:
                        supplier_po_grn_material_batch_number_queryset = supplier_po_grn_material_queryset.filter(**{filters['batch_number']: batch_number})
                        shades = self.get_distinct_queryset(supplier_po_grn_material_batch_number_queryset, filters['shade'])
                        shade_data = []

                        for shade in shades:
                            supplier_po_grn_material_batch_number_shade_queryset = supplier_po_grn_material_batch_number_queryset.filter(
                                **{filters['shade']: shade})
                            roll_data = []

                            for supplier_po_grn_material_batch_number_shade in supplier_po_grn_material_batch_number_shade_queryset:
                                roll_data.append(
                                    supplier_po_grn_material_batch_number_shade.fabricgrndetail.pack_number)
                            shade_data.append(
                                {
                                    'shade_id': shade.id,
                                    'shade': shade.shade,
                                    'shade_group_id': shade.supplier_po_shade.id if shade.supplier_po_shade else None,
                                    'roll_data': roll_data
                                }
                            )
                        batch_number_data.append(
                            {
                                'batch_number_id': batch_number.id,
                                'batch_number': batch_number.batch_number,
                                'shades': shade_data
                            }
                        )
                    supplier_po_material_data.append(
                        {
                            'material': supplier_po_grn_material.grn_material.customer_brand_material.verbose_reference_code,
                            'material_type': supplier_po_grn_material.grn_material.customer_brand_material.material_type,
                            'material_id': supplier_po_grn_material.grn_material.id,
                            'shade_groups': shade_groups_data,
                            'batch_numbers': batch_number_data
                        }
                    )
            if not supplier_po_material_data == []:
                return_data.append(
                    {
                        'grn_id': supplier_po_grn.id,
                        'grn_number': supplier_po_grn.grn_number,
                        'materials': supplier_po_material_data
                    }
                )
        return Response(return_data)


class SupplierPOFabricColorToneDetailView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE]

    def get(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        customer_brand_material_id = kwargs.get('customer_brand_material_id', None)
        supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)

        data = None
        supplier_po_fabric_color_tone = get_object_or_none(SupplierPOFabricColorTone, {'supplier_po': supplier_po, 'material_id': customer_brand_material_id})
        if supplier_po_fabric_color_tone:
            data = supplier_po_fabric_color_tone.acceptable_color_tones.all().values_list('id', flat=True)

        return Response(data, status=status.HTTP_200_OK)
    

class SupplierPOFabricColorToneSaveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE]

    def post(self, request, *args, **kwargs):
        supplier_po_id = kwargs.get('supplier_po_id', None)
        supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)

        is_po_club_general_po = supplier_po.general_po_supplier.general_po.is_po_club_general_po()

        if is_po_club_general_po:
            http_response = Response({'error': 'Cannot save club shades'}, status=status.HTTP_400_BAD_REQUEST)

        else:
            material_id = request.data.get('material_id', None)
            color_tones = request.data.get('color_tones', [])

            supplier_po_fabric_color_tone, created = SupplierPOFabricColorTone.objects.get_or_create(
                supplier_po=supplier_po,
                material_id=material_id
            )
            for color_tone_id in color_tones:
                color_tone = get_object_or_404(FabricColorTone, pk=color_tone_id)
                supplier_po_fabric_color_tone.acceptable_color_tones.add(color_tone)

            #club_material_color_tone.acceptable_color_tones.exclude(id__in=color_tones).remove()
            http_response = Response({'success': True})

        return http_response
    

class SupplierPOShadeAttachmentUpdateView(APIView):
    permission_classes = (HasPermission,)
    write_roles = [STORES_USER_ROLE, ]

    def post(self, request):
        supplier_po_fabric_shade_id = request.data.get('id', None)
        attachment = request.data.get('attachment', None)
        shade_name = request.data.get('shade_name', None)

        supplier_po_fabric_shade = get_object_or_404(SupplierPOFabricShade, pk=supplier_po_fabric_shade_id)
        if attachment:
            supplier_po_fabric_shade.shade_swatch_id = attachment['id']
        else:
            supplier_po_fabric_shade.shade_swatch_id = None
        if shade_name:
            supplier_po_fabric_shade.shade_name = shade_name
        supplier_po_fabric_shade.save()
        serializer = SupplierPOFabricShadeSerializer(supplier_po_fabric_shade, many=False).data
        return Response(serializer)
    
    
class SPOMaterialListView(generics.RetrieveAPIView):
    serializer_class = SupplierPOSerializer
    queryset = SupplierPO.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (MERCHANT_ROLE, )


class SPOInvoiceListView(generics.ListAPIView):
    serializer_class = SupplierPODeliveryInvoiceListSerializer
    queryset = SupplierPODeliveryInvoice.objects.all().order_by('-id')
    permission_classes = (HasPermission,)
    write_roles = (MERCHANT_ROLE, )
    pagination_class = GeneralLargeResultsSetPagination


class SupplierPOSendToApproveView(APIView):
    permission_classes = (HasPermission,)
    write_roles = (MERCHANT_ROLE, )

    def post(self, request, supplier_po_id):
        from shared.approvals.constants.approval_choices import SUPPLIER_PO_APPROVAL
        supplier_po = get_object_or_404(SupplierPO, pk=supplier_po_id)
        supplier_po_approver_users = supplier_po.get_po_approval_users()
        if supplier_po_approver_users:
            supplier_po.create_approval(supplier_po_approver_users, request.user, SUPPLIER_PO_APPROVAL)
            http_response = Response({'success': True})
        else:
            http_response = Response({'success': False, 'error': 'No approver user found, please contact admin.'}, status=status.HTTP_400_BAD_REQUEST)
        return http_response



