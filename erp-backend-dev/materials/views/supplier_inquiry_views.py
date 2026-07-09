from django.http import Http404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework import status
from materials.models import CustomerBrandMaterial, Material, SupplierInquiry, SupplierInquiryDetail, SupplierInquiryMaterialCode
from shared.permissions.roles import MERCHANT_ADMIN_ROLE, MERCHANT_ROLE
from shared.permissions.view_permissions import HasPermission
from materials.serializers.material_serializers import SupplierInquirySerializer,  SupplierInquiryMaterialDetailSerializer
from rest_framework.generics import ListAPIView, get_object_or_404
from shared.models import Supplier
from marketing.models import OrderInquiry, OrderCostingVersion, SupplierInquiryCostingVersion
import datetime
import uuid
from shared.serializers import SupplierSerializer

from shared.utils import get_object_or_none


class SupplierInquiryCreateView(generics.CreateAPIView):
    queryset = SupplierInquiry.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission, )
    write_roles = [MERCHANT_ROLE, ]
    _warnings = []
    _errors = []

    def has_supplier_material_feedback_pending(self, supplier_id, version_id, entity_id, is_service):
        if is_service:
            inquiry_details = {"item_service__id": entity_id, }

        else:
            inquiry_details = {"customer_brand_material__id": entity_id}

        data = {
            "version__id": version_id,
            "supplier__id": supplier_id,
            "email_status__in": [SupplierInquiry.QUEUED_EMAIL,
                                 SupplierInquiry.PENDING_EMAIL,
                                 SupplierInquiry.PENDING_RESPONSE],
            **inquiry_details
        }
        feedback_pending_inquiries = SupplierInquiry.objects.filter(**data)
        return feedback_pending_inquiries.exists()

    def get_inquiry_data(self, supplier_id, version_id, entity_id, is_service):

        if is_service:
            inquiry_details = {"item_service": entity_id, }

        else:
            inquiry_details = {"customer_brand_material": entity_id}

        data = {
            "version": version_id,
            "supplier": supplier_id,
            "hash_id": str(uuid.uuid4())[0:12],
            **inquiry_details
        }
        return data
    
    def get_consolidate_inquiry_data(self, supplier_id, entity_id, is_service):

        if is_service:
            inquiry_details = {"item_service_id": entity_id, }

        else:
            inquiry_details = {"customer_brand_material_id": entity_id}

        data = {
            "supplier_id": supplier_id,
            "version": None,
            "email_status": SupplierInquiry.PENDING_EMAIL,
            **inquiry_details
        }
        return data

    def get_supplier_inquiries(self, data, version_id, supplier_id):
        if data.get('item_service', None):
            item_service = data['item_service']
            supplier_inquiries = SupplierInquiry.objects.filter(
                version_id=version_id,
                supplier_id=supplier_id,
                item_service=item_service
            )
        else:
            supplier_inquiries = SupplierInquiry.objects.filter(
                version_id=version_id,
                supplier_id=supplier_id,
                customer_brand_material=data['customer_brand_material']
            )
        return supplier_inquiries

    def process_data(self, version_id, supplier_ids, material_or_service_ids, is_service):
        created_supplier_inquiry_list = []
        for row in supplier_ids:
            supplier_id = row['id']
            consolidate = row['consolidate']

            for temp_material_id in material_or_service_ids:
                inquiry_data = self.get_inquiry_data(supplier_id, version_id, temp_material_id, is_service)
                consolidate_inquiry_data = self.get_consolidate_inquiry_data(supplier_id, temp_material_id, is_service)
                has_supplier_material_feedback_pending = self.has_supplier_material_feedback_pending(supplier_id, version_id, temp_material_id, is_service)
                serializer = SupplierInquirySerializer(
                    data=inquiry_data
                )
                save_inquiry = not has_supplier_material_feedback_pending

                if serializer.is_valid():
                    try:
                        supplier_inquiries = self.get_supplier_inquiries(inquiry_data, version_id, supplier_id)
                        # send warning alert if any supplier inquiry without supplier feed back
                        if supplier_inquiries.filter(has_supplier_feedback=True).exists():
                            save_inquiry = False
                            self._warnings.append({"version_id": version_id,
                                             "supplier_id": Supplier.objects.get(id=supplier_id).name,
                                            #  "customer_brand_material_id": customer_brand_material,
                                             "status": "Email Sent Already"})

                    except SupplierInquiry.DoesNotExist:
                        pass

                    if save_inquiry:
                        created_supplier_inquiry = serializer.save()
                        SupplierInquiryDetail.objects.get_or_create(supplier_inquiry=created_supplier_inquiry)
                        if consolidate:
                            created_supplier_inquiry.email_status = SupplierInquiry.PENDING_RESPONSE
                            created_supplier_inquiry.save()
                            created_consolidate_supplier_inquiry, created = SupplierInquiry.objects.get_or_create(**consolidate_inquiry_data)
                            if created:
                                created_consolidate_supplier_inquiry.hash_id = str(uuid.uuid4())[0:12]
                            created_consolidate_supplier_inquiry_detail, created = SupplierInquiryDetail.objects.get_or_create(supplier_inquiry=created_consolidate_supplier_inquiry)
                            SupplierInquiryCostingVersion.objects.get_or_create(
                                supplier_inquiry=created_consolidate_supplier_inquiry,
                                costing_version_id=version_id,
                                estimated_quantity =created_consolidate_supplier_inquiry.total_requested_quantity,
                                estimated_quantity_unit =created_consolidate_supplier_inquiry_detail.supplier_inquiry.customer_brand_material.material_normalized_measuring_unit
                            )

                        created_supplier_inquiry_list.append(created_supplier_inquiry.id)
                else:
                    self._errors.append(serializer.errors)
        return created_supplier_inquiry_list

    def post(self, request, *args, **kwargs):
        version_id = kwargs.get('version_id', None)
        errors = None
        all_material_data = request.data
        warnings =[]
        created_supplier_inquiry_list =[]

        for row in all_material_data:
            supplier_ids = row.get('supplier_ids', [])
            customer_brand_material_ids = row.get('customer_brand_material_id', [])
            item_service_ids = row.get('service_id', [])
            created_material_ids = self.process_data(version_id, supplier_ids, customer_brand_material_ids, False)
            created_service_ids = self.process_data(version_id, supplier_ids, item_service_ids, True)
            created_supplier_inquiry_list = [*created_material_ids, created_service_ids]

        data ={}
        if warnings:
            text = ""
            for warning in warnings:
                if text == "":
                    text = "Email already send for Order ID " + str(warning['order_id']) + " Supplier " + str(
                        warning['supplier_id'])
                else:
                    text = text + ", Order ID " + str(warning['order_id']) + " Supplier " + str(
                        warning['supplier_id'])
            data["warnings"] = text
        data['status'] = "Sucessfully Created"

        http_response = Response(data=data)
        if len(self._errors) > 0:
            http_response = Response(errors, status=status.HTTP_400_BAD_REQUEST)
        return http_response


class SupplierInquiryListView(generics.ListAPIView):
    queryset = SupplierInquiry.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        if 'supplier_id' in self.kwargs:
            qs = SupplierInquiry.objects.filter(version=self.kwargs['version_id'], supplier=self.kwargs['supplier_id'])
        else:
            qs = SupplierInquiry.objects.filter(version=self.kwargs['version_id'])
        return qs.order_by('customer_brand_material__material_detail__generic_material__user_material__display_order')


class SupplierInquiryDetailView(generics.RetrieveAPIView):
    queryset = SupplierInquiry.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]


class SupplierInquiryDetailDeleteView(generics.DestroyAPIView):
    queryset = SupplierInquiryDetail.objects.all()
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_object(self):
        object = super().get_object()
        version_id = self.kwargs.get('version_id')
        if object.supplier_inquiry.version_id != version_id:
            raise Http404("Version Id did not match the id")
        return object

    def delete(self, request, *args, **kwargs):
        object = self.get_object()
        all_details = object.supplier_inquiry.supplierinquirydetail_set.all()
        if all_details.count() == 1:
            http_response = Response({'error': "Cannot delete inquiry. There should be at least one row of data for a supplier inquiry."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            http_response = super().delete(request, *args, **kwargs)
        return http_response


class SupplierInquiryUpdateView(generics.UpdateAPIView):
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]
    field_mapping = {
        SupplierInquiry.FOB_PRICE_KEY: "FOB Price",
        SupplierInquiry.COST_PER_UNIT_KEY: "Cost Per Unit",
        SupplierInquiry.CIF_PRICE_KEY: "CIF Price",
        # SupplierInquiry.FREIGHT_CHARGE_KEY: "Freight Charge",
        SupplierInquiry.SHIP_MODE_KEY: "Ship Mode",
        SupplierInquiry.PAY_MODE_KEY: "Pay Mode",
        SupplierInquiry.SUPPLIER_INQUIRY_MATERIAL_CODE_KEY: "Supplier Material Reference Code",
        SupplierInquiry.EXCESS_THRESHOLD_KEY: "Excess Threshold"
    }

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)
        self.errors = {}

    def get_queryset(self):
        return SupplierInquiry.objects.filter(order=self.kwargs['order_id'])

    def process_date(self, date_string, date_field):
        date_value = date_string
        try:
            if date_value:
                date_value = date_value.split("T")[0]
                date_value = datetime.datetime.strptime(date_value, '%Y-%m-%d').strftime('%d/%m/%Y')

        except ValueError as ex:
            self.errors[date_string] = "Date should be in format dd-mm-yyyy"
        return date_value

    def save_supplier_inquiry_data(self, data):
        for row in data:
            supplier_inquiry_details = row['supplier_inquiry_details']
            supplier_inquiry_id = row.get('id')
            supplier_inquiry = SupplierInquiry.objects.get(pk=supplier_inquiry_id)
            item_service_id = row.get('item_service_id', None)

            for supplier_inquiry_detail in supplier_inquiry_details:
                if supplier_inquiry_detail['supplier_material_reference_code']:
                    supplier_material_reference_code, created = SupplierInquiryMaterialCode.objects.get_or_create(customer_brand_material=supplier_inquiry.customer_brand_material,
                                                                                                         supplier=supplier_inquiry.supplier,
                                                                                                         supplier_material_reference_code=supplier_inquiry_detail['supplier_material_reference_code'])
                    supplier_inquiry_detail['supplier_inquiry_material_code'] = supplier_material_reference_code.id
                supplier_inquiry_detail['expiration_date'] = self.process_date(supplier_inquiry_detail.get('expiration_date', None), 'expiration_date')
                # supplier_inquiry_detail['tentative_material_in_house_date'] = self.process_date(supplier_inquiry_detail.get('tentative_material_in_house_date', None), 'tentative_material_in_house_date')

                supplier_inquiry_detail['supplier_inquiry'] = supplier_inquiry_id
                completed = supplier_inquiry_detail.get('completed', True)

                supplier_inquiry_detail_id = supplier_inquiry_detail.get('id', None)
                supplier_inquiry_detail_object = None
                if supplier_inquiry_detail_id:
                    supplier_inquiry_detail_object = get_object_or_none(SupplierInquiryDetail, {'pk': supplier_inquiry_detail_id, 'supplier_inquiry': supplier_inquiry})
                # else:
                #     supplier_inquiry_detail_object = SupplierInquiryDetail.objects.create(supplier_inquiry=supplier_inquiry)
                supplier_inquiry_detail['item_service_id'] = item_service_id
                detail_serializer = SupplierInquiryMaterialDetailSerializer(instance=supplier_inquiry_detail_object, data={**supplier_inquiry_detail}, partial=True, completed=completed)
                if detail_serializer.is_valid():
                    detail_serializer.save()
                else:

                    self.errors = {**self.errors, **detail_serializer.errors}

    def put(self, request, *args, **kwargs):
        self.save_supplier_inquiry_data(request.data)
        if bool(self.errors):
            mapped_errors = {}
            for key in self.errors:
                if key in self.field_mapping:
                    mapped_errors[self.field_mapping[key]] = self.errors[key]
                else:
                    mapped_errors[key] = self.errors[key]
            return Response(data=mapped_errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(data={'status': 'Successfully Updated'})


class SupplierInquiryManualUpdateView(SupplierInquiryUpdateView):

    def save_supplier_inquiry_data(self, data):
        for row in data:
            supplier_inquiry_detail = row
            supplier_id = row.get('supplier_id')
            version_id = self.kwargs.get('version_id', None)
            customer_brand_material_id = row.get('customer_brand_material_id', None)
            item_service_id = row.get('item_service_id', None)

            supplier_inquiry = None
            created_supplier_inquiry = False

            if not supplier_id:
                continue

            if customer_brand_material_id:
                supplier_inquiry, created_supplier_inquiry = SupplierInquiry.objects.get_or_create(
                    supplier_id=supplier_id, version_id=version_id, customer_brand_material_id=customer_brand_material_id
                )
            elif item_service_id:
                supplier_inquiry, created_supplier_inquiry = SupplierInquiry.objects.get_or_create(supplier_id=supplier_id, version_id=version_id, item_service_id=item_service_id)

            if created_supplier_inquiry:
                supplier_inquiry.email_status = SupplierInquiry.NOT_APPLICABLE
                supplier_inquiry.save()

            if supplier_inquiry:
                if supplier_inquiry_detail.get('supplier_material_reference_code', None):
                    supplier_material_reference_code, created = SupplierInquiryMaterialCode.objects.get_or_create(customer_brand_material=supplier_inquiry.customer_brand_material,
                                                                                                         supplier=supplier_inquiry.supplier,
                                                                                                         supplier_material_reference_code=supplier_inquiry_detail['supplier_material_reference_code'])
                    supplier_inquiry_detail['supplier_inquiry_material_code'] = supplier_material_reference_code.id
                supplier_inquiry_detail['expiration_date'] = self.process_date(supplier_inquiry_detail.get('expiration_date', None), 'expiration_date')
                # supplier_inquiry_detail['tentative_material_in_house_date'] = self.process_date(supplier_inquiry_detail.get('tentative_material_in_house_date', None), 'tentative_material_in_house_date')

                supplier_inquiry_detail['supplier_inquiry'] = supplier_inquiry.pk
                completed = supplier_inquiry_detail.get('completed', True)

                supplier_inquiry_detail_id = supplier_inquiry_detail.get('id', None)
                supplier_inquiry_detail_object = None
                if supplier_inquiry_detail_id:
                    supplier_inquiry_detail_object = get_object_or_none(SupplierInquiryDetail, {'pk': supplier_inquiry_detail_id, 'supplier_inquiry': supplier_inquiry})

                # else:
                #     supplier_inquiry_detail_object = SupplierInquiryDetail.objects.create(supplier_inquiry=supplier_inquiry)

                detail_serializer = SupplierInquiryMaterialDetailSerializer(instance=supplier_inquiry_detail_object, data={**supplier_inquiry_detail}, partial=True, completed=completed)
                if detail_serializer.is_valid():
                    detail_serializer.save()
                else:
                    self.errors = {**self.errors, **detail_serializer.errors}


class SupplierInquiryGraphView(APIView):
    queryset = SupplierInquiry.objects.all()
    # serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        order_id = kwargs['order_id']
        customer_brand_material_id = request.query_params.get('customer_brand_material_id')
        supplier_inquiries = SupplierInquiry.objects.filter(order=order_id, customer_brand_material=customer_brand_material_id)
        suppliers = []
        consumptions = []
        fob_prices = []
        cif_prices = []
        freight_charges = []
        for supplier_inquiry in supplier_inquiries:
            suppliers.append(supplier_inquiry.supplier.name)
            fob_prices.append(supplier_inquiry.fob_price)
            cif_prices.append(supplier_inquiry.cif_price)
            freight_charges.append(supplier_inquiry.freight_charge)
        graph_data = {
            'graph_data': {
                'labels': suppliers,
                'datasets': [
                    {
                        'label': 'FOB Price',
                        'data': fob_prices
                    },
                    {
                        'label': 'CIF Price',
                        'data': cif_prices
                    },
                    {
                        'label': 'Freight Charge',
                        'data': freight_charges
                    }
                    
                ]
            }
        }

        return Response(data=graph_data)
    

class PendingSupplierInquiryEmailsView(APIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get(self, request, *args, **kwargs):
        version = get_object_or_404(OrderCostingVersion, pk = kwargs['version_id'])
        pending_email_count = len(SupplierInquiry.objects.filter(version=version, email_status = SupplierInquiry.PENDING_EMAIL))
        return Response(data={'pending_email_count': pending_email_count})


class SupplierInquiryStateChangePendingEmailToQueuedEmailView(generics.UpdateAPIView):

    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def put(self, request, *args, **kwargs):
        version = get_object_or_404(OrderCostingVersion, pk=kwargs['version_id'])
        supplier_inquiries = SupplierInquiry.objects.filter(version=version, email_status=SupplierInquiry.PENDING_EMAIL)
        for supplier_inquiry in supplier_inquiries:
            supplier_inquiry.email_status=supplier_inquiry.QUEUED_EMAIL
            supplier_inquiry.save()
        return Response(data={'queued_count': len(supplier_inquiries)})
    
  
class SupplierInquiryReplyListView(generics.ListAPIView):
    queryset = SupplierInquiry.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def get_queryset(self):
        supplier_ids = self.request.GET.get('supplier_ids')
        supplier_ids_list = supplier_ids.split(',')
        version_id = self.kwargs['version_id']
       
        if supplier_ids:
            qs = SupplierInquiry.objects.filter(version=version_id, supplier__in=supplier_ids_list)
        else:
            qs = SupplierInquiry.objects.filter(version=version_id)
        return qs.order_by('customer_brand_material__material_detail__generic_material__user_material__display_order')

class SupplierInquiryDeleteView(generics.DestroyAPIView):
    queryset = SupplierInquiryDetail.objects.all()
    serializer_class = SupplierInquirySerializer
    permission_classes = (HasPermission,)
    write_roles = [MERCHANT_ROLE, ]

    def delete(self, request, *args, **kwargs):
        supplier_inquiry_detail_id = kwargs['pk']
        supplier_inquiry_detail = get_object_or_404(SupplierInquiryDetail,pk=supplier_inquiry_detail_id)
        data = {}
        return_status = status.HTTP_200_OK
        supplier_inquiry = supplier_inquiry_detail.supplier_inquiry
        costing_version = supplier_inquiry.version
        costing_version_state = costing_version.version_state
        deletable_costing_version_states = [costing_version.PENDING_MATERIALS_VERSION_STATE, costing_version.PENDING_CONSUMPTION_DATA_VERSION_STATE]
        if costing_version_state in deletable_costing_version_states:
            supplier_inquiry_detail.delete()
            other_supplier_inquiry_details = supplier_inquiry.supplierinquirydetail_set.all()
            if not other_supplier_inquiry_details.exists():
                supplier_inquiry.delete()
        else:
            data["detail"] = 'Cannot delete in this costing version state'
            return_status = status.HTTP_400_BAD_REQUEST
        return Response(data=data, status=return_status)