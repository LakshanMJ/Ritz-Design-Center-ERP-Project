from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from marketing.models import SupplierPODeliveryInvoice, SupplierDeliveryDate
from materials.models import CustomerBrandMaterial



class CommercialInvoiceDeliveryMaterialSerializer(ModelSerializer):

    class Meta:
        fields = ("__all__")
        model = CustomerBrandMaterial

class CommercialInvoicePrevoiusDeliveryMaterialSerializer(ModelSerializer):

    def get_previous_materials(self, instance):
        self.delivery_counter += 1
        return f"Delivery {self.delivery_counter}"

    class Meta:
        fields = ("__all__")
        model = CustomerBrandMaterial


class SupplierDeliveryDateSerializer(ModelSerializer):

    class Meta:
        fields = ("__all__")
        model = SupplierDeliveryDate


class CommercialInvoiceDeliverySummarySerializer(ModelSerializer):
    display_number = serializers.CharField()
    materials = serializers.SerializerMethodField()

    def get_materials(self, instance):
        from supplier_po.helpers.summary_calculator_helper import InvoiceDeliverySummary
        data = InvoiceDeliverySummary(instance, instance.get_supplier_po()).get_invoice_delivery_date_summarized_data()
        return data

    class Meta:
        model = SupplierPODeliveryInvoice
        fields = ("__all__")