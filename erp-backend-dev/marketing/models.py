import decimal
import math
from abc import abstractmethod
from datetime import date, datetime
from functools import cached_property
from django.contrib.contenttypes.models import ContentType

from django.db import models
from django.db.models import Q, Max, Sum

from marketing.exceptions.exceptions import StateTransitionPermissionDenied, InvalidStateTransition, \
    CostingEditingDenied
from marketing.exceptions.po_exceptions import POMaterialMismatchException
from marketing.constants.costing_constants import MATERIAL_COSTS_KEY, FABRICS_COSTS_KEY, TRIMS_COSTS_KEY, \
    PACK_ITEM_TOTAL_COST_KEY, PACK_ITEM_SERVICE_COST_KEY, PACK_TOTAL_COST_KEY, PACKAGING_TOTAL_COST_KEY, \
    PACK_PACK_ITEM_COSTS_SUMMARY, FABRIC_FINANCING_COST_KEY, TRIM_FINANCING_COST_KEY, SERVICE_FINANCING_COST_KEY, PACKAGING_COSTS_SUMMARY, \
    PACK_FABRIC_COSTS_KEY, PACK_TRIM_COSTS_KEY, NORMALIZED_COSTS_KEY, BUYER_COMMISSION_COST_KEY, \
    FABRIC_FINANCING_COST_PERCENTAGE_KEY, \
    TRIM_FINANCING_COST_PERCENTAGE_KEY, SERVICE_FINANCING_COST_PERCENTAGE_KEY, BUYER_COMMISSION_COST_PERCENTAGE_KEY, PACK_ITEM_IE_OPERATION_COST_KEY, \
    PACK_ITEM_SERVICE_COST_SUMMARY_KEY, PACK_ITEM_COST_DATA_KEY, TOTAL_OTHER_COST_KEY, TOTAL_IE_OPERATION_COST_KEY,  MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES, \
    SERVICE_COSTS_ROUNDING_DECIMAL_PLACES, TOTAL_COST_ROUNDING_DECIMAL_PLACES, IE_OPERATION_ROUNDING_DECIMAL_PLACES, \
    OTHER_COST_ROUNDING_DECIMAL_PLACES, BUYER_COMMISSION_ROUNDING_DECIMAL_PLACES
from marketing.model_utils.model_functions.po_club_classes import ActualPOClubModelMixin
from marketing.model_utils.model_functions.purchase_order_classes import PurchaseOrderModelMixin, \
    PurchaseOrderBOMModelMixin
from marketing.model_utils.grn_utils import calculate_material_delivery_quantity_summary
from marketing.model_utils.po_model_utils import POFabricConsumptionUtils
from marketing.utils.model_utils import get_material_details, get_version_service_details
from marketing.utils.po_utils.po_model_utils import get_consumption_and_wastage_combination
from materials.fieldmetadata.measuring_unit_helpers import PerMeasuringUnitHelper, MaterialUnitHelper
from materials.models import SupplierInquiry, MATERIAL_TYPES, Material, UserDefinedMaterial, CustomerBrandMaterial, \
    SupplierInquiryDetail, EmbellishmentType, EmbellishmentSubType, UserDefinedMaterialDefect, GenericMaterialVariation, FabricColorTone
from shared.models import BaseAbstractModel, Customer, Brand, Season, Size, SizeCategory, Country, ColorwayCategory, \
    FileAttachment, User, Supplier, MachineType, FolderType, OtherCost, CustomerBrand, EmailEvent, InHouseMaterial, Plant, Role, CustomerBrandDepartment, \
    PAYMENT_METHOD_TYPES,  SEA_TRANSPORT_METHOD, Port
from django.core.exceptions import ObjectDoesNotExist
from shared.permissions.roles import ADMIN_ROLE, BUSINESS_ADMIN_COSTING_APPROVER, FINANCE_COSTING_APPROVER
from shared.utils import get_object_or_none, base64_encode_string, is_none, convert_to_float_or_none, round_if_number, \
    calculate_queryset_total_normalized_quantity, get_float_or_zero, convert_quantity_to_unit, get_object_or_none_qs, \
    get_quantity_dictionary, ceil_number, calculate_queryset_total_amount_normalized_amount, get_amount_dictionary, \
    convert_per_unit_cost, round_float_to_decimal_places, add_nums_or_none, get_int_or_zero
from supplier_po.models import *
from finance.models import OutgoingCommercialInvoice, IncomingPayment, OutgoingPayment, SupplierPODeliveryInvoicePCL, PCLBankInformation, PCLBankInformationLinkedPOClub
from shared.utils import get_object_or_none_dict
from service_po.models import GeneralServicePO, GeneralServicePOSupplier, GeneralServicePOService, GeneralServicePOSupplierPrice, \
                                GeneralServicePOServiceDelivery, GeneralServicePODeliveryPOAllocation, ServicePO
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from rest_framework.generics import get_object_or_404
from transport.models import TransportDeliveryDateTracking


class Item(BaseAbstractModel):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=5, null=False, unique=False)
    customer_brand = models.ForeignKey(CustomerBrand, on_delete=models.CASCADE, null=True)

    def create_item_variations(self):
        for colorway_category in ColorwayCategory.objects.all():
            variation_name = self.name + '/' + colorway_category.name
            ItemVariation.objects.get_or_create(item=self,  colorway_category=colorway_category, variation_name=variation_name)

    @property
    def item_customer_name(self):
        return '%s (%s)' % (self.name, self.customer_brand.customer)
        
    
class AbstractOperationModel(BaseAbstractModel):
    operation_name = models.CharField(max_length=2000)
    video = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
    costing_smv = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    factory_smv = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    machine_type = models.ForeignKey(MachineType, on_delete=models.CASCADE, null=True)
    folder_type = models.ForeignKey(FolderType, on_delete=models.CASCADE, null=True)

    class Meta:
        abstract = True  # DO NOT REMOVE THIS LINE


class ItemVariation(BaseAbstractModel):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    variation_name = models.CharField(max_length=1000)
    colorway_category = models.ForeignKey(ColorwayCategory, on_delete=models.CASCADE, null=True)

    def get_total_costed_smv(self, colorway_item_type=None, version=None):
        total_costed_smv = 0
        if version:
            qs = OrderItemColorwayOperation.objects.filter(colorway_item_category=colorway_item_type, version=version, active=True)
            print(qs)
        else:
            qs = ItemVariationOperation.objects.filter(variation=self, active=True)
        for row in qs:
            if row.costing_smv:
                total_costed_smv += row.costing_smv
        return total_costed_smv
    
    def get_total_factory_smv(self, colorway_item_type=None, version=None, active=True):
        total_factory_smv = 0
        if version:
            qs = OrderItemColorwayOperation.objects.filter(version=version, colorway_item_category=colorway_item_type, active=True)
            print(qs, version)
        else:
            qs = ItemVariationOperation.objects.filter(variation=self, active=True)
        for row in qs:
            if row.factory_smv:
                total_factory_smv += row.factory_smv
        return total_factory_smv

class ItemVariationOperation(AbstractOperationModel):
    variation = models.ForeignKey(ItemVariation, on_delete=models.CASCADE, null=True)
    display_order = models.IntegerField(null=True)

    class Meta:
        ordering = ['display_order']


class ItemAttribute(BaseAbstractModel):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    placement = models.CharField(max_length=600)
    PLACEMENT_TYPES = MATERIAL_TYPES
    type = models.CharField(max_length=300, )  # should be material name
    ORDER_PACK = 'orderpack'
    ORDER_PACK_ITEM = 'orderpackitem'
    PLACEMENT_ASSIGN_TYPE_OPTIONS = (
        (ORDER_PACK, 'Order Pack'),
        (ORDER_PACK_ITEM, 'Order Pack Item')
    )
    assign_type = models.CharField(max_length=50, default=ORDER_PACK_ITEM, choices=PLACEMENT_ASSIGN_TYPE_OPTIONS)
    material = models.ForeignKey(UserDefinedMaterial, on_delete=models.SET_NULL, null=True)
    estimated_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    estimated_consumption_ratio_units = models.CharField(null=True, max_length=50)
    is_mandatory = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        super().save()
        if not self.material and self.type:
            ud = get_object_or_none_dict(UserDefinedMaterial, name=self.type)
            self.material = ud
            self.save()


class OrderInquiryProgram(BaseAbstractModel):
    number_of_orders = models.IntegerField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, default=None, blank=True, null=True)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, default=None, blank=True, null=True)
    season = models.ForeignKey(Season, on_delete=models.CASCADE, default=None, blank=True, null=True)
    year = models.IntegerField(default=None, blank=True, null=True)
    program_confirmed = models.BooleanField(default=False)

    def get_file_saving_path(self):
        return 'program/%s/' % (str(self.pk))

    @property
    def display_number(self):
        return f"PRO{self.id:06}"


class OrderInquiry(BaseAbstractModel):
    date = models.DateField(default=date.today)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, default=None, blank=True, null=True)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, default=None, blank=True, null=True)
    season = models.ForeignKey(Season, on_delete=models.CASCADE, default=None, blank=True, null=True)
    year = models.IntegerField(default=None, blank=True, null=True)

    SINGLE_PACK_TYPE = 'single'
    MULTI_PACK_TYPE = 'multi'
    TYPE_CHOICES = (
        (SINGLE_PACK_TYPE, "Single"),
        (MULTI_PACK_TYPE, "Multi")
    )
    pack_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default=None, blank=True, null=True)

    COMMON_PRICE = 'common_price'
    GROUP_BY_SIZES = 'group_by_sizes'
    PRICE_FOR_EACH_SIZE = 'price_for_each_size'
    COSTING_METHODE_CHOICES = (
        (COMMON_PRICE, "Single Price for all Sizes"),
        (GROUP_BY_SIZES, "Group by Sizes"),
        (PRICE_FOR_EACH_SIZE, "Individual Price for Each Size")
    )

    costing_method = models.CharField(max_length=50, choices=COSTING_METHODE_CHOICES, default=None, blank=True, null=True)
    size_category = models.ForeignKey(SizeCategory, on_delete=models.CASCADE, blank=True, null=True)
    number_of_colorways = models.IntegerField(null=True)
    quantity_per_pack = models.IntegerField(default=None, blank=True, null=True)
    style_number = models.CharField(max_length=100, default=None, blank=True, null=True)
    style_description = models.CharField(max_length=500, default=None, blank=True, null=True)
    items = models.ManyToManyField('Item', through='OrderItem')
    merchant = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='merchant_order_inquiries')
    watchlist = models.ManyToManyField(User, related_name='watchlist_order_inquiries')
    order_program = models.ForeignKey(OrderInquiryProgram, on_delete=models.SET_NULL, null=True)
    department = models.ForeignKey(CustomerBrandDepartment, on_delete=models.SET_NULL, default=None, blank=True, null=True)

    OPEN_STATE = 'open'
    OPEN_PRE_COSTING_STATE = 'open_pre_costing'
    GENERAL_INFORMATION_COMPLETE_STATE = 'general_information_complete'
    STATE_CHOICES = (
        (OPEN_STATE, 'Open'),
        (OPEN_PRE_COSTING_STATE, 'Open Pre Costing'),
        (GENERAL_INFORMATION_COMPLETE_STATE, 'General Information Complete'),
    )
    STATE_TRANSITIONS = {
        OPEN_STATE: [GENERAL_INFORMATION_COMPLETE_STATE],
        OPEN_PRE_COSTING_STATE: [GENERAL_INFORMATION_COMPLETE_STATE],
    }
    state = models.CharField(max_length=400, choices=STATE_CHOICES, default=OPEN_STATE)

    # Flat Variables
    INDIVIDUAL = 'individual'
    ALL_APPLICABLE = 'applicable_all'
    PATTERN_CHOICES = (
        (INDIVIDUAL, "Individual"),
        (ALL_APPLICABLE, "Applicable to All")
    )
    pattern_type = models.CharField(max_length=50, choices=PATTERN_CHOICES, default=ALL_APPLICABLE)
    ritz_code = models.CharField(max_length=2000, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)
    tech_packs = models.ManyToManyField(FileAttachment)

    @property
    def display_number(self):
        return f"ORD{self.id:06}"
    
    @property
    def short_code(self):
        short_code = []
        
        if self.customer and self.customer.name:
            short_code.append(self.customer.name)
            
        if self.style_number:
            short_code.append(self.style_number)
            
        if self.department and self.department.department:
            short_code.append(self.department.department)
        
        short_code.append(self.display_number)
        
        return ' / '.join(short_code)

    # @property
    # def long_code(self):
    #     long_code = None
    #     if self.department:
    #         long_code = '%s / %s / %s / %s' % (self.customer.name, self.style_number, self.department.department, self.brand.name, self.year, self.season.name, self.display_number)
    #     else:
    #         long_code = '%s / %s / %s' % (self.customer.name, self.style_number, self.brand.name, self.year, self.season.name, self.display_number)
    #     return long_code

    @property
    def long_code(self):
        long_code = []
        
        if self.customer and self.customer.name:
            long_code.append(self.customer.name)
            
        if self.style_number:
            long_code.append(self.style_number)
            
        if self.department and self.department.department:
            long_code.append(self.department.department)

        if self.brand and self.brand.name:
            long_code.append(self.brand.name)

        if self.year:
            long_code.append(str(self.year))

        if self.season and self.season.name:
            long_code.append(self.season.name)
        
        long_code.append(self.display_number)
        
        return ' / '.join(long_code)
    
    @property
    def costing_type(self):
        costing_version = self.get_current_costing_version()
        return costing_version.costing_type if costing_version else None
    
    @property
    def costing_type_display(self):
        costing_version = self.get_current_costing_version()
        return costing_version.get_costing_type_display if costing_version else None

    def generate_code(self, force_update=False):
        customer_code = str(self.customer.code)
        season_code = str(self.season.code)

        num_order_items = str(self.get_order_items().count())
        pack_code = 'P' + str(num_order_items)
        style_number = str(self.style_number)

        order_items = self.get_order_items()
        item_codes = ''

        for order_item in order_items:
            item_codes += str(order_item.item.code) + ', '
        item_codes = '(%s)' % item_codes.strip(', ')
        code = '%s / %s / %s / %s / %s / %s' % (str(self.display_number), customer_code, season_code, pack_code, style_number, item_codes)

        if not self.ritz_code or force_update:
            self.ritz_code = code
            self.save()

    # colorway_item_operation_created = models.BooleanField(default=False)
    def get_order_items(self, include_inactive=False):
        if include_inactive:
            items = self.orderitem_set.filter()
        else:
            items = self.orderitem_set.filter(active=True)
        return items

    def get_order_colorways(self, include_inactive=False):
        if include_inactive:
            colorways = self.ordercolorway_set.filter()
        else:
            colorways = self.ordercolorway_set.filter(active=True)
        return colorways

    # def get_order_colorway_categories(self, include_inactive=False):
    #     if include_inactive:
    #         colorway_categories = self.ordercolorwaycategory_set.filter()
    #     else:
    #         colorway_categories = self.ordercolorwaycategory_set.filter(active=True)
    #     return colorway_categories

    def get_order_countries(self, include_inactive=False):
        if include_inactive:
            countries = self.ordercountry_set.filter()
        else:
            countries = self.ordercountry_set.filter(active=True)
        return countries

    def get_order_sizes(self, include_inactive=False):
        if include_inactive:
            sizes = self.ordersize_set.filter()
        else:
            sizes = self.ordersize_set.filter(active=True)
        return sizes

    def get_order_size_groups(self, include_inactive=False):
        if include_inactive:
            size_groups = self.ordersizegroup_set.filter()
        else:
            size_groups = self.ordersizegroup_set.filter(active=True)
        return size_groups

    def get_order_materials(self, material_type=None):
        pack_materials = OrderPackPlacementMaterial.objects.filter(placement__order_pack__colorway__order=self)
        pack_item_materials = OrderPackItemPlacementMaterial.objects.filter(placement__order_pack_item__item__order=self)

        if material_type:
            pack_materials = pack_materials.filter(
                Q(material__material_detail__generic_material__user_material__name=material_type)
            )
            pack_item_materials = pack_item_materials.filter(
                Q(material__material_detail__generic_material__user_material__name=material_type)
            )
        pack_material_ids = pack_materials.values('material_id', ).distinct()
        pack_item_material_ids = pack_item_materials.values('material_id',).distinct()

        all_materials = [*pack_material_ids, *pack_item_material_ids]
        data = get_material_details(all_materials)
        return data

    def get_order_versions(self, include_inactive=False):
        versions = self.ordercostingversion_set.filter()
        if not include_inactive:
            versions.filter(active=True)
        return versions

    # TODO - handle this. How do you know which is the current costing? Applies mainly for programs
    def get_current_costing_version(self):
        return self.get_order_versions().order_by('-id').first()

    def create_version(self, name=None, user=None, copied_from=None):
        version_number = self.ordercostingversion_set.all().count() + 1
        version_name = name if name else 'Version %s' % (str(version_number))
        default_version = False
        if version_number == 1:
            default_version = True

        version = OrderCostingVersion.objects.create(
            default_version=default_version,
            version=version_number,
            order=self,
            name=version_name,
            merchant=user,
            fabric_finance_cost_percentage=2, # TODO minor - change these hardcoded to db
            trim_finance_cost_percentage=1.5,
            earnings_per_minute=0.5,
            buyer_commission_percentage=2
        )
        if copied_from:
            version.copied_from = copied_from
            version.save()
        else:
            version.verify_packs()
            version.create_version_item_colorway_operations()
        return version

    def set_state(self, next_state, user=None):
        if user and user.has_role(ADMIN_ROLE):
            self.state = next_state
            self.save()
        else:
            if next_state in self.STATE_TRANSITIONS.get(self.state, []):
                self.state = next_state
                self.save()
            else:
                raise InvalidStateTransition("Invalid State Transition")

    def get_order_supplier_inquiries(self):
        return SupplierInquiry.objects.filter(order=self).order_by('supplier__name')

    # This should return all valid ones. Meaning the ones that haven't expired etc
    def get_valid_order_supplier_inquiries(self):
        return self.get_order_supplier_inquiries()

    class Meta:
        ordering = ('id',)


class OrderInquiryStyleNumber(BaseAbstractModel):
    style_number = models.CharField(max_length=20)
    order_inquiry = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)


class OrderItem(BaseAbstractModel):
    order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, null=True)
    item_identifier = models.CharField(max_length=10, null=True)
    image = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    def get_colorway_type_colorways(self, colorway_category_id):
        colorways = ColorwayItemType.objects.filter(item=self, colorway_category_id=colorway_category_id).values_list('colorway_id', flat=True)
        return colorways

    @property
    def item_display(self):
        return '%s [%s]' % (str(self.item.name), str(self.item_identifier))


class OrderColorway(BaseAbstractModel):
    order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    colorway = models.CharField(max_length=300)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ('id', )
        constraints = [
            models.UniqueConstraint(
                fields = ('order', 'colorway'),
                name = 'unique_order_colorway'
            )
        ]


class OrderSize(BaseAbstractModel):
    order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    size = models.ForeignKey(Size, on_delete=models.CASCADE)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ('size__sorting_order',)

        constraints = [
            models.UniqueConstraint(
                fields=('order', 'size'),
                name='unique_order_size'
            )
        ]


class OrderCostingVersion(BaseAbstractModel):
    order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    version = models.IntegerField(null=True, blank=False)
    default_version = models.BooleanField(default=False)
    name = models.CharField(max_length=400)
    attachments = models.ManyToManyField(FileAttachment)

    PENDING_MATERIALS_VERSION_STATE = 'pending_materials_entry'
    PENDING_CONSUMPTION_DATA_VERSION_STATE = 'pending_consumption_data_entry'
    PENDING_SUPPLIER_SELECTION_VERSION_STATE = 'pending_material_supplier_selection'
    COMPLETED_VERSION_STATE = 'complete'
    CANCELED_VERSION_STATE = 'canceled'
    REJECTED_STATE = 'rejected'
    VERSION_STATE_CHOICES = (
        (PENDING_MATERIALS_VERSION_STATE, 'Pending Entry of Materials'),
        (PENDING_CONSUMPTION_DATA_VERSION_STATE, 'Pending Entry of Consumption Ratios'),
        (PENDING_SUPPLIER_SELECTION_VERSION_STATE, 'Pending Material Supplier Selection'),
        (COMPLETED_VERSION_STATE, 'Complete'),
        (CANCELED_VERSION_STATE, 'Canceled'),
        (REJECTED_STATE, 'Rejected')
    )

    version_state = models.CharField(max_length=200, choices=VERSION_STATE_CHOICES, default=PENDING_MATERIALS_VERSION_STATE)
    is_purchase_order = models.BooleanField(default=False)
    operations_completed = models.BooleanField(default=False)
    approved = models.BooleanField(default=False)
    approved_date = models.DateField(null=True)
    expiration_date = models.DateField(default=None, null=True)
    merchant = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    fabric_finance_cost_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    trim_finance_cost_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    service_finance_cost_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    earnings_per_minute = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    buyer_commission_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    supplier_inquiries_complete = models.BooleanField(default=False)
    pack_item_level_administrative_costs = models.BooleanField(default=False)
    lock_finance_editing = models.BooleanField(default=False)
    watchlist = models.ManyToManyField(User, related_name='watchlist_costing_version', blank=True)
    average_pack_cost = models.FloatField(null=True)
    fabric_completion_date = models.DateField(default=None, null=True)
    sewing_trim_completion_date = models.DateField(default=None, null=True)
    packaging_trim_completion_date = models.DateField(default=None, null=True)

    MARKETING_COSTING = 'marketing_costing'
    PRE_COSTING = 'pre_costing'

    COSTING_TYPE_CHOICES = (
        (MARKETING_COSTING, 'Marketing Costing'),
        (PRE_COSTING, 'Pre Costing'),
    )

    costing_type = models.CharField(max_length=200, choices=COSTING_TYPE_CHOICES, default=MARKETING_COSTING)
    marketing_costing = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)
    recalculate_costing = models.BooleanField(default=False)
    copied_from = models.ForeignKey('self', related_name='copied_costing_version', on_delete=models.SET_NULL, null=True)

    @property
    def version_display_number(self):
        return f'COS{self.id:06}'

    @property
    def ritz_code(self):
        number = f'{self.order.ritz_code} / {self.version_display_number}'
        return number

    @property
    def display_number(self):
        return self.ritz_code
    
    @property
    def short_code(self):
        short_code = '%s / %s ' % (self.order.short_code, self.version_display_number)
        return short_code
    
    @property
    def long_code(self):
        dispaly_number = '%s / %s ' % (self.order.long_code, self.version_display_number)
        return dispaly_number

    @property
    def version_data_validator(self):
        from marketing.model_utils.costing_validators import OrderCostingVersionValidator
        return OrderCostingVersionValidator(self)

    def reset_colorway_all_pack_costs(self, order_colorway):
        self.raise_exception_if_cannot_edit_request()
        packs = self.orderpack_set.all().filter(colorway=order_colorway)
        for pack in packs:
            pack.reset_cost_summary()

    def set_colorway_normalized_cost_for_all_packs(self, order_colorway):
        self.raise_exception_if_cannot_edit_request()
        packs = self.orderpack_set.all().filter(colorway=order_colorway)
        for pack in packs:
            pack.new_calculate_normalized_size_group_pack_costs()

    def calculate_colorway_all_pack_costs(self, order_colorway):
        self.raise_exception_if_cannot_edit_request()
        packs = self.orderpack_set.all().filter(colorway=order_colorway)
        for colorway_pack in packs:
            colorway_pack.calculate_pack_cost(True)

    def recalculate_colorway_all_pack_costs_and_normalized_costs(self, order_colorway):
        self.raise_exception_if_cannot_edit_request()
        self.reset_colorway_all_pack_costs(order_colorway)
        self.calculate_colorway_all_pack_costs(order_colorway)
        self.set_colorway_normalized_cost_for_all_packs(order_colorway)

    def recalculate_all_pack_costs_and_normalized_costs(self):
        colorways = self.order.get_order_colorways()
        for colorway in colorways:
            self.recalculate_colorway_all_pack_costs_and_normalized_costs(colorway)
        self.set_costing_average_price()

    def costing_version_complete(self):
        return self.version_state == self.COMPLETED_VERSION_STATE

    def raise_exception_if_cannot_edit_request(self):
        if self.costing_version_complete():
            raise CostingEditingDenied("Cannot edit this request")

    def get_file_saving_path(self):
        return 'costing/%s/version/%s/' % (str(self.order_id), str(self.pk))

    def create_event(self, email_type):
        from shared.scripts.create_email_event import EmailNotification
        EmailEvent.objects.create(email_type=email_type,
                                  email_status=EmailEvent.PENDING_STATUS,
                                  object_type=EmailNotification.OBJECT_TYPE_ORDER_COSTING_VERSION,
                                  object_id=self.id)
        
    def create_costing_approvals(self, users, action_user, approval):
        from shared.approvals.utils import ApprovalUtils
        from shared.approvals.constants.task_entities import ORDER_COSTING_VERSION
        from shared.approvals.constants.approval_choices import get_approval_display_value
        approval_entity_data = []
        approval_entity_data.append({
            'entity_id': self.id,
            'entity_name': ORDER_COSTING_VERSION
        })
        approval_display_value = get_approval_display_value(approval)
        ApprovalUtils.assign_approval(users, action_user, approval_entity_data, approval, approval_display_value)
        return True
    
    def validate_completed_material_complete(self):
        materials = self.get_version_material_types()
        total_materials = materials.count()
        completed_materials_count = CostingCompletedMaterial.objects.filter(material__in=materials, costing_version=self).values('material').distinct().count()
        return completed_materials_count == total_materials
    
    def validate_completed_material_consumption_objects_complete(self, material):
        from materials.models import FABRIC_TRIM_TYPES, SEWING_TRIM_TYPES, PACKAGING_TYPES
        if material.category == FABRIC_TRIM_TYPES:
            is_consumption_completed = self.version_data_validator.verify_fabric_consumption_ratios_complete()
        elif material.category == SEWING_TRIM_TYPES:
            is_consumption_completed = self.version_data_validator.verify_sewing_trim_consumption_ratios_complete(material)
        elif material.category == PACKAGING_TYPES:
            is_consumption_completed = self.version_data_validator.verify_packing_trim_consumption_ratios_complete(material)
        return is_consumption_completed

    def move_to_next_state(self, user=None):
        state_transition_errors = []
        if self.version_state == self.PENDING_MATERIALS_VERSION_STATE:
            quantities_complete = self.version_data_validator.quantities_entry_complete()
            pack_data_complete = self.version_data_validator.order_packs_materials_complete()
            pack_item_data_complete = self.version_data_validator.order_pack_items_materials_complete()
            if not quantities_complete:
                state_transition_errors.append("Please make sure you enter quantity ratios.")
            if not (pack_item_data_complete and pack_data_complete):
                state_transition_errors.append("Please make sure you enter materials for packs and pack items and mark it as complete.")
            self.version_state = self.PENDING_CONSUMPTION_DATA_VERSION_STATE
            from shared.scripts.create_email_event import EmailNotification
            self.create_event(EmailNotification.EMAIL_TYPE_CAD_NOTIFICATION)
        elif self.version_state == self.PENDING_CONSUMPTION_DATA_VERSION_STATE:
            material_consumption_data_complete = self.version_data_validator.validate_material_consumption_data()
            item_size_group_complete = self.version_data_validator.verify_fabric_consumption_ratios()
            cw_item_cw_type_complete = self.version_data_validator.verify_colorway_item_colorway_type_consumption_ratios()
            item_cw_type_complete = self.version_data_validator.verify_item_colorway_type_consumption_ratios()
            self.version_state = self.PENDING_SUPPLIER_SELECTION_VERSION_STATE
            from shared.scripts.create_email_event import EmailNotification
            self.create_event(EmailNotification.EMAIL_TYPE_MERCHANT_NOTIFICATION)
            if not (material_consumption_data_complete and item_size_group_complete): #Disable verification for columns 2 and 3 in validation script of fabric consumption((cw_item_cw_type_complete, item_cw_type_complete)) on 27/05/2025
                state_transition_errors.append("Please ensure that all material consumption ratios and fabric consumption ratios are added and marked as complete.")
        elif self.version_state == self.PENDING_SUPPLIER_SELECTION_VERSION_STATE:
            from shared.approvals.constants.approval_choices import BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL
            if self.costing_type == self.PRE_COSTING:
                if not self.validate_completed_material_complete():
                    state_transition_errors.append("Please ensure that all materials are complete.")
            if not state_transition_errors:
                if not self.recalculate_costing:
                    self.recalculate_all_pack_costs_and_normalized_costs()
                role = Role.objects.get(name=BUSINESS_ADMIN_COSTING_APPROVER)
                business_admin_costing_approver_users = role.users.all()
                self.create_costing_approvals(business_admin_costing_approver_users, user, BUSINESS_ADMIN_COSTING_APPROVER_APPROVAL)
            # self.version_state = self.COMPLETED_VERSION_STATE # TODO medium - add validation here


        response = {'success': True, }
        if state_transition_errors:
            response = {'success': False, 'errors': state_transition_errors}
        else:
            self.save()
        return response

    def get_next_state(self):
        pass

    def get_costing_version_materials(self):
        packaging_materials = OrderPackPlacementMaterial.objects.filter(placement__order_pack__version=self).values_list('material__id', flat=True)
        other_materials = OrderPackItemPlacementMaterial.objects.filter(placement__order_pack_item__pack__version=self).values_list('material__id', flat=True)
        all_materials = [*list(packaging_materials), *list(other_materials)]
        material_qs = CustomerBrandMaterial.objects.filter(pk__in=all_materials)
        return material_qs

    # Create packs and pack groups
    def verify_packs(self):
        order_items = self.order.get_order_items()
        order_colorways = self.order.get_order_colorways()
        order_countries = self.order.get_order_countries()
        order_sizes = self.order.get_order_sizes()
        order_size_groups = self.order.get_order_size_groups()

        for order_colorway in order_colorways:
            for order_country in order_countries:
                for order_size in order_sizes:
                    pack = OrderPack.objects.get_or_create(size=order_size, country=order_country, colorway=order_colorway, version=self)[0]
                    for order_item in order_items:
                        OrderPackItem.objects.get_or_create(pack=pack, item=order_item)
                for order_size_group in order_size_groups:
                    pack = OrderPackSizeGroup.objects.get_or_create(size_group=order_size_group, country=order_country, colorway=order_colorway, version=self)[0]

    def get_order_version_packs(self, include_inactive=False):
        packs = self.orderpack_set.filter().order_by('country__country__name', 'colorway', 'size__size__sorting_order')
        if not include_inactive:
            packs = packs.filter(active=True)
        return packs

    def get_order_version_pack_groups(self, include_inactive=False):
        pack_groups = self.orderpacksizegroup_set.filter()
        if not include_inactive:
            pack_groups = pack_groups.filter(active=True)
        return pack_groups

    def get_order_pack_items(self, include_inactive=False):
        pack_items = OrderPackItem.objects.filter(pack__version=self).order_by('pack__country__country__name')
        if not include_inactive:
            pack_items = pack_items.filter(active=True).order_by('pack__country__country__name')
        return pack_items

    def get_version_materials(self, material_type=None):
        pack_materials = OrderPackPlacementMaterial.objects.filter(
            # placement__order_pack__colorway__order=self.order,
            placement__order_pack__version=self
        )
        pack_item_materials = OrderPackItemPlacementMaterial.objects.filter(
            # placement__order_pack_item__item__order=self,
            placement__order_pack_item__pack__version=self
        )

        if material_type:
            pack_materials = pack_materials.filter(
                Q(material__material__type=material_type) |
                Q(material__material__genericmaterial__user_material__name=material_type)
            )
            pack_item_materials = pack_item_materials.filter(
                Q(material__material__type=material_type) |
                Q(material__material__genericmaterial__user_material__name=material_type)
            )

        pack_material_ids = pack_materials.values('material_id', ).distinct()
        pack_item_material_ids = pack_item_materials.values('material_id', ).distinct()

        all_materials = [*pack_material_ids, *pack_item_material_ids]
        data = get_material_details(all_materials)
        return data
    
    def get_version_material_types(self):
        pack_user_define_material_ids = OrderPackPlacementMaterial.objects.filter(
            placement__order_pack__version=self
        ).values_list('material__material_detail__generic_material__user_material', flat=True)
        pack_item_user_define_material_ids = OrderPackItemPlacementMaterial.objects.filter(
            placement__order_pack_item__pack__version=self
        ).values_list('material__material_detail__generic_material__user_material', flat=True)

        all_materials = [*pack_user_define_material_ids, *pack_item_user_define_material_ids]
        user_define_materials = UserDefinedMaterial.objects.filter(id__in=all_materials)
        return user_define_materials

    def get_version_services(self):
        version_services = PackItemService.objects.filter(pack_item__pack__version=self).order_by('pack_item__pack__country', 'pack_item__pack__colorway', 'pack_item__pack__size__size__sorting_order')
        return version_services

    def get_version_service_details(self):
        services = self.get_version_services()
        return get_version_service_details(services)

    def get_order_pack_items_by_colorway_type(self, order_item, colorway_type_id):
        pass

    def costing_supplier_selectable(self):
        return self.version_state != self.COMPLETED_VERSION_STATE

    def create_version_item_colorway_operations(self):
        completed_latest_order_version = self.order.ordercostingversion_set.filter(active = True, version_state = self.COMPLETED_VERSION_STATE).exclude(pk = self.id)
        if len(completed_latest_order_version) == 0:
            for order_item in self.order.get_order_items():
                for order_colorway_item_type in order_item.colorwayitemtype_set.filter(active=True):
                    colorway_category = order_colorway_item_type.colorway_category
                    for item_variation in order_item.item.itemvariation_set.filter(active=True, colorway_category = colorway_category):
                        for item_variation_operation in item_variation.itemvariationoperation_set.filter(active=True):
                            order_item_colorway_operation, created = OrderItemColorwayOperation.objects.get_or_create(item_variation_operation = item_variation_operation, colorway_item_category = order_colorway_item_type, version = self)
                            if created:
                                order_item_colorway_operation.copy_operations()
        else:
            latest_version = completed_latest_order_version.aggregate(Max('version'))
            latest_order_version = completed_latest_order_version.filter(version = latest_version['version__max'])
            order_item_colorway_operations = latest_order_version[0].orderitemcolorwayoperation_set.all()
            for order_item_colorway_operation in order_item_colorway_operations.exclude(item_variation_operation = None):
                new_order_item_colorway_operation, created = OrderItemColorwayOperation.objects.get_or_create(colorway_item_category = order_item_colorway_operation.colorway_item_category,
                                                                                                     item_variation_operation = order_item_colorway_operation.item_variation_operation,
                                                                                                     display_order = order_item_colorway_operation.display_order,
                                                                                                     version = self)
                if created:
                    new_order_item_colorway_operation.operation_name = order_item_colorway_operation.operation_name
                    new_order_item_colorway_operation.video = order_item_colorway_operation.video
                    new_order_item_colorway_operation.costing_smv = order_item_colorway_operation.costing_smv
                    new_order_item_colorway_operation.factory_smv = order_item_colorway_operation.factory_smv
                    new_order_item_colorway_operation.machine_type = order_item_colorway_operation.machine_type
                    new_order_item_colorway_operation.folder_type = order_item_colorway_operation.folder_type
                    new_order_item_colorway_operation.save()
            for order_item_colorway_operation in order_item_colorway_operations.filter(item_variation_operation = None):
                new_order_item_colorway_operation = OrderItemColorwayOperation.objects.create(colorway_item_category = order_item_colorway_operation.colorway_item_category,
                                                                                                     item_variation_operation = order_item_colorway_operation.item_variation_operation,
                                                                                                     display_order = order_item_colorway_operation.display_order,
                                                                                                     version = self)
                new_order_item_colorway_operation.operation_name = order_item_colorway_operation.operation_name
                new_order_item_colorway_operation.video = order_item_colorway_operation.video
                new_order_item_colorway_operation.costing_smv = order_item_colorway_operation.costing_smv
                new_order_item_colorway_operation.factory_smv = order_item_colorway_operation.factory_smv
                new_order_item_colorway_operation.machine_type = order_item_colorway_operation.machine_type
                new_order_item_colorway_operation.folder_type = order_item_colorway_operation.folder_type
                new_order_item_colorway_operation.save()

    def get_version_supplier_inquiries(self):
        return SupplierInquiry.objects.filter(version=self).order_by('supplier__name')

    def get_version_earnings_per_minute(self, costing_object):
        earnings_per_minute = decimal.Decimal(0.02) # Default value
        if self.earnings_per_minute != None:
            earnings_per_minute = self.earnings_per_minute

        # If pack item level admin costs are set then, use it
        if self.pack_item_level_administrative_costs:
            if isinstance(costing_object, OrderPackItem) and costing_object.earnings_per_minute:
                earnings_per_minute = costing_object.earnings_per_minute
        return earnings_per_minute

    def get_version_fabric_financing_percentage(self, costing_object):
        financing_cost_percent = 2
        if self.fabric_finance_cost_percentage != None:
            financing_cost_percent = self.fabric_finance_cost_percentage

        # If pack item level admin costs are set then, use it
        if self.pack_item_level_administrative_costs:
            if isinstance(costing_object, OrderPackItem) and costing_object.fabric_finance_cost_percentage:
                financing_cost_percent = costing_object.fabric_finance_cost_percentage
        return financing_cost_percent

    def get_version_trim_financing_percentage(self, costing_object):
        trim_cost_percent = 2
        if self.trim_finance_cost_percentage:
            trim_cost_percent = self.trim_finance_cost_percentage

        # If pack item level admin costs are set then
        if self.pack_item_level_administrative_costs:
            if isinstance(costing_object, OrderPackItem) and costing_object.trim_finance_cost_percentage:
                trim_cost_percent = costing_object.trim_finance_cost_percentage
            elif isinstance(costing_object, OrderPack) and costing_object.trim_finance_cost_percentage:
                trim_cost_percent = costing_object.trim_finance_cost_percentage
        return trim_cost_percent
    
    def get_version_service_financing_percentage(self, costing_object):
        service_cost_percent = 0
        if self.service_finance_cost_percentage:
            service_cost_percent = self.service_finance_cost_percentage

        # If pack item level admin costs are set then
        if self.pack_item_level_administrative_costs:
            if isinstance(costing_object, OrderPackItem) and costing_object.service_finance_cost_percentage:
                service_cost_percent = costing_object.service_finance_cost_percentage
            elif isinstance(costing_object, OrderPack) and costing_object.service_finance_cost_percentage:
                service_cost_percent = costing_object.service_finance_cost_percentage
        return service_cost_percent

    def get_version_buyer_commission_percentage(self):
        brokerage_fee = 2
        if self.buyer_commission_percentage != None:
            brokerage_fee = self.buyer_commission_percentage
        return brokerage_fee

    def get_version_colorway_country_size_group_packs(self, order_colorway_id, order_country_id, size_group_id):
        size_group = OrderSizeGroup.objects.get(pk=size_group_id)
        packs = OrderPack.objects.filter(
            version=self,
            colorway_id=order_colorway_id,
            country_id=order_country_id,
            size__in=size_group.sizes.all()
        )
        return packs

    def get_version_colorway_country_size_group_pack_items(self, order_colorway_id, order_country_id, size_group_id):
        order_pack_items = OrderPackItem.objects.filter(
            pack__in=self.get_version_colorway_country_size_group_packs(order_colorway_id, order_country_id, size_group_id)
        )
        return order_pack_items

    def set_costing_average_price(self):
        packs = self.get_order_version_packs().order_by('colorway', 'country', 'size__size__sorting_order').prefetch_related('colorway', 'country', 'size__size')

        processed_pack_ids = []
        total_price = 0
        total_quantity = 0
        for pack in packs:
            if pack.pk not in processed_pack_ids:

                pack_normalized_cost = pack.normalized_total_pack_cost
                if pack_normalized_cost:
                    total_price += get_int_or_zero(pack.cad_quantity) * pack_normalized_cost
                    total_quantity += get_int_or_zero(pack.cad_quantity)
                else:
                    total_price = None
                    break

        average_cost = None
        if not is_none(total_price):
            average_cost = total_price / total_quantity
            average_cost = round(average_cost, 2)
        self.average_pack_cost = average_cost
        self.save()

    # def get_costs_for_all_packs(self): # This was the old way commented out on 4/27/2025
    #     packs = self.get_order_version_packs().order_by('colorway', 'country', 'size__size__sorting_order').prefetch_related('colorway', 'country', 'size__size')
    #
    #     costs = []
    #     processed_pack_ids = []
    #     total_price = 0
    #     total_quantity = 0
    #     for pack in packs:
    #         if pack.pk not in processed_pack_ids:
    #             cost = pack.calculate_normalized_size_group_pack_cost()
    #
    #             colorway = pack.colorway.colorway
    #             country = pack.country.country.name
    #             size = pack.size.size.name
    #             pack_normalized_cost = convert_to_float_or_none(cost.get('normalized_costs', 0))
    #             for cost_pack_id in cost.keys():
    #                 if type(cost[cost_pack_id]) == dict:
    #                     cost_pack = packs.get(pk=cost_pack_id)
    #                     if pack_normalized_cost and not is_none(total_price):
    #                         total_price += cost_pack.cad_quantity * pack_normalized_cost
    #                         total_quantity += cost_pack.cad_quantity
    #
    #                     if cost_pack.colorway_id != pack.colorway_id:
    #                         colorway += cost_pack.colorway.colorway
    #
    #                     if cost_pack.country_id != pack.country_id:
    #                         country += cost_pack.country.country.name
    #
    #                     if cost_pack.size_id != pack.size_id:
    #                         size += ', %s' % (str(cost_pack.size.size.name, ))
    #
    #                     cost[cost_pack_id]['colorway'] = cost_pack.colorway.colorway
    #                     cost[cost_pack_id]['country'] = cost_pack.country.country.name
    #                     cost[cost_pack_id]['size'] = cost_pack.size.size.name
    #
    #                     processed_pack_ids.append(cost_pack_id)
    #             costs.append({
    #                 'colorway': colorway,
    #                 'country': country,
    #                 'size': size,
    #                 'normalized_cost': cost,
    #             })
    #     average_cost = 'N/A'
    #     if not is_none(total_price):
    #         average_cost = total_price / total_quantity
    #         average_cost = round(average_cost, 2)
    #     cost_summary = {
    #         'pack_costs': costs,
    #         'average_cost': average_cost
    #     }
    #     return cost_summary
    
    def get_pack_packagings(self):
        return self.packpackaging_set.all()
    
    def get_po_clubs(self):
        po_club_ids = PurchaseOrder.objects.filter(costing_version=self).values_list('actual_po_club', flat=True)
        po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)
        return po_clubs
    
    def get_marketing_po_clubs(self):
        po_club_ids = PurchaseOrder.objects.filter(marketing_costing=self).values_list('actual_po_club', flat=True)
        po_clubs = ActualPOClub.objects.filter(id__in=po_club_ids)
        return po_clubs

    def get_order_placements(self):
        return self.orderplacement_set.all()

    def get_order_pack_item_placements(self):
        return self.orderpackitemplacement_set.all()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('order', 'version'),
                name='unique_order_version'
            )
        ]


class OrderSizeGroup(BaseAbstractModel):
    order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    sizes = models.ManyToManyField('OrderSize', blank=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    def get_version_packs(self, version):
        sizes = self.sizes.all()
        packs = OrderPack.objects.filter(version=version, size__in=sizes)
        return packs

    def get_sizes(self):
        return self.sizes.all()
    
    class Meta:
        ordering = ['id']


class OrderCountry(BaseAbstractModel):
    order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    country = models.ForeignKey(Country, on_delete=models.CASCADE)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('order', 'country'),
                name='unique_order_country'
            )
        ]


class OrderVersionColorwayCountry(BaseAbstractModel):
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    country = models.ForeignKey(OrderCountry, on_delete=models.CASCADE)
    estimated_quantity = models.IntegerField(null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)


class Unit(BaseAbstractModel):
    description = models.CharField(max_length=20)


class ColorwayItemType(BaseAbstractModel):
    item = models.ForeignKey(OrderItem, on_delete=models.CASCADE)
    colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    colorway_category = models.ForeignKey(ColorwayCategory, on_delete=models.CASCADE, null=True)
    image = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('item', 'colorway'),
                # condition=Q(deleted=False), # TODO - add this when soft delete is added
                name='unique_item_colorway'
            )
        ]


class OrderItemColorwayOperation(AbstractOperationModel):
    colorway_item_category = models.ForeignKey(ColorwayItemType, on_delete=models.CASCADE)
    item_variation_operation = models.ForeignKey(ItemVariationOperation, null=True, on_delete=models.SET_NULL)
    display_order = models.IntegerField(null=True)
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    def copy_operations(self):
        self.operation_name = self.item_variation_operation.operation_name
        self.video = self.item_variation_operation.video
        self.costing_smv = self.item_variation_operation.costing_smv
        self.factory_smv = self.item_variation_operation.factory_smv
        self.machine_type = self.item_variation_operation.machine_type
        self.folder_type = self.item_variation_operation.folder_type
        self.display_order = self.item_variation_operation.display_order
        self.save()

    def get_attributes(self):
        data = {
            'id': self.pk,
            'operation_name': self.operation_name,
            'costing_smv': float(self.costing_smv),
            'factory_smv': float(self.factory_smv),
            # 'machine_type': self.machine_type.pk,
            # 'folder_type': self.folder_type.pk,
        }
        return data

    class Meta:
        ordering = ['display_order']
        constraints = [
            models.UniqueConstraint(
                    fields=('colorway_item_category', 'operation_name', 'version'),
                    name='unique_colorway_item_type_operation'
                )
            ]


class OrderPackSizeGroup(BaseAbstractModel):
    # order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    country = models.ForeignKey(OrderCountry, on_delete=models.CASCADE)
    size_group = models.ForeignKey(OrderSizeGroup, on_delete=models.CASCADE)
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    @property
    def order_packs(self):
        size_ids = self.size_group.sizes.all().values_list('pk')
        packs = OrderPack.objects.filter(colorway=self.colorway, country=self.country, size_id__in=size_ids)
        return packs

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('size_group', 'colorway', 'country', 'version',),
                name='unique_pack_size_group_colorway_country'
            )
        ]


# Colorway Country Size Breakdown for CAD team
class OrderPack(BaseAbstractModel):
    # order = models.ForeignKey(OrderInquiry, on_delete=models.CASCADE)
    size = models.ForeignKey(OrderSize, on_delete=models.CASCADE)
    colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    country = models.ForeignKey(OrderCountry, on_delete=models.CASCADE)
    cad_quantity = models.IntegerField(null=True)
    reviewed = models.BooleanField(default=False)
    packaging_reviewed = models.BooleanField(default=False)
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE, null=True)
    consumption_data_reviewed = models.BooleanField(default=False)
    trim_finance_cost_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    pack_cost = models.FloatField(null=True)
    normalized_requested_cost = models.FloatField(null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    # Calculated fields
    total_packaging_costs = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_other_costs = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_fabric_financing_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_trim_financing_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_service_financing_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    buyer_commission_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_pack_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    normalized_total_pack_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)

    def get_pack_placements(self):
        placements = self.orderpackplacement_set.all()
        return placements

    def get_pack_placement_material_by_material_type(self, material_type=None):
        placement_materials = OrderPackPlacementMaterial.objects.filter(placement__order_pack=self)
        if material_type:
            placement_materials = placement_materials.filter(material__material_detail__generic_material__user_material=material_type)
        return placement_materials

    def get_pack_placements_from_material_type(self, material_type):
        placements = self.orderpackplacement_set.filter(item_attribute_other__material=material_type)
        return placements

    def placements_have_consumption_data(self):
        placements = self.get_pack_placements().prefetch_related(
            'orderpackplacementmaterial',
            'orderpackplacementmaterial__orderpackplacementmaterialconsumption',
        )
        have_data = True
        for placement in placements:
            try:
                consumption_object = placement.orderpackplacementmaterial.orderpackplacementmaterialconsumption
                if not consumption_object.validate_consumption_object():
                    have_data = False
            except ObjectDoesNotExist:
                have_data = False

            if not have_data:
                break
        return have_data

    def get_selected_supplier_inquiry_for_material(self, customer_brand_material):
        supplier_inquiry = None
        try:
            supplier_inquiry = OrderCostingColorwayMaterialSupplierInquiry.objects.get(
                order_costing_version=self.version,
                customer_brand_material=customer_brand_material,
                colorway=self.colorway
            ) # Shouldn't return multiple requests ever
        except ObjectDoesNotExist:
            pass
        return supplier_inquiry

    def get_pack_size_group(self):
        size_group = OrderSizeGroup.objects.get(sizes=self.size)
        return size_group

    def calculate_packaging_cost(self):
        placements = self.get_pack_placements().prefetch_related(
            'orderpackplacementmaterial',
            'orderpackplacementmaterial__orderpackplacementmaterialconsumption',
        )
        cost = 0

        for placement in placements:
            try:
                placement_material = placement.orderpackplacementmaterial
                selected_material = self.get_selected_supplier_inquiry_for_material(placement_material.material)
                supplier_inquiry_detail = None
                if selected_material:
                    supplier_inquiry_detail = selected_material.supplier_inquiry_detail

                consumption_ratio = placement.get_placement_material_consumption()

                if not (consumption_ratio and supplier_inquiry_detail):
                    cost = None
                    break # If a supplier inquiry is not selected for any material in the order the cost returns as None
                cost += consumption_ratio.calculate_cost_for_supplier_inquiry(supplier_inquiry_detail)
                cost = round_float_to_decimal_places(cost, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
            except ObjectDoesNotExist:
                cost = None
                break

        cost_data = {TRIMS_COSTS_KEY: cost, TRIM_FINANCING_COST_KEY: None}
        trim_financing_percentage = self.version.get_version_trim_financing_percentage(self)
        total_cost = cost
        if cost:
            cost = round_float_to_decimal_places(cost, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
            trim_financing_cost = cost * decimal.Decimal(trim_financing_percentage/100)
            trim_financing_cost = round_float_to_decimal_places(trim_financing_cost, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
            total_cost = cost + trim_financing_cost
            cost_data[TRIM_FINANCING_COST_KEY] = trim_financing_cost

        cost_data[PACKAGING_TOTAL_COST_KEY] = round_float_to_decimal_places(total_cost, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
        return cost_data
    
    def get_other_cost_types(self):
        return self.ordercosttype_set.all()

    def get_other_costs(self):
        return self.orderpackothercost_set.all()

    def calculate_other_costs(self):
        other_cost_data = []
        other_costs = self.get_other_costs()
        other_cost_amount = 0
        for other_cost in other_costs:
            if other_cost.cost:
                other_cost_amount += round_float_to_decimal_places(other_cost.cost, OTHER_COST_ROUNDING_DECIMAL_PLACES)
                other_cost_amount = round_float_to_decimal_places(other_cost_amount, OTHER_COST_ROUNDING_DECIMAL_PLACES)
            else:
                other_cost_amount = None
                break
            other_cost_data.append({
                'id': other_cost.pk,
                'other_cost_type_name': other_cost.other_cost_type_name,
                'cost': other_cost.cost
            })
        data = {
            'other_cost_data': other_cost_data,
            'total_cost': other_cost_amount
        }
        return data

    def reset_cost_summary(self):
        # Raise exception if costing is already complete
        self.version.raise_exception_if_cannot_edit_request() # Don't remove this. It will raise an exception if request is not in an editable state

        self.total_packaging_costs = None
        self.total_other_costs = None
        self.total_fabric_financing_cost = None
        self.total_trim_financing_cost = None
        self.total_service_financing_cost = None
        self.buyer_commission_cost = None
        self.total_pack_cost = None
        self.normalized_total_pack_cost = None
        self.save()

        order_pack_items = self.orderpackitem_set.all()
        for order_pack_item in order_pack_items:
            order_pack_item.reset_pack_item_costs()

    def get_pack_items(self):
        return self.orderpackitem_set.all()

    def calculate_pack_cost(self, set_cost_summary=False):
        self.version.raise_exception_if_cannot_edit_request()
        pack_items = self.get_pack_items()
        packaging_cost_data = self.calculate_packaging_cost()
        packaging_trim_financing_cost = packaging_cost_data.get(TRIM_FINANCING_COST_KEY, None)
        packaging_cost = packaging_cost_data[PACKAGING_TOTAL_COST_KEY]

        other_costs = self.calculate_other_costs()['total_cost']
        total_cost = packaging_cost
        pack_item_costs = {}
        fabric_financing_costs = 0
        trim_financing_costs = packaging_trim_financing_cost
        service_financing_costs = 0
        pack_item_cost_data_list = []
        if other_costs == None:
            total_cost = None

        total_fabric_costs = 0
        total_trim_costs = 0
        if total_cost:
            total_cost += other_costs

            for pack_item in pack_items:
                pack_item_cost_data = pack_item.calculate_pack_item_cost(set_cost_summary)
                pack_item_cost_data_list.append(pack_item_cost_data)
                pack_item_cost = pack_item_cost_data.get(PACK_ITEM_TOTAL_COST_KEY, None)
                pack_item_costs[pack_item.pk] = pack_item_cost_data

                if pack_item_cost:
                    total_cost += pack_item_cost
                    total_fabric_costs += pack_item_cost_data[FABRICS_COSTS_KEY]
                    total_trim_costs += pack_item_cost_data[TRIMS_COSTS_KEY]
                else:
                    total_cost = None
                    break

                pack_item_fabric_financing_cost = pack_item_cost_data.get(FABRIC_FINANCING_COST_KEY, None)
                pack_item_trim_financing_cost = pack_item_cost_data.get(TRIM_FINANCING_COST_KEY, None)
                pack_item_service_financing_cost = pack_item_cost_data.get(SERVICE_FINANCING_COST_KEY, None)
                if (pack_item_fabric_financing_cost is not None and pack_item_trim_financing_cost is not None and pack_item_service_financing_cost is not None) and (trim_financing_costs is not None and fabric_financing_costs is not None and service_financing_costs is not None):
                    fabric_financing_costs += pack_item_fabric_financing_cost
                    trim_financing_costs += pack_item_trim_financing_cost
                    service_financing_costs += pack_item_service_financing_cost
                else:
                    fabric_financing_costs = None
                    trim_financing_costs = None
                    service_financing_costs = None

        buyer_commission_cost = None
        if total_cost:
            brokerage_percentage = self.version.get_version_buyer_commission_percentage()
            buyer_commission_cost = total_cost * decimal.Decimal(brokerage_percentage / 100)
            buyer_commission_cost = round_float_to_decimal_places(buyer_commission_cost, BUYER_COMMISSION_ROUNDING_DECIMAL_PLACES)
            total_cost += buyer_commission_cost
            total_cost = round_float_to_decimal_places(total_cost, 2)

            if set_cost_summary:
                self.total_packaging_costs = packaging_cost
                self.total_other_costs = other_costs
                self.total_fabric_financing_cost = fabric_financing_costs
                self.total_trim_financing_cost = trim_financing_costs
                self.total_service_financing_cost = service_financing_costs
                self.buyer_commission_cost = buyer_commission_cost
                self.total_pack_cost = total_cost
                self.normalized_total_pack_cost = None
                self.save()

        pack_costs = {
            PACK_TOTAL_COST_KEY: total_cost,
            PACKAGING_COSTS_SUMMARY: packaging_cost_data,
            PACK_PACK_ITEM_COSTS_SUMMARY: pack_item_costs,
            FABRIC_FINANCING_COST_KEY: fabric_financing_costs,
            TRIM_FINANCING_COST_KEY: trim_financing_costs,
            BUYER_COMMISSION_COST_KEY: buyer_commission_cost,
            FABRIC_FINANCING_COST_PERCENTAGE_KEY: self.version.fabric_finance_cost_percentage,
            TRIM_FINANCING_COST_PERCENTAGE_KEY: self.version.trim_finance_cost_percentage,
            BUYER_COMMISSION_COST_PERCENTAGE_KEY: self.version.buyer_commission_percentage,
            PACK_ITEM_COST_DATA_KEY: pack_item_cost_data_list
        }
        return pack_costs

    def new_calculate_normalized_size_group_pack_costs(self):
        self.version.raise_exception_if_cannot_edit_request()
        grouped_packs = self.get_version_size_group_order_packs()
        cost = 0
        total_quantity = 0
        for grouped_pack in grouped_packs:
            pack_cost = grouped_pack.total_pack_cost
            if pack_cost:
                total_quantity += grouped_pack.cad_quantity
                cost = cost + (pack_cost * grouped_pack.cad_quantity)
            else:
                cost = None
                break

        if cost:
            normalized_cost = cost / total_quantity

            if normalized_cost:
                normalized_cost = '{0:.2f}'.format(normalized_cost)
                self.normalized_total_pack_cost = normalized_cost
                self.save()
                # grouped_packs.update(normalized_total_pack_cost=normalized_cost)

    def calculate_normalized_size_group_pack_cost(self):
        grouped_packs = self.get_version_size_group_order_packs()
        pack_costs = {}
        cost = 0
        total_quantity = 0
        for grouped_pack in grouped_packs:
            pack_cost_data = grouped_pack.calculate_pack_cost()
            pack_costs[grouped_pack.pk] = pack_cost_data
            pack_cost = pack_cost_data.get(PACK_TOTAL_COST_KEY, None)
            if pack_cost:
                total_quantity += grouped_pack.cad_quantity
                cost = cost + (pack_cost * grouped_pack.cad_quantity)
            else:
                cost = None
                break

        normalized_cost = None
        if cost:
            normalized_cost = cost / total_quantity

            if normalized_cost:
                normalized_cost = '{0:.2f}'.format(normalized_cost)
        pack_costs[NORMALIZED_COSTS_KEY] = normalized_cost
        return pack_costs

    def get_version_size_group_order_packs(self):
        size_group = self.get_pack_size_group()
        packs = OrderPack.objects.filter(
            colorway=self.colorway,
            country=self.country,
            size_id__in=size_group.sizes.all().values_list('id', flat=True),
            version=self.version
        )
        return packs

    def get_pack_ratio(self):
        quantity = self.cad_quantity
        packs = OrderPack.objects.filter(colorway=self.colorway, country=self.country)
        total = 0
        for pack in packs:
            if pack.cad_quantity:
                total += pack.cad_quantity
            else:
                total = None
                break
        ratio = 0
        if total:
            ratio = quantity / total
        return ratio

    def get_estimated_quantity(self):
        cw_country = get_object_or_none(OrderVersionColorwayCountry,{'version':self.version.id, 'country':self.country.id, 'colorway':self.colorway.id})   #OrderVersionColorwayCountry.objects.get(version=self.version, country=self.country, colorway=self.colorway)
        if not cw_country == None:
            total_quantity = cw_country.estimated_quantity
            ratio = self.get_pack_ratio()
            estimated_quantity = total_quantity * ratio
            estimated_quantity = math.ceil(estimated_quantity)
        else:
            estimated_quantity=None
        return estimated_quantity

    def get_pack_display(self):
        label = '%s - %s - %s %s' % (
            self.country.country.name,
            self.colorway.colorway,
            self.size.size.name, 
            'Pack'
        )
        return label

    def get_cost_summary(self):
        pack_items = self.get_pack_items()
        total_fabric_cost = 0
        fabric_cost = 0
        trim_cost = self.total_packaging_costs
        total_trim_cost = 0
        ie_operation_cost = 0
        services_cost = 0
        total_service_cost = 0
        total_ie_operation_cost = 0
        
        if self.normalized_total_pack_cost:
            for pack_item in pack_items:
                fabric_cost += pack_item.total_fabric_cost
                trim_cost += pack_item.total_sewing_trim_cost
                ie_operation_cost += pack_item.total_ie_operation_cost
                services_cost += pack_item.total_service_cost
                total_ie_operation_cost += pack_item.total_ie_operation_cost
            total_fabric_cost = fabric_cost + self.total_fabric_financing_cost
            total_trim_cost = trim_cost + self.total_trim_financing_cost
            total_service_cost = services_cost + self.total_service_financing_cost
            
        data = {
            'pack_normalized_total_cost': self.normalized_total_pack_cost,
            'fabric_cost_summary': {
                'fabric_cost': fabric_cost,
                'total_fabric_finance_cost': self.total_fabric_financing_cost,
                'total_fabric_cost': total_fabric_cost
            },
            'trim_cost_summary': {
                'trim_cost': trim_cost,
                'total_trim_finance_cost': self.total_trim_financing_cost,
                'total_trim_cost': total_trim_cost
            },
            'service_cost_summary': {
                'service_cost': services_cost,
                'total_service_finance_cost': self.total_service_financing_cost,
                'total_service_cost': total_service_cost
            },
            PACK_TOTAL_COST_KEY: self.total_pack_cost,
            BUYER_COMMISSION_COST_KEY: self.buyer_commission_cost,
            FABRIC_FINANCING_COST_PERCENTAGE_KEY: self.version.fabric_finance_cost_percentage,
            TRIM_FINANCING_COST_PERCENTAGE_KEY: self.version.trim_finance_cost_percentage,
            SERVICE_FINANCING_COST_PERCENTAGE_KEY: self.version.service_finance_cost_percentage,
            BUYER_COMMISSION_COST_PERCENTAGE_KEY: self.version.buyer_commission_percentage,
            TOTAL_OTHER_COST_KEY: self.total_other_costs,
            TOTAL_IE_OPERATION_COST_KEY: total_ie_operation_cost       
        }
        return data

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('size', 'colorway', 'country', 'version',),
                name='unique_pack_size_colorway_country'
            )
        ]


class OrderPackItem(BaseAbstractModel):
    pack = models.ForeignKey(OrderPack, on_delete=models.CASCADE)
    item = models.ForeignKey(OrderItem, on_delete=models.CASCADE)
    reviewed = models.BooleanField(default=False)
    consumption_data_reviewed = models.BooleanField(default=False)
    fabric_consumption_data_reviewed = models.BooleanField(default=False)
    fabric_finance_cost_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    trim_finance_cost_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    earnings_per_minute = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    buyer_commission_percentage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    # calculated fields
    total_fabric_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_sewing_trim_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_ie_operation_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_service_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_service_financing_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    pack_item_fabric_financing_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    pack_item_trim_financing_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    pack_item_service_financing_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_pack_item_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    total_pack_item_normalized_cost = models.DecimalField(null=True, decimal_places=4, max_digits=8)

    def get_pack_item_cost_summary(self):
        fabric_cost = {
            'cost': self.total_fabric_cost,
            'finance_cost': self.pack_item_fabric_financing_cost,
            'total_cost': add_nums_or_none([self.total_fabric_cost, self.pack_item_fabric_financing_cost])
        }
        trim_cost = {
            'cost': self.total_sewing_trim_cost,
            'finance_cost': self.pack_item_trim_financing_cost,
            'total_cost': add_nums_or_none([self.total_sewing_trim_cost, self.pack_item_trim_financing_cost])
        }
        cost_summary = {
            'total_fabric_cost': fabric_cost,
            'total_trim_cost': trim_cost,
            'total_ie_operation_cost': self.total_ie_operation_cost,
            'total_service_cost': self.total_service_cost,
            'total_pack_item_cost': self.total_pack_item_cost,
            'total_pack_item_normalized_cost': self.total_pack_item_normalized_cost,
        }
        return cost_summary

    def get_pack_item_display(self):
        label = '%s - %s' % (
            self.pack.get_pack_display(),
            self.item.item_display
        )

        cw_type = self.get_order_pack_item_colorway_type()
        if cw_type:
            label += ' (%s)' % cw_type.colorway_category.name
        return label

    def get_order_pack_item_colorway_type(self):
        pack_item_cw_type = None
        try:
            pack_item_cw_type = ColorwayItemType.objects.get(item=self.item, colorway=self.pack.colorway)
        except ObjectDoesNotExist:
            pass
        return pack_item_cw_type

    def get_pack_item_placements(self):
        placements = self.orderpackitemplacement_set.all().prefetch_related(
            'orderpackitemplacementmaterial',
            'orderpackitemplacementmaterial__orderpackitemplacementmaterialconsumption'
        )
        return placements

    def get_pack_item_placement_materials_by_material_type(self, material_type):
        placements = OrderPackItemPlacementMaterial.objects.filter(
            # item_attribute_other__material=material_type
            material__material_detail__generic_material__user_material=material_type,
            placement__order_pack_item=self
        ).prefetch_related(
            'placement',
            'orderpackitemplacementmaterialconsumption'
        )
        return placements

    def get_pack_item_placements_from_material_type(self, material_type):
        placements = self.orderpackitemplacement_set.filter(item_attribute_other__material=material_type).prefetch_related(
            'orderpackitemplacementmaterial',
            'orderpackitemplacementmaterial__orderpackitemplacementmaterialconsumption'
        )
        return placements

    def placements_have_consumption_data_exclude_fabrics(self):
        placements = self.get_pack_item_placements().exclude(Q(item_attribute_other__type=Material.FABRIC_MATERIAL))
        have_data = True
        for placement in placements:
            try:
                consumption_object = placement.orderpackitemplacementmaterial.orderpackitemplacementmaterialconsumption

                if not consumption_object.validate_consumption_object():
                    have_data = False
            except ObjectDoesNotExist:
                have_data = False

            if not have_data:
                break
        return have_data

    def get_pack_item_materials(self, material_type):
        pack_item_materials = OrderPackItemPlacementMaterial.objects.filter(placement__order_pack_item=self)

        if material_type:
            pack_item_materials = pack_item_materials.filter(
                Q(material__material_detail__generic_material__user_material__name=material_type)
            )

        pack_item_material_ids = pack_item_materials.values('material_id').distinct()
        data = get_material_details(pack_item_material_ids)
        return data

    def get_pack_item_placement_consumption_ratios(self):
        consumption_ratios = OrderPackItemPlacementMaterialConsumption.objects.filter(
            pack_item_placement_material__placement__order_pack_item=self
        )
        return consumption_ratios

    def get_pack_items(self):
        packs = self.pack.get_version_size_group_order_packs()
        pack_items = OrderPackItem.objects.filter(
            pack_id__in=packs.values_list('id', flat=True),
            item=self.item
        )
        return pack_items

    # def calculate_normalized_size_group_pack_item_cost(self): This was the old way calculated it. Commented out on 4/26/2025. The issue with this is it is computation heavy.
    #     pack_items = self.get_pack_items()
    #     total_quantity = 0
    #     normalized_cost = 0
    #     for pack_item in pack_items:
    #         cost_data = pack_item.calculate_pack_item_cost()
    #         cost = cost_data.get(PACK_ITEM_TOTAL_COST_KEY, None)
    #         cad_quantity = pack_item.pack.cad_quantity
    #         if cost:
    #             normalized_cost = normalized_cost + (cost * cad_quantity)
    #             total_quantity += cad_quantity
    #         else:
    #             normalized_cost = None
    #             break
    #     if normalized_cost:
    #         normalized_cost = (normalized_cost/total_quantity)
    #         normalized_cost = round_float_to_decimal_places(normalized_cost, 2)
    #     return normalized_cost

    def get_consolidated_colorway_operations(self):
        operations =self.get_colorway_item_operations()
        epm = self.pack.version.get_version_earnings_per_minute(self)
        epm_total = 0
        epm_names = []
        for operation in operations:
            epm_names.append(operation.operation_name)
            if epm_total is not None and epm is not None and operation.costing_smv is not None:
                epm_total += epm * operation.costing_smv

        data = {'earnings_per_minute': epm, 'operation_cost': epm_total, 'operation_name': ', '.join(epm_names)}
        return data

    def get_colorway_item_operations(self):
        operations = OrderItemColorwayOperation.objects.filter(
            colorway_item_category__item=self.item,
            colorway_item_category__colorway=self.pack.colorway,
            active=True,
            version=self.pack.version
        )
        return operations

    def get_pack_item_services(self):
        return self.packitemservice_set.all()

    def calculate_pack_item_service_cost(self):
        services = self.get_pack_item_services()
        service_cost = 0
        service_data = []
        for service in services:
            item_service_inquiry_detail = service.get_pack_item_service_selected_supplier_inquiry_detail()

            if item_service_inquiry_detail:

                supplier_inquiry_detail = item_service_inquiry_detail.supplier_inquiry_detail

                if supplier_inquiry_detail.cost_per_unit:
                    service_cost += round_float_to_decimal_places(supplier_inquiry_detail.cost_per_unit, SERVICE_COSTS_ROUNDING_DECIMAL_PLACES)
                    service_cost = round_float_to_decimal_places(service_cost, SERVICE_COSTS_ROUNDING_DECIMAL_PLACES)
                else:
                    service_cost = None
                    break
            else:
                service_cost = None # If supplier inquiry detail not selected for at least one service set cost to none
                break
            service_data.append({
                'supplier_inquiry_detail_id': item_service_inquiry_detail.pk,
                'service_attributes': service.get_attributes(),
                'cost_per_unit': round_float_to_decimal_places(supplier_inquiry_detail.cost_per_unit, SERVICE_COSTS_ROUNDING_DECIMAL_PLACES)
            })
        data = {
            'total_cost': service_cost,
            'service_cost_data': service_data
        }
        return data

    def calculate_material_costs(self):
        placements = self.get_pack_item_placements().prefetch_related(
            'orderpackitemplacementmaterial',
            'orderpackitemplacementmaterial__orderpackitemplacementmaterialconsumption'
        )
        processed_fabrics_customer_brand_material_ids = []
        fabric_financing_costs = 0
        trim_financing_costs = 0
        cost = 0

        for placement in placements:
            try:
                placement_material = placement.orderpackitemplacementmaterial
                colorway_supplier_inquiry = self.pack.get_selected_supplier_inquiry_for_material(placement_material.material)

                if not colorway_supplier_inquiry:
                    return {}
                consumption_ratio = placement.get_placement_material_consumption(colorway_supplier_inquiry.supplier_inquiry_detail)

                if not consumption_ratio:
                    cost = None
                    break  # If a supplier inquiry is not selected for any material in the order the cost returns as None

                # Since consumption ratios are combined for fabrics you only calculate it once
                if placement.get_placement_material_type() == Material.FABRIC_MATERIAL:
                    if placement_material.material_id in processed_fabrics_customer_brand_material_ids:
                        continue
                    processed_fabrics_customer_brand_material_ids.append(placement_material.material_id)
                cost_value = round_float_to_decimal_places(consumption_ratio.calculate_cost_for_supplier_inquiry( colorway_supplier_inquiry.supplier_inquiry_detail), MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
                cost += cost_value

                if placement.placement_material_type == Material.FABRIC_MATERIAL:
                    fabric_financing_costs += cost_value
                    fabric_financing_costs = round_float_to_decimal_places(fabric_financing_costs, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
                else:
                    trim_financing_costs += cost_value
                    trim_financing_costs = round_float_to_decimal_places(trim_financing_costs, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)

            except ObjectDoesNotExist:
                cost = None
                fabric_financing_costs = None
                trim_financing_costs = None
                break
        data = {
            MATERIAL_COSTS_KEY: cost,
            FABRICS_COSTS_KEY: fabric_financing_costs,
            TRIMS_COSTS_KEY: trim_financing_costs,
        }
        return data

    def calculate_ie_operation_cost(self):
        earnings_per_minute = round_float_to_decimal_places(self.pack.version.get_version_earnings_per_minute(self), IE_OPERATION_ROUNDING_DECIMAL_PLACES)
        data = []
        smv_cost = None
        total_smv_minutes = None
        if earnings_per_minute:
            operations = self.get_colorway_item_operations()
            smv_cost = 0
            total_smv_minutes = 0
            for operation in operations:
                if operation.costing_smv is not None and earnings_per_minute is not None:
                    operation_costing_smv = round_float_to_decimal_places(operation.costing_smv, 4)
                    smv_cost += (operation_costing_smv * earnings_per_minute)
                    total_smv_minutes += operation_costing_smv
                else:
                    smv_cost = None
                    total_smv_minutes = None
                    break
                data.append({
                    **operation.get_attributes(),
                    'smv_cost': smv_cost,
                })

        if not is_none(smv_cost):
            smv_cost = round_float_to_decimal_places(smv_cost, IE_OPERATION_ROUNDING_DECIMAL_PLACES)
        data = {
            'earnings_per_minute': earnings_per_minute,
            'operation_data': data,
            'total_cost': smv_cost,
            'total_costing_smv': total_smv_minutes,
        }
        return data

    def reset_pack_item_costs(self):
        self.pack.version.raise_exception_if_cannot_edit_request() # Don't remove this. It will raise an exception if request is not in an editable state

        self.total_fabric_cost = None
        self.total_sewing_trim_cost = None
        self.total_ie_operation_cost = None
        self.total_service_cost = None
        self.pack_item_fabric_financing_cost = None
        self.pack_item_trim_financing_cost = None
        self.total_pack_item_cost = None
        self.total_pack_item_normalized_cost = None
        self.save()

    def calculate_pack_item_cost(self, set_pack_item_costs=False):
        self.pack.version.raise_exception_if_cannot_edit_request()
        material_costs = self.calculate_material_costs()
        pack_item_costs = {**material_costs}
        cost = material_costs.get(MATERIAL_COSTS_KEY, None)

        service_cost_data = self.calculate_pack_item_service_cost()
        service_cost = service_cost_data['total_cost']
        pack_item_costs[PACK_ITEM_SERVICE_COST_SUMMARY_KEY] = service_cost_data

        pack_item_costs[PACK_ITEM_SERVICE_COST_KEY] = service_cost
        if service_cost is not None and cost is not None: # needed because it could be 0
            cost += service_cost
        else:
            cost = None

        fabric_financing_percentage = self.pack.version.get_version_fabric_financing_percentage(self)
        trim_financing_percentage = self.pack.version.get_version_trim_financing_percentage(self)
        service_financing_percentage = self.pack.version.get_version_service_financing_percentage(self)

        smv_cost = None
        if cost and cost > 0:
            smv_cost_data = self.calculate_ie_operation_cost()
            pack_item_costs[PACK_ITEM_IE_OPERATION_COST_KEY] = smv_cost_data
            smv_cost = smv_cost_data['total_cost']
            if smv_cost != None:
                cost += smv_cost
            else:
                cost = None

        fabric_financing_cost = None
        trim_financing_cost = None
        service_financing_cost = None
        if cost:
            fabric_costs = material_costs[FABRICS_COSTS_KEY]
            trim_costs = material_costs[TRIMS_COSTS_KEY]
            cost = round_float_to_decimal_places(cost, TOTAL_COST_ROUNDING_DECIMAL_PLACES)
            fabric_financing_cost = fabric_costs * decimal.Decimal(fabric_financing_percentage/100)
            trim_financing_cost = trim_costs * decimal.Decimal(trim_financing_percentage/100)
            service_financing_cost = service_cost * decimal.Decimal(service_financing_percentage/100)
            fabric_financing_cost = round_float_to_decimal_places(fabric_financing_cost, TOTAL_COST_ROUNDING_DECIMAL_PLACES)
            trim_financing_cost = round_float_to_decimal_places(trim_financing_cost, TOTAL_COST_ROUNDING_DECIMAL_PLACES)
            service_financing_cost = round_float_to_decimal_places(service_financing_cost, TOTAL_COST_ROUNDING_DECIMAL_PLACES)
            cost = cost + fabric_financing_cost + trim_financing_cost + service_financing_cost

            if set_pack_item_costs and cost:
                self.total_fabric_cost = fabric_costs
                self.total_sewing_trim_cost = trim_costs
                self.total_ie_operation_cost = smv_cost
                self.total_service_cost = service_cost
                self.pack_item_fabric_financing_cost = fabric_financing_cost
                self.pack_item_trim_financing_cost = trim_financing_cost
                self.total_pack_item_cost = cost
                self.total_pack_item_normalized_cost = None
                self.save()
        pack_item_costs[FABRIC_FINANCING_COST_KEY] = fabric_financing_cost
        pack_item_costs[TRIM_FINANCING_COST_KEY] = trim_financing_cost
        pack_item_costs[SERVICE_FINANCING_COST_KEY] = service_financing_cost
        pack_item_costs[PACK_ITEM_TOTAL_COST_KEY] = cost
        return pack_item_costs

    def validate_fabrics_consumption_ratio(self):
        fabrics = self.get_pack_item_materials(Material.FABRIC_MATERIAL).pop(Material.FABRIC_MATERIAL, {})
        processed_fabrics = []
        valid = True
        for fabric in fabrics:
            fabric_id = fabric.get('customer_brand_material_id', None)
            if fabric_id and fabric_id not in processed_fabrics:
                processed_fabrics.append(fabric_id)
                material_inquiries = self.pack.version.get_version_supplier_inquiries().filter(
                    version=self.pack.version,
                    customer_brand_material=fabric_id,
                )

                material_inquiry_details = SupplierInquiryDetail.objects.filter(supplier_inquiry__in=material_inquiries, completed=True)

                ratios = ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio.objects.filter(
                    version=self.pack.version,
                    customer_brand_fabric=fabric_id,
                    supplier_inquiry_detail_id__in=material_inquiry_details,
                    order_size_group=self.pack.get_pack_size_group(),
                    order_country=self.pack.country,
                    order_colorway=self.pack.colorway,
                    colorway_category=self.get_order_pack_item_colorway_type().colorway_category,
                    item=self.item.item
                )

                if not ratios.exists():
                    valid = False

                for ratio in ratios:
                    if not ratio.validate_consumption_object():
                        valid = False
                if not valid:
                    break
        return valid

    @staticmethod
    def get_pack_items_materials(order_pack_items, material_type=None):
        materials = OrderPackItemPlacementMaterial.objects.filter(placement__order_pack_item__in=order_pack_items)
        if material_type:
            materials = materials.filter(material__material_detail__generic_material__user_material__name=material_type)
        customer_brand_material_ids = materials.values_list('material_id', flat=True)
        materials = CustomerBrandMaterial.objects.filter(pk__in=customer_brand_material_ids)
        return materials.distinct()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('pack', 'item'),
                name='unique_pack_item'
            )
        ]


class OrderPlacement(BaseAbstractModel):
    name = models.CharField(max_length=500)
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, null=True)
    PLACEMENT_TYPES = MATERIAL_TYPES
    type = models.CharField(max_length=300) # Whether its a fabric etc
    assign_type = models.CharField(max_length=50, default=ItemAttribute.ORDER_PACK_ITEM, choices=ItemAttribute.PLACEMENT_ASSIGN_TYPE_OPTIONS)
    material = models.ForeignKey(UserDefinedMaterial, on_delete=models.SET_NULL, null=True)
    item_attribute = models.ForeignKey(ItemAttribute, on_delete=models.SET_NULL, null=True)
    estimated_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    estimated_consumption_ratio_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)


class AbstractOrderPlacement(BaseAbstractModel):
    # item_attribute = models.ForeignKey(ItemAttribute, on_delete=models.CASCADE, null=True)
    item_attribute_other = models.ForeignKey(OrderPlacement, on_delete=models.CASCADE, null=True)
    placement_name = models.CharField(max_length=500, null=True) # this is a copy of OrderPlacement's name
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)
    estimated_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    estimated_consumption_ratio_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    PLACEMENT_PK_KEY = '' # Defined in child class
    ITEM_ATTRIBUTE_MATERIAL_TYPE_KEY = 'placement_material_type'
    ITEM_ATTRIBUTE_KEY = 'placement'
    ITEM_ATTRIBUTE_ID_KEY = 'placement_id'
    ITEM_ATTRIBUTE_OTHER_ID_KEY = 'placement_other_id'
    PLACEMENT_ID_KEY = 'placement_id'
    PLACEMENT_DETAILS_KEY = 'placement_details'
    PLACEMENT_MATERIAL_DETAILS_KEY = 'placement_material_details'

    def get_placement_material_type(self):
        return self.item_attribute_other.type

    @property
    def placement_material_type(self):
        return self.get_placement_material_type()

    def get_placement_details(self):
        data = {
            self.PLACEMENT_PK_KEY: self.pk,
            self.ITEM_ATTRIBUTE_MATERIAL_TYPE_KEY: self.get_placement_material_type(),
            self.ITEM_ATTRIBUTE_KEY: self.item_attribute_other.name,
            self.ITEM_ATTRIBUTE_OTHER_ID_KEY: self.item_attribute_other_id,
        }
        return data

    @abstractmethod
    def get_placement_material_object(self):
        ...

    @abstractmethod
    def get_order_pack(self):
        ...

    def get_complete_placement_details(self):
        data = {self.PLACEMENT_DETAILS_KEY: self.get_placement_details()}
        material_object = self.get_placement_material_object()
        if material_object:
            material_object_details = material_object.get_placement_material_details()
            material_object_material_details = material_object_details.pop(AbstractOrderMaterialPlacement.MATERIAL_DETAILS_KEY)
            data[self.PLACEMENT_MATERIAL_DETAILS_KEY] = {**material_object_details, **material_object_material_details}
        return data

    class Meta:
        abstract = True # DO NOT REMOVE THIS


class OrderPackItemPlacement(AbstractOrderPlacement):
    order_pack_item = models.ForeignKey(OrderPackItem, on_delete=models.CASCADE)

    PLACEMENT_PK_KEY = 'pack_item_placement_id' # Used in abstract class

    def get_material_consumption_object(self):
        try:
            consumption_object = self.orderpackitemplacementmaterial.orderpackitemplacementmaterialconsumption
        except: # TODO minor - handle this exception
            consumption_object = None
        return consumption_object

    def get_placement_material_consumption(self, supplier_inquiry_detail):
        if self.get_placement_material_type() == Material.FABRIC_MATERIAL:
            consumption_object = self.orderpackitemplacementmaterial.get_order_item_fabric_costing_consumption(supplier_inquiry_detail)
        else:
            consumption_object = self.get_material_consumption_object()
        return consumption_object

    def get_placement_material_object(self):
        material_object = None
        if hasattr(self, 'orderpackitemplacementmaterial'):
            material_object = self.orderpackitemplacementmaterial
        return material_object

    def get_item_placement_pattern(self):
        pattern = []
        try:
            pattern_id = self.orderpackitemplacementpattern.id
            if self.orderpackitemplacementpattern.pattern_url is not None and self.orderpackitemplacementpattern.pattern_url.file_path is not None:
                pattern_url = self.orderpackitemplacementpattern.pattern_url.id
                file_path = self.orderpackitemplacementpattern.pattern_url.file_path
            else:
                pattern_url = None
                file_path = None
            pattern = {
                'pattern_id':pattern_id,
                'attachment_id':pattern_url,
                'pattern_url':file_path
            }
            return pattern
        except ObjectDoesNotExist:
            return None

    def get_order_pack(self):
        return self.order_pack_item.pack


class OrderPackPlacement(AbstractOrderPlacement):
    order_pack = models.ForeignKey(OrderPack, on_delete=models.CASCADE)

    PLACEMENT_PK_KEY = 'pack_placement_id' # Used in abstract class

    def get_placement_material_consumption(self, inquiry=None):
        try:
            consumption_object = self.orderpackplacementmaterial.orderpackplacementmaterialconsumption
        except:
            consumption_object = None
        return consumption_object

    def get_placement_material_object(self):
        material_object = None
        if hasattr(self, 'orderpackplacementmaterial'):
            material_object = self.orderpackplacementmaterial
        return material_object

    def get_order_pack(self):
        return self.order_pack


class OrderPackItemPlacementPattern(BaseAbstractModel):
    order_pack_item_placement = models.OneToOneField('OrderPackItemPlacement', on_delete=models.CASCADE)
    pattern_url = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)


class AbstractOrderMaterialPlacement(BaseAbstractModel):
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.SET_NULL, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    CUSTOMER_BRAND_MATERIAL_ID_KEY = 'customer_brand_material_id' # TODO -this needs to be changed
    CUSTOMER_BRAND_MATERIAL_KEY = 'customer_brand_material'
    PK_PLACEMENT_MATERIAL_ID_KEY = 'order_placement_material_id'
    MATERIAL_DETAILS_KEY = 'material_details'

    def get_placement_material_details(self):
        data = {self.PK_PLACEMENT_MATERIAL_ID_KEY, self.pk}

        if self.material:
            data[self.MATERIAL_DETAILS_KEY] = self.material.get_customer_brand_material_details()

        return data

    class Meta:
        abstract = True # DO NOT REMOVE THIS


class OrderPackItemPlacementMaterial(AbstractOrderMaterialPlacement):
    placement = models.OneToOneField(OrderPackItemPlacement, on_delete=models.CASCADE)

    # material = models.ForeignKey(OrderMaterial, on_delete=models.CASCADE, null=True)
    # variation_id = models.IntegerField(null=True)

    def get_order_item_fabric_costing_consumption(self, supplier_inquiry_detail):
        order_pack_item = self.placement.order_pack_item
        customer_brand_fabric = self.material
        colorway_type = order_pack_item.get_order_pack_item_colorway_type()
        size_group = order_pack_item.pack.get_pack_size_group()
        consumption_ratio = ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio.get_consumption_ratio_for_fabric_or_none(
            version=order_pack_item.pack.version,
            customer_brand_fabric=customer_brand_fabric,
            supplier_inquiry_detail=supplier_inquiry_detail,
            order_size_group=size_group,
            order_country=order_pack_item.pack.country,
            order_colorway=order_pack_item.pack.colorway,
            colorway_category=colorway_type.colorway_category,
            item=order_pack_item.item.item
        )
        return consumption_ratio


class OrderPackPlacementMaterial(AbstractOrderMaterialPlacement):
    placement = models.OneToOneField(OrderPackPlacement, on_delete=models.CASCADE)


class AbstractOrderPlacementMaterialConsumption(BaseAbstractModel):
    # If material is a fabric consumption ratios are stored in the PackItemFabricConsumptionRatio model
    costing_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    # manufacturing_consumption_ratio = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    # costing_wastage = models.DecimalField(null=True, decimal_places=4, max_digits=8)
    wastage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    attachments = models.ManyToManyField(FileAttachment)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    COSTING_CONSUMPTION_RATIO_KEY = 'costing_consumption_ratio'
    WASTAGE_KEY = 'wastage'
    PLACEMENT_SUPPLIER_INQUIRY_TOTAL_COST = 'total'
    ATTACHMENTS_KEY = 'attachments'

    def get_consumption_and_wastage_combination(self):
        ratio_total = get_consumption_and_wastage_combination(self.wastage, self.costing_consumption_ratio)
        return ratio_total

    def calculate_cost_for_supplier_inquiry(self, supplier_inquiry_detail):
        cost = None
        ratio_total = self.get_consumption_and_wastage_combination()
        if ratio_total != 0 and supplier_inquiry_detail.cost_per_unit:
            cost = ratio_total * supplier_inquiry_detail.cost_per_unit

            consumption_measurement_unit = supplier_inquiry_detail.supplier_inquiry.customer_brand_material.material_detail.generic_material.user_material.consumption_measurement_unit

            if consumption_measurement_unit == MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION:
                unithelper = MaterialUnitHelper()
                unit_conversion = unithelper.convert_per_unit_to_unit(supplier_inquiry_detail.costing_unit)
                unit_conversion_amount = unithelper.get_meter_conversion_amount(unit_conversion)
                cost = (cost / decimal.Decimal(unit_conversion_amount))
            elif consumption_measurement_unit == MaterialUnitHelper.PIECES_UNIT_OPTION:
                cost = cost # Nothing needs to be done
            else:
                raise Exception("Measurement unit not specified") # TODO minor - add custom exception here
        if cost:
            cost = round_float_to_decimal_places(cost, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
        return cost

    def validate_consumption_object(self):
        pack_items_consumption_data_valid = True
        if self.wastage is None or self.costing_consumption_ratio is None:
            pack_items_consumption_data_valid = False
        # TODO - can wastage be  0?
        elif self.wastage < 0 or self.costing_consumption_ratio <= 0:
            pack_items_consumption_data_valid = False
        return pack_items_consumption_data_valid

    class Meta:
        abstract = True # DO NOT REMOVE/ CHANGE THIS


class OrderPackItemPlacementMaterialConsumption(AbstractOrderPlacementMaterialConsumption):
    pack_item_placement_material = models.OneToOneField(OrderPackItemPlacementMaterial, on_delete=models.CASCADE)


class OrderPackPlacementMaterialConsumption(AbstractOrderPlacementMaterialConsumption):
    pack_placement_material = models.OneToOneField(OrderPackPlacementMaterial, on_delete=models.CASCADE)


# TODO - this model is not needed any more
class PackItemFabricConsumptionRatio(AbstractOrderMaterialPlacement):
    pack_item = models.ForeignKey(OrderPackItem, on_delete=models.CASCADE)
    # fabric_variation = models.ForeignKey(FabricVariation, null=True, on_delete=models.CASCADE)
    supplier_inquiry = models.ForeignKey(SupplierInquiry, on_delete=models.CASCADE)
    costing_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    wastage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    manufacturing_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)


class AbstractFabricConsumptionRatio(AbstractOrderPlacementMaterialConsumption):
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    customer_brand_fabric = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE) # TODO - remove this, because it is there in supplier inquiry
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.CASCADE)

    class Meta:
        abstract = True # DO NOT REMOVE/ CHANGE THIS


class ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio(AbstractFabricConsumptionRatio): #1
    order_size_group = models.ForeignKey(OrderSizeGroup, on_delete=models.CASCADE)
    order_country = models.ForeignKey(OrderCountry, on_delete=models.CASCADE)
    order_colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    colorway_category = models.ForeignKey(ColorwayCategory, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)

    @staticmethod
    def get_consumption_ratio_for_fabric_or_none(version, supplier_inquiry_detail, customer_brand_fabric, order_country, order_colorway, order_size_group, colorway_category, item):
        try:
            consumption_object = ItemCountryCwCwyCategorySizeGroupFabricConsumptionRatio.objects.get(
                version=version,
                supplier_inquiry_detail=supplier_inquiry_detail,
                customer_brand_fabric=customer_brand_fabric,
                order_country=order_country,
                order_colorway=order_colorway,
                order_size_group=order_size_group,
                colorway_category=colorway_category,
                item=item
            )
        except ObjectDoesNotExist:
            consumption_object = None

        return consumption_object
    
    #TODO Add Constraint
    # version=version,
    # supplier_inquiry_detail=supplier_inquiry_detail,
    # customer_brand_fabric=customer_brand_fabric,
    # order_country=order_country,
    # order_colorway=order_colorway,
    # order_size_group=order_size_group,
    #colorway_category=colorway_category,
    #item=item


class ItemColorwayColorwayCategoryFabricConsumptionRatio(AbstractFabricConsumptionRatio):#2
    order_colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    colorway_category = models.ForeignKey(ColorwayCategory, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)


class ItemColorwayCategoryFabricConsumptionRatio(AbstractFabricConsumptionRatio): #3
    colorway_category = models.ForeignKey(ColorwayCategory, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)


# Model to store if all fabrics for item, cw, cw type are complete
class ItemColorwayCategoryFabricConsumptionComplete(BaseAbstractModel):
    order_colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    colorway_category = models.ForeignKey(ColorwayCategory, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    fabric_consumption_data_reviewed = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('order_colorway', 'colorway_category', 'item', 'version',),
                name='unique_order_colorway_cw_type_item_version'
            )
        ]


# Model to store if all fabrics for item, cw type are complete
class ItemColorwayTypeFabricConsumptionComplete(BaseAbstractModel):
    colorway_category = models.ForeignKey(ColorwayCategory, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    fabric_consumption_data_reviewed = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('colorway_category', 'item', 'version',),
                name='unique_order_cw_type_item_version'
            )
        ]


# This is to save which supplier a material will be ordered from
class OrderCostingColorwayMaterialSupplierInquiry(BaseAbstractModel):
    order_costing_version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    customer_brand_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
    colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE)
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.CASCADE, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)


class OrderCostingServiceSupplierInquiry(BaseAbstractModel):
    order_costing_version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    item_service = models.ForeignKey('marketing.PackItemService', on_delete=models.CASCADE)
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.CASCADE, null=True)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)


class OtherCostType(BaseAbstractModel):
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    name = models.CharField(max_length=1000)
    other_cost = models.ForeignKey(OtherCost, null=True, on_delete=models.SET_NULL)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)


class OrderPackOtherCost(BaseAbstractModel):
    pack = models.ForeignKey(OrderPack, on_delete=models.CASCADE)
    other_cost_type = models.ForeignKey(OtherCostType, on_delete=models.SET_NULL, null=True)
    cost = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    other_cost_type_name = models.CharField(max_length=300)
    copied_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('pack', 'other_cost_type'),
                name='unique_pack_other_cost_type'
            )
        ]


class PackItemService(BaseAbstractModel):
    pack_item = models.ForeignKey(OrderPackItem, on_delete=models.CASCADE)
    EMBROIDERY_SERVICE_TYPE = 'embroidery_service'
    PRINT_SERVICE_TYPE = 'print_service'
    WASH_SERVICE_TYPE = 'wash_service'
    EMBELLISHMENT_SERVICE_TYPE = 'embellishment_service'

    SERVICE_TYPE_CHOICES = (
        (EMBROIDERY_SERVICE_TYPE, 'Embroidery Service'),
        (EMBELLISHMENT_SERVICE_TYPE, 'Embellishment Service'),
        (PRINT_SERVICE_TYPE, 'Print Service'),
        (WASH_SERVICE_TYPE, 'Wash Service'),
    )

    service_type = models.CharField(max_length=500, choices=SERVICE_TYPE_CHOICES)
    copied_from = models.ForeignKey('self', null=True, on_delete=models.SET_NULL)

    SERVICE_TYPE_KEY = 'service_type'
    PK_SERVICE_ID = 'service_id'
    PACK_ITEM_KEY = 'pack_item_id'

    def get_service_object(self):
        object = None
        if self.service_type == self.EMBELLISHMENT_SERVICE_TYPE:
            object = getattr(self, 'packitemembellishmentservice', None)
        elif self.service_type == self.WASH_SERVICE_TYPE:
            object = getattr(self, 'packitemwashservice', None)
        return object

    def get_attributes(self):
        object = self.get_service_object()
        attributes = {}
        if object:
            attributes = object.get_attributes()
            attributes[self.PK_SERVICE_ID] = object.pk
            attributes[self.PACK_ITEM_KEY] = object.pack_item_id
            attributes[self.SERVICE_TYPE_KEY] = {
                'value': self.service_type,
                'display_value': self.get_service_type_display(),
            }
        return attributes

    def get_service_suppliers(self):
        inquiries = self.pack_item.pack.version.get_version_supplier_inquiries().filter(item_service=self)
        inquiry_data = []
        for inquiry in inquiries:
            inquiry_details = inquiry.supplierinquirydetail_set.all()
            for inquiry_detail in inquiry_details:
                inquiry_data.append(inquiry_detail.get_attributes())
        return inquiry_data

    def get_pack_item_service_selected_supplier_inquiry_detail(self):
        object = get_object_or_none(OrderCostingServiceSupplierInquiry, {'order_costing_version': self.pack_item.pack.version, 'item_service': self})
        return object


class PackItemWashService(PackItemService):
    # pack_item = models.ForeignKey(OrderPackItem, on_delete=models.CASCADE)
    technique = models.CharField(max_length=1500)
    wash_service_attachment = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True, default=None)

    WASH_TECHNIQUE_KEY = 'technique'
    SIZE_KEY = 'pack_item_size'
    COLORWAY_KEY = 'pack_item_colorway'
    COUNTRY_KEY = 'pack_item_country'

    def __init__(self, *args, **kwargs):
        self._meta.get_field('service_type').default = PackItemService.WASH_SERVICE_TYPE
        super(PackItemService, self).__init__(*args, **kwargs)

    def get_attributes(self):
        data = {
            self.WASH_TECHNIQUE_KEY: self.technique,
        }
        return data


class EmbellishmentServiceDetail(BaseAbstractModel):
    version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    sub_type = models.ForeignKey(EmbellishmentSubType, on_delete=models.DO_NOTHING)
    grading = models.BooleanField(default=False, null=True)
    embellishment_attachment = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True, default=None)
    copied_from = models.ForeignKey('self', null=True, on_delete=models.SET_NULL)

    PK_EMBELLISHMENT_SERVICE_DETAIL_ID_KEY = 'embellishment_detail_id'
    EMBELLISHMENT_TYPE_KEY = 'type'
    EMBELLISHMENT_TYPE_ID_KEY = 'type_id'
    EMBELLISHMENT_SUB_TYPE_KEY = 'sub_type'
    EMBELLISHMENT_SUB_TYPE_ID_KEY = 'sub_type_id'
    EMBELLISHMENT_GRADING_KEY = 'grading'
    EMBELLISHMENT_ATTACHMENT_KEY = 'embellishment_attachment'

    def get_attributes(self):
        data = {
            self.PK_EMBELLISHMENT_SERVICE_DETAIL_ID_KEY: self.pk,
            self.EMBELLISHMENT_TYPE_KEY: self.sub_type.embellishment_type.name,
            self.EMBELLISHMENT_TYPE_ID_KEY: self.sub_type.embellishment_type_id,
            self.EMBELLISHMENT_SUB_TYPE_KEY: self.sub_type.name,
            self.EMBELLISHMENT_SUB_TYPE_ID_KEY: self.sub_type_id,
            self.EMBELLISHMENT_GRADING_KEY: self.grading,
            self.EMBELLISHMENT_ATTACHMENT_KEY: self.embellishment_attachment.get_object_data() if self.embellishment_attachment else {},
        }
        return data


class PackItemEmbellishmentService(PackItemService):
    embellishment_detail = models.ForeignKey(EmbellishmentServiceDetail, on_delete=models.CASCADE)
    size = models.CharField(max_length=100)
    pack_item_embellishment_attachment = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True, default=None)

    EMBELLISHMENT_SIZE_KEY = 'size'
    PACK_ITEM_EMBELLISHMENT_ATTACHMENT_KEY = 'pack_item_embellishment_attachment'

    def get_attributes(self):
        data = {
            **self.embellishment_detail.get_attributes(),
            self.EMBELLISHMENT_SIZE_KEY: self.size,
            self.PACK_ITEM_EMBELLISHMENT_ATTACHMENT_KEY: self.pack_item_embellishment_attachment.get_object_data() if self.pack_item_embellishment_attachment else {}
        }
        return data

    def __init__(self, *args, **kwargs):
        self._meta.get_field('service_type').default = PackItemService.EMBELLISHMENT_SERVICE_TYPE
        super(PackItemService, self).__init__(*args, **kwargs)


class UploadedPurchaseOrder(BaseAbstractModel):
    attachment = models.ForeignKey(FileAttachment, on_delete=models.CASCADE)
    clubbing_complete = models.BooleanField(default=False)


####### PurchaseOrder Related models ########
class PurchaseOrder(BaseAbstractModel, PurchaseOrderModelMixin):
    ritz_code = models.CharField(max_length=2000, null=True)
    costing_version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=300, null=True)

    OPEN = 'open'
    PENDING_PRECOSTING_COMPLETION = 'pending_precosting_completion'
    CLOSE = 'close'
    REQUIRES_CHANGED = 'requires_changed' # TODO - fix this
    MAPPINGS_COMPLETE = 'mappings_complete'
    MATERIALS_ASSIGNED = 'materials_assigned'
    CAD_COMPLETED = 'cad_completed'
    BOM_FINALIZED = 'bom_finalized'
    COMPLETED_STATE = 'completed'
    CANCELED_STATE = 'canceled'

    STATE_CHOICE = (
        (OPEN, 'Open'),
        (PENDING_PRECOSTING_COMPLETION, 'Pending Precosting Completion'),
        (CLOSE, 'Close'),
        (REQUIRES_CHANGED, 'Requires Changes'),
        (MAPPINGS_COMPLETE, 'Mappings Complete'),
        (MATERIALS_ASSIGNED, 'Materials Assigned'),
        (CAD_COMPLETED, 'CAD Complete'),
        (BOM_FINALIZED, 'Bom Finalized'),
        (COMPLETED_STATE, 'Complete'),
        (CANCELED_STATE, 'Canceled'),
    )

    state = models.CharField(max_length=50, choices=STATE_CHOICE, default=OPEN)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True)
    delivery_date = models.DateField(default=None, null=True)
    available_date = models.DateField(default=None, null=True)
    processed = models.BooleanField(default=False)
    original_po_club = models.ForeignKey('marketing.OriginalPOClub', on_delete=models.SET_NULL, null=True)
    actual_po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.SET_NULL, null=True)
    uploaded_purchase_order = models.ForeignKey(UploadedPurchaseOrder, on_delete=models.CASCADE)
    mappings_created = models.BooleanField(default=False)
    style_number = models.CharField(max_length=300, null=True)
    watchlist = models.ManyToManyField(User, related_name='watchlist_purchase_order')
    plant = models.ForeignKey('shared.Plant', on_delete = models.SET_NULL, null = True)
    production_cut_date = models.DateTimeField(null=True)
    production_start_date = models.DateTimeField(null=True)
    production_end_date = models.DateTimeField(null=True)
    marketing_costing = models.ForeignKey(OrderCostingVersion, related_name='marketing_purchase_order_set', on_delete=models.SET_NULL, null=True)
    total_fob_value = models.FloatField(null=True)
    total_raw_material_cost = models.FloatField(null=True)
    total_fabric_cost = models.FloatField(null=True)
    total_sewing_trim_cost = models.FloatField(null=True)
    total_packing_trim_cost = models.FloatField(null=True)
    total_embellishment_service_cost = models.FloatField(null=True)
    total_wash_service_cost = models.FloatField(null=True)
    max_pcl_value = models.FloatField(null=True)
    material_fob_presentage = models.FloatField(null=True)
    ex_factory_date = models.DateTimeField(null=True)
    payment_term = models.CharField(choices=PAYMENT_METHOD_TYPES, max_length=100, default=None, null=True)
    credit_days = models.IntegerField(null=True)

    @property
    def display_number(self):
        return f"PO{self.id:06}"
    
    @property
    def short_code(self):
        version_code = None
        if self.costing_version:
            version_code = self.costing_version.short_code
        short_code = '%s / %s' % (version_code, self.display_number)
        return short_code
    
    @property
    def long_code(self):
        version_code = None
        if self.costing_version:
            version_code = self.costing_version.long_code
        version_code = '%s / %s' % (version_code, self.display_number)
        return version_code

    def get_material_purchase_order_boms(self, customer_brand_material):
        material_boms = self.purchaseorderbom_set.filter(material=customer_brand_material)
        return material_boms

    def get_material_required_quantity(self, customer_brand_material):
        material_boms = self.get_material_purchase_order_boms(customer_brand_material)
        material_normalized_unit = customer_brand_material.material_normalized_measuring_unit
        po_order_quantity = calculate_queryset_total_normalized_quantity(material_boms, material_normalized_unit, 'order_quantity', 'measuring_unit')
        return get_quantity_dictionary(po_order_quantity, material_normalized_unit)

    def get_material_supplier_deliver_date_po_allocations(self, customer_brand_material):
        order_po_allocations = SupplierDeliveryDateQuantityPOAllocation.objects.filter(purchase_order=self, supplier_delivery_date_quantity__general_po_material_quantity__material=customer_brand_material)
        return order_po_allocations

    def get_material_supplier_prices(self, customer_brand_material):
        allocations = self.get_material_supplier_deliver_date_po_allocations(customer_brand_material)
        material_suppliers = allocations.values_list('supplier_delivery_date_quantity__material_supplier_id', flat=True).distinct()
        material_supplier_prices = GeneralPOSupplierMaterialPrice.objects.filter(pk__in=material_suppliers)
        return material_supplier_prices

    def get_material_average_order_cost(self, customer_brand_material):
        order_po_allocations = self.get_material_supplier_deliver_date_po_allocations(customer_brand_material)
        quantity = 0
        price_total = 0
        material_unit = customer_brand_material.material_normalized_measuring_unit

        for order_po_allocation in order_po_allocations:
            if order_po_allocation.proforma_invoice_quantity and order_po_allocation.proforma_invoice_quantity_units and order_po_allocation.supplier_delivery_date_quantity.material_supplier.order_price and order_po_allocation.supplier_delivery_date_quantity.material_supplier.order_price_units:
                quantity += convert_quantity_to_unit(material_unit, order_po_allocation.proforma_invoice_quantity, order_po_allocation.proforma_invoice_quantity_units)['quantity']
                price_total += (quantity * convert_per_unit_cost(material_unit, order_po_allocation.supplier_delivery_date_quantity.material_supplier.order_price, order_po_allocation.supplier_delivery_date_quantity.material_supplier.order_price_units)['cost'])
        average_cost = None
        if quantity:
            average_cost = price_total / quantity
        data = {
            'cost': average_cost,
            'cost_unit': PerMeasuringUnitHelper().get_per_unit_measuring_unit(material_unit)
        }
        return data
    
    def set_calculated_values(self):
        self.total_fob_value = self.calculate_total_fob_value()
        self.total_fabric_cost = self.calculate_total_fabric_costs()
        self.total_sewing_trim_cost = self.calculate_total_sewing_trim_costs()
        self.total_packing_trim_cost = self.calculate_total_packing_trim_costs()
        self.total_embellishment_service_cost = self.calculate_total_embellishment_service_costs()
        self.total_wash_service_cost = self.calculate_total_wash_service_costs()
        self.total_raw_material_cost = self.get_total_raw_material_costs()
        self.max_pcl_value = self.calculate_max_pcl_value()
        self.material_fob_presentage = self.calculate_material_fob_percentage()
        self.save()


class POCountry(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    order_country = models.ForeignKey(OrderCountry, on_delete=models.CASCADE, null=True) # this is legacy, use po_club_country -> pre_costing_order_country or order_country instead
    po_country_name = models.CharField(max_length=100, null=True)
    po_club_country = models.ForeignKey('marketing.ActualPOClubCountry', on_delete=models.SET_NULL, null=True)

    def is_valid(self):
        valid = True
        if self.order_country == None:
            valid = False
        po_packs = POPack.objects.filter(po_country = self)
        if len(po_packs) == 0 or len(po_packs.filter(quantity = None)) > 0:
            valid = False
        return valid

    class Meta:
        ordering = ['po_country_name']
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=('purchase_order', 'order_country'),
        #         name='unique_purchase_order_country'
        #     )
        # ]


class POColorway(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    colorway = models.CharField(max_length=300)
    order_colorway = models.ForeignKey(OrderColorway, on_delete=models.CASCADE, null=True) # this is legacy, use po_club_colorway -> pre_costing_order_colorway or order_colorway instead
    po_club_colorway = models.ForeignKey('marketing.ActualPOClubColorway', on_delete=models.SET_NULL, null=True)

    def is_valid(self):
        valid = True
        if self.order_colorway == None:
            valid = False
        po_packs = POPack.objects.filter(po_colorway = self)
        if len(po_packs) == 0 or len(po_packs.filter(quantity = None)) > 0:
            valid = False
        return valid

    class Meta:
        ordering = ['colorway']
        constraints = [
            models.UniqueConstraint(
                fields=('purchase_order', 'colorway'),
                name='unique_purchase_order_colorway'
            )
        ]


class POSize(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    order_size = models.ForeignKey(OrderSize, on_delete=models.CASCADE, null=True) # this is legacy, use po_club_size pre_costing_order_size or order_size instead
    po_size_name = models.CharField(max_length=100, null=True)
    po_club_size = models.ForeignKey('marketing.ActualPOClubSize', on_delete=models.SET_NULL, null=True)

    def is_valid(self):
        valid = True
        if self.order_size == None:
            valid = False
        po_packs = POPack.objects.filter(po_size = self)
        if len(po_packs) == 0 or len(po_packs.filter(quantity = None)) > 0:
            valid = False
        return valid

    class Meta:
        ordering = ['po_size_name']
        # constraints = [ # Removed since, duplicate validation handle with transaction
        #     models.UniqueConstraint(
        #         fields=('purchase_order', 'order_size'),
        #         name='unique_purchase_order_size'
        #     )
        # ]


class POItem(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE)
    po_club_item = models.ForeignKey('marketing.ActualPOClubItem', on_delete=models.SET_NULL, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('purchase_order', 'order_item'),
                name='unique_purchase_order_item'
            )
        ]


class POColorwayItem(BaseAbstractModel):
    po_colorway = models.ForeignKey(POColorway, on_delete=models.CASCADE)
    po_item = models.ForeignKey(POItem, on_delete=models.CASCADE)
    colorway_category_color = models.CharField(max_length=200, null=True)

    def get_po_colorway_item_category_type(self):
        try:
            cw_item_type = ColorwayItemType.objects.get(colorway=self.po_colorway.order_colorway, item=self.po_item.order_item)
            #colorway_category_type = cw_item_type.colorway_type.name
            colorway_category_type = cw_item_type.colorway_category.name
        except ObjectDoesNotExist:
            colorway_category_type = None
        return colorway_category_type

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('po_colorway', 'po_item'),
                name='unique_po_colorway_po_item'
            )
        ]


class POPack(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    order_pack = models.ForeignKey(OrderPack, on_delete=models.CASCADE, null=True)
    quantity = models.IntegerField(null=True)
    po_colorway = models.ForeignKey(POColorway, on_delete=models.CASCADE)
    po_size = models.ForeignKey(POSize, on_delete=models.CASCADE)
    po_country = models.ForeignKey(POCountry, on_delete=models.CASCADE)
    reviewed = models.BooleanField(default=False)
    successfully_built_bom = models.BooleanField(default=False)
    po_materials_reviewed = models.BooleanField(default=False)
    pack_cost = models.FloatField(null=True) 
    normalized_requested_cost = models.FloatField(null=True)

    def get_po_pack_display(self):
        display = '%s - %s - %s' % (self.po_country.order_country.country.name, self.po_colorway.colorway, self.po_size.po_size_name)
        return display

    def get_matching_costing_order_pack(self):
        pack = self.order_pack
        if not pack:
            version = self.purchase_order.costing_version
            pack = OrderPack.objects.get(version=version, size=self.po_size.order_size, colorway=self.po_colorway.order_colorway,
                                         country=self.po_country.order_country)
        return pack

    def get_po_pack_placements(self):
        return self.popackplacement_set.all()
    
    def get_po_pack_placements_by_material(self, material):
        return self.popackplacement_set.filter(po_material__material_detail__generic_material__user_material=material)

    def get_po_pack_items(self):
        pack_items = self.popackitem_set.all()
        return pack_items

    def get_po_pack_materials(self):
        data = []
        placements = self.get_po_pack_placements()
        for placement in placements:
            data.append(placement.get_po_pack_placement_material_details())
        return data

    def build_bom(self, material):
        placements = self.get_po_pack_placements_by_material(material)
        success = True

        for placement in placements:
            if placement.po_material.material_detail.generic_material.user_material.name == 'hanger_plaque':
                print(placement.id)
            quantity, quantity_units, supplier_inquiry_detail = placement.calculate_po_material_quantities()
            #print(quantity, quantity_units, supplier_inquiry_detail, placement)
            if quantity and supplier_inquiry_detail: # and quantity_units TODO Major
                #BOM quantity debug
                # quantity = math.ceil(quantity)
                placement.material_quantity = round(quantity, 2)
                placement.material_quantity_units = quantity_units
                placement.supplier_inquiry_detail = supplier_inquiry_detail
                placement.save()
            else:
                success = False
        return success
    
    def get_pack_cost(self):
        return self.normalized_requested_cost

    def calculate_po_pack_pre_seen_costing_summary(self):
        from marketing.helpers.post_costing_helper import POPackPreSeenCostingHelper
        cost = POPackPreSeenCostingHelper().calculate_po_pack_post_costing(self)
        return cost

    class Meta:
        ordering = ['po_colorway__colorway']


class POPackItem(BaseAbstractModel):
    order_pack_item = models.ForeignKey(OrderPackItem, on_delete=models.CASCADE, null=True)
    po_pack = models.ForeignKey(POPack, on_delete=models.CASCADE)
    po_item = models.ForeignKey(POItem, on_delete=models.CASCADE)
    reviewed = models.BooleanField(default=False)
    fabric_consumption_ratio_complete = models.BooleanField(default=False)
    po_materials_reviewed = models.BooleanField(default=False)
    po_club_item_classification = models.ForeignKey('POClubItemClassification', on_delete=models.CASCADE, null=True)

    MATERIAL_DETAILS_KEY = 'material_details'

    def get_material_average_cost(self):
        SupplierPO.objects.filter(general_po_supplier__general_po__po_club=self.po_pack.purchase_order.actual_po_club)

    def get_po_pack_item_services(self):
        return self.popackitemservice_set.all()

    def get_po_pack_item_placements(self):
        return self.popackitemplacement_set.all()

    def get_po_pack_item_display(self):
        colorway_category = self.get_po_pack_item_colorway()
        colorway_name = colorway_category.colorway_category_color if colorway_category else 'N/A'
        display = '%s - %s [%s] - (%s)' % (self.po_pack.get_po_pack_display(), self.po_item.order_item.item.name, self.po_item.order_item.item_identifier, colorway_name)
        return display

    def get_po_pack_item_colorway(self):
        po_cw_item = get_object_or_none(POColorwayItem, {'po_colorway': self.po_pack.po_colorway, 'po_item': self.po_item})
        return po_cw_item

    def get_placement_marker_detail(self, placement, marker_type=None):
        markers = POFabricMarkerPlacement.objects.filter(
            placement=placement,
            marker__void_marker=False
        )
        #print(markers.values_list('marker_id', flat=True), markers.values_list('marker__po_material', flat=True))
        if marker_type:
            markers = markers.filter(
              marker__marker_classification=marker_type
          )
        return markers

    def build_bom(self, material, exclude_fabric_creation=False):
        placements = self.get_po_pack_item_placements_by_material(material)
        success = True
        processed_placement_ids = []
        for placement in placements:
            if placement.get_placement_material_type() == Material.FABRIC_MATERIAL:

                # Go to next material if exclude fabric
                if exclude_fabric_creation:
                    continue

                marker_details = self.get_placement_marker_detail(placement, POFabricMarker.BOOKING_MARKER)

                for marker_detail in marker_details:
                    quantity = placement.material_quantity

                    if placement.pk not in processed_placement_ids:
                        quantity = 0
                        po_material_units = placement.po_material.material_detail.generic_material.user_material.get_consumption_measuring_unit_details()['value']
                        placement.material_quantity_units = po_material_units
                    quantity = float(quantity) + float(marker_detail.calculated_material_quantity)
                    placement.material_quantity = quantity

                    fabric_suppliers = marker_detail.marker.width.fabricwidthsupplier_set.all()
                    if fabric_suppliers.exists():
                        fabric_supplier = fabric_suppliers[0]
                        placement.supplier_inquiry_detail = fabric_supplier.supplier_inquiry_detail
                    placement.save()
                if not marker_details.exists():
                    success = False
            else:
                quantity, quantity_units, supplier_inquiry = placement.calculate_po_material_quantities()
                if quantity and supplier_inquiry:
                    #BOM quantity debug
                    # placement.material_quantity = math.ceil(quantity)
                    placement.material_quantity = quantity
                    placement.material_quantity_units = quantity_units
                    placement.supplier_inquiry_detail = supplier_inquiry
                    #print(placement.material_quantity, placement.material_quantity_units, 'material quantity by placement')
                    placement.save()
                else:
                    success = False
        return success

    def get_matching_costing_order_pack_item(self):
        pack_item = self.order_pack_item
        if not pack_item:
            pack_item = OrderPackItem.objects.get(pack=self.po_pack.order_pack, item=self.po_item.order_item)
        return pack_item

    def get_po_pack_item_placements_by_material(self, material):
        return self.popackitemplacement_set.filter(po_material__material_detail__generic_material__user_material=material)

    def get_po_pack_item_customer_brand_materials(self, material_type):
            pack_item_materials = self.get_po_pack_item_placements()

            if material_type:
                pack_item_materials = pack_item_materials.filter(
                    Q(po_material__material_detail__generic_material__user_material__name=material_type)
                )

            pack_item_material_ids = pack_item_materials.values('po_material_id').distinct()
            data = get_material_details(pack_item_material_ids, 'po_material_id')
            return data

    def validate_fabric_placements_complete(self):
        materials = self.get_po_pack_item_customer_brand_materials(Material.FABRIC_MATERIAL)
        materials = materials.get(Material.FABRIC_MATERIAL)
        valid = True
        for material in materials:
            customer_brand_material_id = material.get('customer_brand_material_id', None)
            customer_brand_material = CustomerBrandMaterial.objects.get(pk=customer_brand_material_id)
            supplier_inquiry_detail = self.po_pack.order_pack.get_selected_supplier_inquiry_for_material(customer_brand_material)
            cw_item_consumption_ratio = ColorwayItemFabricConsumption.objects.get(
                supplier_inquiry_detail=supplier_inquiry_detail.supplier_inquiry_detail,
                po_colorway=self.po_pack.po_colorway,
                po_item=self.po_item
            )
            if cw_item_consumption_ratio.po_consumption_ratio is None or cw_item_consumption_ratio.po_wastage is None:
                valid = False
                break
        return valid

    def get_po_pack_item_materials(self):
        data = []
        placements = self.get_po_pack_item_placements()
        for placement in placements:
            data.append(placement.get_po_item_placement_material_details())
        return data


#TODO - is this needed?
class POCountryColorwayItemPlacement(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    po_country = models.ForeignKey(POCountry, on_delete=models.CASCADE)
    po_colorway = models.ForeignKey(POColorway, on_delete=models.CASCADE)
    po_item = models.ForeignKey(POItem, on_delete=models.CASCADE)
    # item_attribute = models.ForeignKey(ItemAttribute, on_delete=models.CASCADE, null=True)
    item_attribute_other = models.ForeignKey(OrderPlacement, on_delete=models.CASCADE, null=True)
    po_material = models.ForeignKey(CustomerBrandMaterial, null=True, on_delete=models.CASCADE)
    costing_material = models.ForeignKey(CustomerBrandMaterial, null=True, on_delete=models.CASCADE, related_name='po_country_colorway_item_placement_costing_material_set')


#TODO - is this needed?
class POCountryColorwayPlacement(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    po_country = models.ForeignKey(POCountry, on_delete=models.CASCADE)
    po_colorway = models.ForeignKey(POColorway, on_delete=models.CASCADE)
    # item_attribute = models.ForeignKey(ItemAttribute, on_delete=models.CASCADE, null=True)
    item_attribute_other = models.ForeignKey(OrderPlacement, on_delete=models.CASCADE, null=True)
    po_material = models.ForeignKey(CustomerBrandMaterial, null=True, on_delete=models.CASCADE)
    costing_material = models.ForeignKey(CustomerBrandMaterial, null=True, on_delete=models.CASCADE, related_name='po_country_colorway_placement_costing_material_set')


class AbstractPOPlacement(BaseAbstractModel):
    po_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE, null=True)
    material_quantity = models.DecimalField(null=True, decimal_places=6, max_digits=16)
    material_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.CASCADE, null=True)
    consumption_ratio = models.FloatField(null=True)
    wastage = models.FloatField(null=True)

    def get_consumption_and_wastage_combination(self, wastage, consumption_ratio):
        ratio_total = 0
        if consumption_ratio:
            ratio_total = ratio_total + consumption_ratio
        if wastage:
            ratio_total = ratio_total * (1 + (wastage / 100))
        ratio_total = round(ratio_total, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
        return ratio_total

    def calculate_po_material_quantities(self):
        supplier_inquiry = self.get_material_costing_supplier_inquiry().supplier_inquiry_detail
        #consumption_ratio_object = self.get_material_consumption_ratio_object(supplier_inquiry) # TODO -fix this use the new one (Changed in 2025/07/30)
        material_quantity = None
        material_units = self.po_material.material_detail.generic_material.user_material.get_consumption_measuring_unit_details()['value']
        po_pack_quantity = self.get_po_pack().quantity

        #if consumption_ratio_object and po_pack_quantity:(Changed in 2025/07/30)
        if self.consumption_ratio and po_pack_quantity:
            consumption_value = self.get_consumption_and_wastage_combination(self.wastage, self.consumption_ratio)
            material_quantity = consumption_value * self.get_po_pack().quantity

        return material_quantity, material_units, supplier_inquiry # TODO major - fix material units

    @abstractmethod
    def get_material_costing_supplier_inquiry(self):
        ...

    @abstractmethod
    def get_material_consumption_ratio_object(self, supplier_inquiry=None):
        ...

    @abstractmethod
    def get_po_pack(self):
        ...

    @abstractmethod
    def get_placement_material_type(self):
        ...

    @abstractmethod
    def get_costing_material(self):
        ...

    class Meta:
        abstract = True


class POPackItemPlacement(AbstractPOPlacement):
    po_pack_item = models.ForeignKey(POPackItem, on_delete=models.CASCADE)
    costing_pack_item_placement = models.ForeignKey(OrderPackItemPlacement, on_delete=models.CASCADE)
    #fabric_marker = models.ForeignKey('marketing.POFabricMarker', on_delete=models.SET_NULL, null=True) # TODO remove this after complete CAD API's

    # COSTING_PLACEMENT_DATA_KEY = 'costing_placement_data_key'
    PK_PO_PACK_ITEM_PLACEMENT_ID_KEY = 'pk_po_pack_item_placement_id'
    PO_PACK_ITEM_MATERIAL_DETAILS_KEY = 'po_pack_item_material_details'

    def get_po_item_placement_material_details(self):
        data = {self.PK_PO_PACK_ITEM_PLACEMENT_ID_KEY: self.pk, self.PO_PACK_ITEM_MATERIAL_DETAILS_KEY:{}}
        if self.po_material:
            data[self.PO_PACK_ITEM_MATERIAL_DETAILS_KEY] = self.po_material.get_customer_brand_material_details()
        return data

    def get_po_item_fabric_consumption(self, supplier_inquiry):
        po_item = self.po_pack_item.po_item
        po_pack_colorway = self.po_pack_item.po_pack.po_colorway
        po_material = self.po_material

        filter = {
            'po_colorway': po_pack_colorway,
            'po_item': po_item,
            'po_material': po_material,
            'supplier_inquiry_detail': supplier_inquiry,
        }
        consumption_object = get_object_or_none(ColorwayItemFabricConsumption, filter)
        return consumption_object

    def get_placement_material_type(self):
        return self.costing_pack_item_placement.get_placement_material_type()

    def get_material_consumption_ratio_object(self, supplier_inquiry=None):
        if self.get_placement_material_type() == Material.FABRIC_MATERIAL:
            consumption_object = self.get_po_item_fabric_consumption(supplier_inquiry)
        else:
            consumption_object = self.costing_pack_item_placement.get_placement_material_consumption(supplier_inquiry)
        return consumption_object

    def get_material_costing_supplier_inquiry(self):
        costing_material = self.costing_pack_item_placement.get_placement_material_object().material
        colorway_supplier_inquiry = self.po_pack_item.po_pack.order_pack.get_selected_supplier_inquiry_for_material(costing_material)
        return colorway_supplier_inquiry

    def get_po_pack(self):
        return self.po_pack_item.po_pack

    def get_po_pack_item_display(self):
        display = '%s - %s' % (self.po_pack_item.get_po_pack_item_display(), self.costing_pack_item_placement.item_attribute_other.name)
        return display

    def get_costing_material(self):
        return self.costing_pack_item_placement.get_placement_material_object().material

    def calculate_filled_quantity(self, left_over=False):
        completed_quantity = 0
        if self.get_placement_material_type() == Material.FABRIC_MATERIAL:
            # print(self.get_placement_material_type())
            po_fabric_marker_placements = self.pofabricmarkerplacement_set.all()
            # print(po_fabric_marker_placements)
            for po_fabric_marker_placement in po_fabric_marker_placements:
                completed_quantity += po_fabric_marker_placement.calculate_placement_filled_quantity(left_over)
        return completed_quantity

# class POFabricPlacementSupplierInquiryDetailArea(BaseAbstractModel):
#     po_pack_item_placement = models.ForeignKey(POPackItemPlacement, on_delete=models.CASCADE)
#     placement_area = models.FloatField(null=True)
#     supplier_inquiry_detail_marker = models.ForeignKey('marketing.POFabricMarkerSupplierInquiryDetail', on_delete=models.CASCADE)
#     calculated_consumption_ratio = models.FloatField(null=True) # Calculated based on equation
#     material_quantity = models.FloatField(null=True)

#     class Meta:
#         constraints = [
#             models.UniqueConstraint(
#                 fields=('po_pack_item_placement', 'supplier_inquiry_detail_marker'),
#                 name='unique_placement_inquiry_detail_marker'
#             )
#         ] TODO Remove this model after complete CAD API's


class POPackPlacement(AbstractPOPlacement):
    po_pack = models.ForeignKey(POPack, on_delete=models.CASCADE)
    costing_pack_placement = models.ForeignKey(OrderPackPlacement, on_delete=models.CASCADE)

    # COSTING_PLACEMENT_DATA_KEY = 'costing_placement_data_key'
    PK_PO_PACK_PLACEMENT_ID_KEY = 'pk_po_pack_placement_id'
    PO_PACK_ITEM_MATERIAL_DETAILS_KEY = 'po_pack_item_material_details'

    def get_po_pack_placement_material_details(self):
        data = {self.PK_PO_PACK_PLACEMENT_ID_KEY: self.pk}
        if self.po_material:
            data[self.PO_PACK_ITEM_MATERIAL_DETAILS_KEY] = self.po_material.get_customer_brand_material_details()
        return data

    def get_material_costing_supplier_inquiry(self):
        costing_material = self.costing_pack_placement.get_placement_material_object().material

        colorway_supplier_inquiry = self.po_pack.order_pack.get_selected_supplier_inquiry_for_material(costing_material)
        return colorway_supplier_inquiry

    def get_placement_material_type(self):
        return self.costing_pack_placement.get_placement_material_type()

    def get_material_consumption_ratio_object(self, supplier_inquiry=None):
        return self.costing_pack_placement.get_placement_material_consumption()

    def get_po_pack(self):
        return self.po_pack

    def get_costing_material(self):
        return self.costing_pack_placement.get_placement_material_object().material


class ColorwayItemFabricConsumption(BaseAbstractModel):
    po_colorway = models.ForeignKey(POColorway, on_delete=models.CASCADE)
    po_item = models.ForeignKey(POItem, on_delete=models.CASCADE)
    po_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    po_wastage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.DO_NOTHING) # This is based on the costing customer brand material
    po_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE) # This is based on the PO's material

    PK_PO_COLORWAY_ITEM_CONSUMPTION = 'pk_po_colorway_item_fabric_consumption_id'
    PO_WASTAGE = 'po_wastage'
    PO_CONSUMPTION_RATIO = 'po_consumption_ratio'

    def get_consumption_and_wastage_combination(self):
        ratio_total = get_consumption_and_wastage_combination(self.po_wastage, self.po_consumption_ratio)
        return ratio_total


class PurchaseOrderOtherCostType(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    name = models.CharField(max_length=1000)
    other_cost = models.ForeignKey(OtherCost, null=True, on_delete=models.SET_NULL)
    costing_other_cost_type = models.ForeignKey(OtherCostType, null=True, on_delete=models.SET_NULL)
    

class POPackOtherCost(BaseAbstractModel):
    pack = models.ForeignKey(POPack, on_delete=models.CASCADE)
    other_cost_type = models.ForeignKey(PurchaseOrderOtherCostType, on_delete=models.SET_NULL, null=True)
    cost = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    other_cost_type_name = models.CharField(max_length=300)
    costing_order_pack_other_cost = models.ForeignKey(OrderPackOtherCost, null=True, on_delete=models.SET_NULL)


class POPackItemService(BaseAbstractModel):
    po_pack_item = models.ForeignKey(POPackItem, on_delete=models.CASCADE)

    service_type = models.CharField(max_length=500, choices=PackItemService.SERVICE_TYPE_CHOICES)
    costing_po_pack_item_service = models.ForeignKey(PackItemService, on_delete=models.SET_NULL, null=True)

    PO_SERVICE_TYPE_KEY = 'po_service_type'
    PO_PK_SERVICE_ID = 'po_service_id'
    PO_PACK_ITEM_KEY = 'po_pack_item_id'

    def get_service_object(self):
        object = None
        if self.service_type == PackItemService.EMBELLISHMENT_SERVICE_TYPE:
            object = getattr(self, 'popackitemembellishmentservice', None)
        elif self.service_type == PackItemService.WASH_SERVICE_TYPE:
            object = getattr(self, 'popackitemwashservice', None)
        return object

    def get_attributes(self):
        object = self.get_service_object()
        attributes = {}
        if object:
            attributes = object.get_attributes()
            attributes[self.PO_PK_SERVICE_ID] = object.pk
            attributes[self.PO_PACK_ITEM_KEY] = object.po_pack_item_id
        return attributes


class POPackItemWashService(POPackItemService):
    # pack_item = models.ForeignKey(OrderPackItem, on_delete=models.CASCADE)
    technique = models.CharField(max_length=1500)
    wash_service_attachment = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True, default=None)

    PO_WASH_TECHNIQUE_KEY = 'technique'
    PO_WASH_ATTACHMENT_KEY = 'po_wash_attachment'

    def __init__(self, *args, **kwargs):
        self._meta.get_field('service_type').default = PackItemService.WASH_SERVICE_TYPE
        super(POPackItemService, self).__init__(*args, **kwargs)

    def get_attributes(self):
        data = {
            self.PO_WASH_TECHNIQUE_KEY: self.technique,
            self.PO_WASH_ATTACHMENT_KEY: self.wash_service_attachment.get_object_data() if self.wash_service_attachment else {}
        }
        return data


class POEmbellishmentServiceDetail(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    sub_type = models.ForeignKey(EmbellishmentSubType, on_delete=models.DO_NOTHING)
    grading = models.BooleanField(default=False, null=True)
    embellishment_attachment = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True, default=None)
    costing_embellishment_service_detail = models.ForeignKey(EmbellishmentServiceDetail, on_delete=models.SET_NULL, null=True) #TODO mahesh

    PO_PK_EMBELLISHMENT_SERVICE_DETAIL_ID_KEY = 'po_embellishment_detail_id'

    def get_attributes(self):
        data = {
            self.PO_PK_EMBELLISHMENT_SERVICE_DETAIL_ID_KEY: self.pk,
            EmbellishmentServiceDetail.EMBELLISHMENT_TYPE_KEY: self.sub_type.embellishment_type.name,
            EmbellishmentServiceDetail.EMBELLISHMENT_TYPE_ID_KEY: self.sub_type.embellishment_type_id,
            EmbellishmentServiceDetail.EMBELLISHMENT_SUB_TYPE_KEY: self.sub_type.name,
            EmbellishmentServiceDetail.EMBELLISHMENT_SUB_TYPE_ID_KEY: self.sub_type_id,
            EmbellishmentServiceDetail.EMBELLISHMENT_GRADING_KEY: self.grading,
            EmbellishmentServiceDetail.EMBELLISHMENT_ATTACHMENT_KEY: self.embellishment_attachment.get_object_data() if self.embellishment_attachment else {},
        }
        return data


class POPackItemEmbellishmentService(POPackItemService):
    embellishment_detail = models.ForeignKey(POEmbellishmentServiceDetail, on_delete=models.CASCADE)
    size = models.CharField(max_length=100)
    pack_item_embellishment_attachment = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True, default=None)

    def get_attributes(self):
        data = {
            **self.embellishment_detail.get_attributes(),
            PackItemEmbellishmentService.EMBELLISHMENT_SIZE_KEY: self.size,
            PackItemEmbellishmentService.PACK_ITEM_EMBELLISHMENT_ATTACHMENT_KEY: self.pack_item_embellishment_attachment.get_object_data() if self.pack_item_embellishment_attachment else {}
        }
        return data

    def __init__(self, *args, **kwargs):
        self._meta.get_field('service_type').default = PackItemService.EMBELLISHMENT_SERVICE_TYPE
        super(POPackItemService, self).__init__(*args, **kwargs)


class POPackItemOperation(AbstractOperationModel):
    costing_colorway_item_operation = models.ForeignKey(OrderItemColorwayOperation, on_delete=models.CASCADE)
    po_pack_item = models.ForeignKey(POPackItem, on_delete=models.CASCADE)
    display_order = models.IntegerField(null=True)
    actual_smv = models.FloatField(null=True)


class PurchaseOrderBom(BaseAbstractModel, PurchaseOrderBOMModelMixin):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    # po_colorway = models.ForeignKey(POColorway, on_delete=models.CASCADE)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True) # This is the default supplier
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.CASCADE, null=True) # Default supplier_inquiry_detail
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
    quantity = models.DecimalField(null=True, decimal_places=6, max_digits=16)
    measuring_unit = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True) # this is for quantity
    order_quantity = models.FloatField(null=True) # This is the final quantity
    order_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)

    REQUIRED_QUANTITY_VALUE_KEY = 'quantity'
    REQUIRED_QUANTITY_UNIT_VALUE_KEY = 'measuring_unit'

    @property
    def normalized_order_quantity(self):
        return self.get_standardized_order_quantity()

    class Meta:
        ordering = ('id', )
        constraints = [
            models.UniqueConstraint(
                fields = ('material', 'purchase_order'),
                name = 'unique_material_and_purchase_order'
            )
        ]


class OriginalPOClub(BaseAbstractModel):
    start_delivery_date = models.DateField()
    end_delivery_date = models.DateField()
    uploaded_purchase_order = models.ForeignKey('marketing.UploadedPurchaseOrder', on_delete=models.CASCADE)

#
# class SupplierPO(BaseAbstractModel):
#     po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.DO_NOTHING)
#     supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
#     supplier_po_number = models.CharField(max_length=300)
#     supplier_po_file = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
#     performa_invoice = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True, related_name='performa_invoices')
# 
#     DRAFT_STATE = 'draft'
#     PENGING_EMAIL_STATE = 'pending_email'
#     EMAIL_SENT_STATE = 'email_sent'
#     COMPLETE_STATE = 'complete'
#     CANCEL_STATE = 'cancel'
# 
#     STATE_OPTIONS = (
#         (DRAFT_STATE, 'Draft'),
#         (PENGING_EMAIL_STATE, 'Pending Email'),
#         (EMAIL_SENT_STATE, 'Email Sent'),
#         (COMPLETE_STATE, 'Complete'),
#         (CANCEL_STATE, 'Cancel')
#     )
# 
#     state = models.CharField(max_length=200, choices=STATE_OPTIONS, default=DRAFT_STATE)
# 
#     def set_supplier_po_number(self):
#         str_date = datetime.today().strftime('%Y-%m-%d')
#         po_number = f'SPO{self.id:06}'
#         self.supplier_po_number = po_number
#         self.save()
# 
#     def get_all_delivery_dates(self):
#         # delivery_ids = PurchaseOrderClubBomSupplier.objects.filter(supplier_delivery_date__supplier_po=self).values_list('supplier_delivery_date_id', flat=True).distinct()
#         # deliveries = SupplierDeliveryDate.objects.filter(pk__in=delivery_ids).order_by('confirmed_delivery_date')
#         # valid_deliveries = self.supplierdeliverydate_set.filter()
#         # TODO - the reason to do it in the commented out way
#         return self.supplierdeliverydate_set.all().exclude().order_by('confirmed_delivery_date')
#     
#     def get_grn_delivery_dates(self):
#         return self.supplierdeliverydate_set.all().exclude(actual_delivery_date=None).order_by('actual_delivery_date__delivery_date')
# 
#     def get_material_delivery_dates(self, material):
#         delivery_ids = PurchaseOrderClubBomSupplier.objects.filter(purchase_order_bom__material=material, supplier_delivery_date__supplier_po=self).values_list('supplier_delivery_date_id', flat=True)
#         deliveries = SupplierDeliveryDate.objects.filter(pk__in=delivery_ids).order_by('id')
#         return deliveries
#     
#     def get_invoices(self):
#         supplier_po_delivery_invoice_ids = SupplierActualDeliveryDate.objects.filter(supplier_po=self).values_list('supplier_po_delivery_invoice', flat=True)
#         invoices = SupplierPODeliveryInvoice.objects.filter(pk__in=supplier_po_delivery_invoice_ids)
#         return invoices
#     
#     def get_pack_list(self):
#         delivery_ids = PurchaseOrderClubBomSupplier.objects.filter(supplier_delivery_date__supplier_po=self).values_list('supplier_delivery_date_id', flat=True).distinct()
#         supplier_po_delivery_invoice_ids = SupplierDeliveryDate.objects.filter(pk__in=delivery_ids).values_list('actual_delivery_date__supplier_po_delivery_invoice', flat=True)
#         pack_list = SupplierPODeliveryInvoicePackList.objects.filter(supplier_po_delivery_note__supplier_po_delivery_invoice_id__in=supplier_po_delivery_invoice_ids)
#         return pack_list
#     
#     def get_material_categories(self):
#         user_define_material_ids = PurchaseOrderClubBomSupplier.objects.filter(
#             supplier_delivery_date__supplier_po=self
#         ).values_list('purchase_order_bom__material__material_detail__generic_material__user_material', flat=True).distinct()
#         user_define_materials = UserDefinedMaterial.objects.filter(id__in=user_define_material_ids)
#         return user_define_materials
#     
#     def get_materials(self, user_define_material):
#         material_ids = PurchaseOrderClubBomSupplier.objects.filter(
#             supplier_delivery_date__supplier_po=self,
#             purchase_order_bom__material__material_detail__generic_material__user_material=user_define_material
#         ).values_list('purchase_order_bom__material', flat=True).distinct()
#         materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
#         return materials
# 
#     def get_grns(self):
#         return self.supplierpogrn_set.all()
# 
#     def get_last_expected_delivery_for_material(self, material):
#         material_delivery_dates = PurchaseOrderClubBomSupplier.objects.filter(purchase_order_bom__material=material, supplier_delivery_date__supplier_po=self).values_list('supplier_delivery_date_id', flat=True)
#         delivery_dates = self.supplierdeliverydate_set.filter(pk__in=material_delivery_dates).order_by('confirmed_delivery_date')
#         last_delivery_date = None
#         if delivery_dates.exists():
#             last_delivery_date = delivery_dates[0]
#         return last_delivery_date
#     
#     def get_material_list(self):
#         material_ids = PurchaseOrderClubBomSupplier.objects.filter(
#             supplier_delivery_date__supplier_po=self
#         ).values_list('purchase_order_bom__material', flat=True).distinct()
#         materials = CustomerBrandMaterial.objects.filter(id__in=material_ids)
#         return materials
# 
# 
# class SupplierPODeliveryInvoice(BaseAbstractModel):
#     invoice = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
#     supplier_invoice_number = models.CharField(max_length=500)
# 
#     OPEN_STATE = 'open'
#     GRN_FINALIZED_STATE = 'grn_finalized'
#     REMEDIATION_FINALIZED_STATE = 'remediation_finalized'
#     CLOSED_STATE = 'closed'
#     CANCELED_STATE = 'canceled'
#     CI_STATE_CHOICES = (
#         (OPEN_STATE, 'Open'),
#         (GRN_FINALIZED_STATE, 'GRN Finalized'),
#         (REMEDIATION_FINALIZED_STATE, 'Remediation Finalized'),
#         (CLOSED_STATE, 'Closed'),
#         (CANCELED_STATE, 'Canceled')
#     )
#     ci_state = models.CharField(max_length=100, choices=CI_STATE_CHOICES, default=OPEN_STATE)
# 
#     @property
#     def display_number(self):
#         return f"INV{self.id:06}"
# 
#     def get_invoice_delivery_notes(self):
#         delivery_notes = self.supplierpoinvoicedeliverynote_set.all()
#         return delivery_notes
# 
#     def get_invoice_pack_lists(self):
#         dns = self.get_invoice_delivery_notes()
#         pack_lists = SupplierPODeliveryInvoicePackList.objects.filter(supplier_po_delivery_note__in=dns)
#         return pack_lists
# 
#     def get_invoice_grns(self):
#         pack_lists = self.get_invoice_pack_lists()
#         grns = SupplierPOGRN.objects.filter(supplier_pack_list__in=pack_lists).order_by('id')
#         return grns
#     
#     def get_supplier_po(self):
#         return self.supplieractualdeliverydate.supplier_po
#     
#     def get_po_club(self):
#         return self.supplieractualdeliverydate.supplier_po.po_club
# 
#     def get_supplier_delivery_dates(self):
#         actual_delivery = self.supplieractualdeliverydate
#         supplier_deliveries = SupplierDeliveryDate.objects.filter(actual_delivery_date__in=actual_delivery)
#         return supplier_deliveries
#     
#     def get_material_delivery_dates(self, material):
#         delivery_ids = PurchaseOrderClubBomSupplier.objects.filter(
#             purchase_order_bom__material=material, 
#             supplier_delivery_date__actual_delivery_date__supplier_po_delivery_invoice=self
#         ).values_list('supplier_delivery_date_id', flat=True)
#         deliveries = SupplierDeliveryDate.objects.filter(pk__in=delivery_ids).order_by('id')
#         return deliveries
# 
#     def get_debit_notes(self):
#         debit_notes = self.debitnote_set.all()
#         return debit_notes
# 
#     def get_active_debit_note(self):
#         active_states = DebitNote.ACTIVE_STATES
#         debit_note = get_object_or_none_qs(self.get_debit_notes(), {'status__in': active_states})
#         return debit_note
# 
#     def get_supplier_deliveries_from_replacement_deliveries(self, grn_material):
#         supplier_delivery_ids = ReplacementQuantityDeliveryDate.objects.filter(
#             supplier_po_grn_material=grn_material
#         ).values_list('replacement_expected_delivery_date', flat=True)
#         supplier_deliveries = SupplierDeliveryDate.objects.filter(id__in=supplier_delivery_ids)
#         return supplier_deliveries
#     
#     def get_is_editable(self):
#         is_editable = True
#         if self.ci_state == SupplierPODeliveryInvoice.CLOSED_STATE:
#             return False
#         return is_editable
# 
# 
# class SupplierPOInvoiceDeliveryNote(BaseAbstractModel):
#     supplier_po_delivery_invoice = models.ForeignKey(SupplierPODeliveryInvoice, on_delete=models.SET_NULL, null=True)
#     delivery_note = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
# 
#     def get_delivery_note_pack_list(self):
#         pack_lists = self.supplierpodeliveryinvoicepacklist_set.all().order_by('id')
#         return pack_lists
#     
#     def get_delivery_note_grns(self):
#         pack_lists = self.get_delivery_note_pack_list().order_by('id')
#         grns = SupplierPOGRN.objects.filter(supplier_pack_list__in=pack_lists).order_by('id')
#         return grns
#     
#     def get_po_club(self):
#         grns = self.get_delivery_note_grns()
#         po_club_ids = grns.values_list('supplier_po__po_club', flat=True).distinct()
#         if len(po_club_ids) > 1:
#             raise Exception("Supplier PO cannot belong to multiple POClubs")
#         po_club = ActualPOClub.objects.get(pk=po_club_ids[0])
#         return po_club
# 
#     @property
#     def display_number(self):
#         return f"DNOTE{self.id:06}"
# 
# 
# class SupplierPODeliveryInvoicePackList(BaseAbstractModel):
#     supplier_po_delivery_note = models.ForeignKey(SupplierPOInvoiceDeliveryNote, on_delete=models.SET_NULL, null=True)
#     pack_list = models.ForeignKey(FileAttachment, on_delete=models.SET_NULL, null=True)
#     supplier_pack_list_number = models.CharField(max_length=500)
# 
#     def get_material_delivery_quantity_summary(self, delivery_date, material):
#         grn_ids = self.supplierpogrn_set.all().values_list('id', flat=True)
#         supplier_po_grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=grn_ids, grn_material=material, supplier_po_grn__state=SupplierPOGRN.GRN_COMPLETE)
#         summary = calculate_material_delivery_quantity_summary(delivery_date, supplier_po_grn_materials, material)
#         return summary
# 
#     def get_pack_list_grns(self):
#         grns = self.supplierpogrn_set.all().order_by('id')
#         return grns
#     
#     def get_invoice(self):
#         return self.supplier_po_delivery_note.supplier_po_delivery_invoice
#     
#     def get_delivery_dates(self):
#         actual_delivery_dates = SupplierActualDeliveryDate.objects.filter(
#             supplier_po_delivery_invoice=self.supplier_po_delivery_note.supplier_po_delivery_invoice
#         )
#         delivery_dates = SupplierDeliveryDate.objects.filter(actual_delivery_date__in=actual_delivery_dates).order_by('id')
#         return delivery_dates
#     
#     def get_po_club(self):
#         grns = self.get_pack_list_grns()
#         po_club_ids = grns.values_list('supplier_po__po_club', flat=True).distinct()
#         if len(po_club_ids) > 1:
#             raise Exception("Supplier PO cannot belong to multiple POClubs")
#         po_club = ActualPOClub.objects.get(pk=po_club_ids[0])
#         return po_club
#     
#     def get_material_total_excess_quantity(self, material):
#         normalized_unit = material.material_normalized_measuring_unit
#         quantity = 0
#         grn_material_details = SupplierPOGRNMaterialDetail.objects.filter(
#             supplier_po_grn_material__grn_material=material,
#             supplier_po_grn_material__supplier_po_grn__supplier_pack_list=self
#         )
#         if grn_material_details:
#             quantity = calculate_queryset_total_normalized_quantity(grn_material_details, normalized_unit, 'excess_quantity', 'excess_quantity_units')
#         data = get_quantity_dictionary(quantity, normalized_unit)
#         return data
#     
# 
#     @property
#     def display_number(self):
#         return f"PL{self.id:06}"
# 
# 
# class SupplierActualDeliveryDate(BaseAbstractModel):
#     delivery_date = models.DateField(auto_now_add=True)
#     supplier_po = models.ForeignKey(SupplierPO, on_delete=models.SET_NULL, null=True)
#     supplier_po_delivery_invoice = models.OneToOneField(SupplierPODeliveryInvoice, on_delete=models.SET_NULL, null=True)
# 
#     def get_actual_delivery_grns(self):
#         return self.supplier_po.supplierpogrn_set.all()
#     
#     def get_po_club(self):
#         return self.supplier_po.po_club
#     
#     def get_supplier_delivery_dates(self):
#         return self.supplierdeliverydate_set.all().order_by('id')
# 
#     def is_last_delivery_for_supplier_po_and_material(self, material):
#         last_expected_delivery_date = self.supplier_po.get_last_expected_delivery_for_material(material)
#         last_delivery = True
#         if last_expected_delivery_date:
#             last_delivery = self.supplierdeliverydate_set.filter(pk=last_expected_delivery_date.pk).exists()
#         return last_delivery
# 
# 
# class SupplierRequestedDeliveryDate(BaseAbstractModel):
#     requested_date = models.DateField()
#     supplier_po = models.ForeignKey(SupplierPO, on_delete=models.SET_NULL, null=True)
# 
# 
# class SupplierDeliveryDate(BaseAbstractModel):
#     supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
#     po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.CASCADE, null=True)# This and supplier is needed because there is no way of identifying it without the supplier_po when it is initially created
#     confirmed_delivery_date = models.DateField(null=True)
#     actual_delivery_date = models.ForeignKey(SupplierActualDeliveryDate, on_delete=models.SET_NULL, null=True)
#     supplier_po = models.ForeignKey(SupplierPO, on_delete=models.SET_NULL, null=True)
#     general_po = models.ForeignKey('marketing.GeneralPO', on_delete=models.SET_NULL, null=True)
# 
#     @property
#     def display_number(self):
#         return f"DELIVERY{self.id:06}"
# 
#     @property
#     def is_grn_created(self):
#         status = False
#         grns = self.get_delivery_date_grns()
#         if grns:
#             status = True
#         return status
# 
#     def get_delivery_invoice(self):
#         invoice = None
#         if self.actual_delivery_date:
#             invoice = self.actual_delivery_date.supplier_po_delivery_invoice
#         return invoice
# 
#     def get_delivery_pack_lists(self):
#         invoice = self.get_delivery_invoice()
#         pack_lists = []
#         if invoice:
#             pack_lists = invoice.get_invoice_pack_lists()
#         return pack_lists
# 
#     def get_grns_from_pack_list(self):
#         pack_lists = self.get_delivery_pack_lists()
#         grns = SupplierPOGRN.objects.filter(supplier_pack_list=pack_lists)
#         return grns
# 
#     def get_delivery_date_grns(self):
#         invoice = self.get_delivery_invoice()
#         grns = SupplierPOGRN.objects.none()
#         if invoice:
#             grns = invoice.get_invoice_grns()
#         return grns
# 
#     def get_delivery_date_ordered_quantity(self, material):
#         material_orders = self.purchaseorderclubbomsupplier_set.filter(purchase_order_bom__material=material)
#         normalized_unit = material.material_normalized_measuring_unit
#         quantity = calculate_queryset_total_normalized_quantity(material_orders, normalized_unit, 'quantity', 'quantity_units')
#         return get_quantity_dictionary(quantity, normalized_unit)
# 
#     def get_delivery_date_replacement_quantity(self, material):
#         replacements = self.replacementquantitydeliverydate_set.filter(supplier_po_grn_material__grn_material=material)
#         normalized_unit = material.material_normalized_measuring_unit
#         quantity = calculate_queryset_total_normalized_quantity(replacements, normalized_unit, 'quantity', 'quantity_units')
#         return get_quantity_dictionary(quantity, normalized_unit)
# 
#     def get_material_delivery_quantity_summary(self, material):
#         delivery_grn_ids = self.get_delivery_date_grns().values_list('pk', flat=True)
#         supplier_po_grn_materials = SupplierPOGRNMaterial.objects.filter(supplier_po_grn__in=delivery_grn_ids, grn_material=material, supplier_po_grn__state=SupplierPOGRN.GRN_COMPLETE)
#         quantity_details = calculate_material_delivery_quantity_summary(self, supplier_po_grn_materials, material)
#         return quantity_details
# 
#     def get_allocations_for_po(self, purchase_order, material):
#         total_allocated_quantity = 0
#         bom_ids = PurchaseOrderClubBomSupplier.objects.filter(
#             supplier_delivery_date=self,
#             purchase_order_bom__purchase_order=purchase_order
#         ).values_list('purchase_order_bom', flat=True)
#         boms = PurchaseOrderBom.objects.filter(id__in=bom_ids)
#         for bom in boms:
#             po_allocated_materials = bom.purchaseorderallocatedmaterial_set.filter(purchase_order_bom__material=material)
#             for po_allocated_material in po_allocated_materials:
#                 total_allocated_quantity += po_allocated_material.normalized_allocated_quantity
#         return total_allocated_quantity
# 
# 
# # This is only PurchaseOrderBom - nothing to do with club. Type in name
# class PurchaseOrderClubBomSupplier(BaseAbstractModel):
#     purchase_order_bom = models.ForeignKey(PurchaseOrderBom, on_delete=models.CASCADE, null=True)
#     supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)
#     supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.SET_NULL, null=True)
#     quantity = models.FloatField(null=True)
#     quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     supplier_delivery_date = models.ForeignKey(SupplierDeliveryDate, on_delete=models.SET_NULL, null=True)
#     default_supplier = models.BooleanField(default=False)
#     saved_in_house_material_status = models.BooleanField(default=False)
#     requested_date = models.ForeignKey(SupplierRequestedDeliveryDate, on_delete=models.SET_NULL, null=True)
#     performa_invoice_quanity = models.FloatField(null=True) 
#     performa_invoice_quanity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     general_po_material_quantity = models.ForeignKey('marketing.GeneralPOMaterialQuantity', on_delete=models.SET_NULL, null=True)
# 
#     def get_normalized_quantity(self):
#         material_helper = MaterialUnitHelper()
#         quantity_data = {
#             'quantity': self.quantity,
#             'quantity_unit': self.quantity_units,
#             'quantity_units_display': material_helper.all_measuring_units_dictionary.get(self.quantity_units, "N/A")
#         }
#         if self.quantity_units != MaterialUnitHelper.PIECES_UNIT:
#             quantity_data['quantity_unit'] = MaterialUnitHelper.METERS_UNIT
#             quantity_data['quantity_units_display'] = material_helper.all_measuring_units_dictionary.get(MaterialUnitHelper.METERS_UNIT, "N/A")
#             quantity_units_conversion = MaterialUnitHelper().get_meter_conversion_amount(self.quantity_units)
#             quantity_data['quantity'] = self.quantity * float(quantity_units_conversion)
#         quantity_data['quantity'] = round_if_number(quantity_data['quantity'], 2)
#         return quantity_data
# 
#     def calculate_quantity_price(self):
#         if self.supplier_inquiry_detail:
#             cost_per_unit = self.supplier_inquiry_detail.cost_per_unit
#             costing_units = self.supplier_inquiry_detail.costing_unit
#             quantity = self.quantity
#             quantity_units = self.quantity_units
#             if costing_units == PerMeasuringUnitHelper.PER_PIECE_UNIT:
#                 total_cost = float(quantity) * float(cost_per_unit)
#             else:
#                 costing_unit_flat = MaterialUnitHelper.PER_UNIT_TO_UNIT_MAPPING.get(costing_units, None)
#                 costing_unit_conversion = MaterialUnitHelper().get_meter_conversion_amount(costing_unit_flat)
#                 quantity_units_conversion = MaterialUnitHelper().get_meter_conversion_amount(quantity_units)
#                 total_cost = (float(cost_per_unit) / float(costing_unit_conversion)) * (quantity * float(quantity_units_conversion))
#             total_cost = round(total_cost, 2)
#             return total_cost


class ActualPOClub(BaseAbstractModel, ActualPOClubModelMixin):
    original_po_club = models.ForeignKey(OriginalPOClub, on_delete=models.SET_NULL, null=True)
    uploaded_purchase_order = models.ForeignKey('marketing.UploadedPurchaseOrder', on_delete=models.CASCADE)

    OPEN_STATE = 'open'
    PENDING_PRECOSTING_COMPLETION = 'pending_precosting_completion'
    PENDING_MATERIALS_REVIEW_STATE = 'pending_materials_review'
    PENDING_BOOKING_MARKER_CREATIONS = 'pending_booking_marker_creation'
    PENDING_LEFTOVER_VERIFICATION = 'pending_leftover_verification'
    PENDING_LEFTOVER_MARKER_CREATION = 'pending_leftover_marker_creation'
    PENDING_BOM_VERIFICATION_STATE = 'pending_bom_verification'
    ACTUAL_PO_BOM_FINALIZED = 'actual_po_bom_finalized'
    READY_TO_SEND_BOM_EMAIL = 'ready_to_send_bom_email'
    BOM_EMAILS_SENT = 'bom_emails_sent'
    COMPLETE_STATE = 'complete'
    CANCELED_STATE = 'canceled'
    STATE_OPTIONS = (
        (OPEN_STATE, 'Open'),
        (PENDING_PRECOSTING_COMPLETION, 'Pending Precosting Completion'),
        (PENDING_MATERIALS_REVIEW_STATE, 'Pending Materials Review'),
        (PENDING_LEFTOVER_VERIFICATION, 'Pending Leftover Verification'),
        (PENDING_LEFTOVER_MARKER_CREATION, 'Pending Leftover Marker Creation'),
        (PENDING_BOOKING_MARKER_CREATIONS, 'Pending Booking Marker Creation'),
        (PENDING_BOM_VERIFICATION_STATE, 'Pending BOM Verification'),
        (ACTUAL_PO_BOM_FINALIZED, 'Purchase Order BOM Finalized'),
        (READY_TO_SEND_BOM_EMAIL, 'Ready to send BOM Email'),
        (BOM_EMAILS_SENT, 'Email Sent'),
        (COMPLETE_STATE, 'Complete'),
        (CANCELED_STATE, 'Canceled'),
    )
    state = models.CharField(max_length=200, choices=STATE_OPTIONS, default=OPEN_STATE)
    markers_created = models.BooleanField(default=False)
    material_fob_presentage = models.FloatField(null=True)
    pre_costing = models.ForeignKey(OrderCostingVersion, on_delete=models.SET_NULL, null=True)
    marketing_costing = models.ForeignKey(OrderCostingVersion, on_delete=models.DO_NOTHING, null=True, related_name='marketing_costing_actual_po_club_set')
    
    @property
    def display_number(self):
        return f"POCLUB{self.id:06}"
    
    @property
    def short_code(self):
        version_code = None
        if self.pre_costing:
            version_code = self.pre_costing.short_code
        short_code = '%s / %s' % (version_code, self.display_number)
        return short_code
    
    @property
    def long_code(self):
        version_code = None
        if self.pre_costing:
            version_code = self.pre_costing.long_code
        dispaly_number = '%s / %s' % (version_code, self.display_number)
        return dispaly_number

    @property
    def customer_name(self):
        customer_name = None
        if self.get_purchase_orders():
            purchase_order = self.get_purchase_orders()[0]
            customer_name = purchase_order.customer.name
        return customer_name
    
    @property
    def plant(self):
        plant = None
        if self.get_purchase_orders():
            purchase_order = self.get_purchase_orders()[0]
            plant = purchase_order.plant
        return plant
    
    @property
    def style_number(self):
        style_number = None
        if self.get_purchase_orders():
            purchase_order = self.get_purchase_orders()[0]
            style_number = purchase_order.costing_version.order.style_number
        return style_number
    
    @property
    def is_single_po(self):
        is_single_po = False
        count = self.get_purchase_orders().filter().count()
        if count == 1:
            is_single_po = True
        return is_single_po
    
    @property
    def total_fob_value(self):
        pos = self.get_purchase_orders()
        total_value = calculate_queryset_total_amount_normalized_amount(pos, 'total_fob_value')
        return total_value
    
    @property
    def max_pcl_value(self):
        pos = self.get_purchase_orders()
        max_pcl_value = calculate_queryset_total_amount_normalized_amount(pos, 'max_pcl_value')
        return max_pcl_value
    
    @property
    def total_raw_material_cost(self):
        pos = self.get_purchase_orders()
        total_cost = calculate_queryset_total_amount_normalized_amount(pos, 'total_raw_material_cost')
        return total_cost

    @property
    def total_fabric_cost(self):
        pos = self.get_purchase_orders()
        total_cost = calculate_queryset_total_amount_normalized_amount(pos, 'total_fabric_cost')
        return total_cost
    
    @property
    def total_sewing_trim_cost(self):
        pos = self.get_purchase_orders()
        total_cost = calculate_queryset_total_amount_normalized_amount(pos, 'total_sewing_trim_cost')
        return total_cost
    
    @property
    def total_packing_trim_cost(self):
        pos = self.get_purchase_orders()
        total_cost = calculate_queryset_total_amount_normalized_amount(pos, 'total_packing_trim_cost')
        return total_cost
    
    @property
    def total_wash_service_cost(self):
        pos = self.get_purchase_orders()
        total_cost = calculate_queryset_total_amount_normalized_amount(pos, 'total_wash_service_cost')
        return total_cost
    
    @property
    def total_embellishment_service_cost(self):
        pos = self.get_purchase_orders()
        total_cost = calculate_queryset_total_amount_normalized_amount(pos, 'total_embellishment_service_cost')
        return total_cost

    def get_actual_po_club_items(self):
        return self.actualpoclubitem_set.all()

    def get_matching_po_packs(self, po_club_colorway, po_club_country, po_club_size):
        po_colorways = po_club_colorway.get_purchase_order_colorways()
        po_countries = po_club_country.get_purchase_order_countries()
        po_sizes = po_club_size.get_purchase_order_sizes()
        packs = POPack.objects.filter(
            po_colorway_id__in=po_colorways.values_list('id', flat=True),
            po_country_id__in=po_countries.values_list('id', flat=True),
            po_size_id__in=po_sizes.values_list('id', flat=True),
        )
        return packs

    def validate_po_club_completed(self):
        return self.uploaded_purchase_order.clubbing_complete

    def create_event(self, email_type):
        from shared.scripts.create_email_event import EmailNotification
        EmailEvent.objects.create(
            email_type=email_type,
            email_status=EmailEvent.PENDING_STATUS,
            object_type=EmailNotification.OBJECT_TYPE_ACTUAL_PO_CLUB,
            object_id=self.id
        )

    def validate_delivery_quantities(self):
        not_complete = GeneralPOMaterialQuantity.objects.filter(general_po__po_club=self, completed=False).exists()
        return not_complete
    
    def validate_fabric_material_completed_in_pre_costing(self):
        is_complete_fabric = CostingCompletedMaterial.objects.filter(costing_version=self.pre_costing, material__name=Material.FABRIC_MATERIAL).exists()
        return is_complete_fabric
    
    def validate_fabric_material_completed_in_po_club(self):
        is_complete_fabric = POClubCompletedMaterial.objects.filter(po_club=self, material__name=Material.FABRIC_MATERIAL).exists()
        return is_complete_fabric

    def move_to_next_state(self, new_state):
        state_transition_errors = []
        club_completed = self.validate_po_club_completed()
        response = {}
        if self.purchase_order_materials_complete() or self.purchase_order_cad_complete():
            if new_state == self.OPEN_STATE and self.state not in [self.OPEN_STATE]:
                self.state = self.OPEN_STATE
            if new_state == self.PENDING_MATERIALS_REVIEW_STATE:
                if self.validate_fabric_material_completed_in_pre_costing() and self.validate_fabric_material_completed_in_po_club():
                    self.state = self.PENDING_MATERIALS_REVIEW_STATE
                    self.create_po_fabric_default_widths()
                else:
                    state_transition_errors.append('Make sure fabric is completed in pre costing and po club')
            elif new_state == self.PENDING_LEFTOVER_VERIFICATION:
                #self.generate_po_club_purchase_order_bom(True) #change in 2025-06-18
                self.create_fabric_material_inhouse_verification()
                #self.create_other_material_inhouse_verification() #change in 2025-06-18
                # self.create_po_fabric_default_widths() #change in 2025-06-18
                if self.get_po_club_left_over_fabric_exist():
                    self.state = self.PENDING_LEFTOVER_VERIFICATION
                else:
                    self.state = self.PENDING_BOOKING_MARKER_CREATIONS
            elif new_state == self.PENDING_LEFTOVER_MARKER_CREATION:
                self.create_marker_action_task()
                self.state = self.PENDING_LEFTOVER_MARKER_CREATION
            elif new_state == self.PENDING_BOOKING_MARKER_CREATIONS:
                self.create_po_fabric_default_widths()
                self.create_marker_action_task()
                self.state = self.PENDING_BOOKING_MARKER_CREATIONS
            elif new_state == self.PENDING_BOM_VERIFICATION_STATE:
                if self.validate_consumption_ratio_complete():
                    self.state = self.PENDING_BOM_VERIFICATION_STATE
                    self.save()
                    # for po in self.get_purchase_orders():
                    #     if po.state == PurchaseOrder.MATERIALS_ASSIGNED:
                    #         po.move_to_next_state(PurchaseOrder.CAD_COMPLETED)
                    #self.calculate_placement_level_consumptions() # TODO Need to verify with dasith sir
                    from shared.scripts.create_email_event import EmailNotification
                    self.create_event(EmailNotification.EMAIL_TYPE_MERCHANT_NOTIFICATION)
                else:
                    state_transition_errors.append('Make sure all the data is filled in the marker CAD details')

            elif new_state == self.READY_TO_SEND_BOM_EMAIL:
                #po_club supplier_po pdf
                if not self.validate_delivery_quantities():
                    incomplete_purchase_order_club_bom_suppliers = SupplierDeliveryDateQuantity.objects.filter(general_po_material_quantity__general_po__po_club=self).filter(supplier_delivery_date=None)
                    print(incomplete_purchase_order_club_bom_suppliers)
                    if not incomplete_purchase_order_club_bom_suppliers.exists():
                        # from supplier_po.helpers.supplier_po_bom_generator import SupplierPOBOM
                        # SupplierPOBOM().process_boms(self)
                        self.state = new_state
                        # general_po = self.get_general_po()
                        # if general_po:
                        #     general_po.state = GeneralPO.READY_TO_SENT_PO
                        #     general_po.save()
                    else:
                        state_transition_errors.append('Please make sure to enter a delivery date for every material')
                else:
                    state_transition_errors.append('Please make sure to complete every material')
                
            elif new_state in [self.READY_TO_SEND_BOM_EMAIL]:
                self.state = new_state

            elif new_state == self.BOM_EMAILS_SENT:
                self.state = new_state
                for po in self.get_purchase_orders():
                    po.set_po_pack_cost()
                    deliveries = po.purchaseorderdelivery_set.all()
                    for delivery in deliveries:
                        delivery.set_total_amount()
                self.set_calculated_values()
                general_po = self.get_general_po()
                if general_po:
                    general_po.state = GeneralPO.PO_SENT
                    general_po.save()
            elif new_state == self.COMPLETE_STATE:
                self.state = self.COMPLETE_STATE
            self.save()
            response = {'valid': True, 'club_completed': club_completed}

        elif new_state == self.CANCELED_STATE:
            self.state = self.CANCELED_STATE

        else:
            state_transition_errors.append('Please make sure that materials are assigned for every purchase order in the clubbing')

        if state_transition_errors:
            response = {'valid': False,  'club_completed': club_completed, 'errors': state_transition_errors}
        else:
            self.save()
        return response

    def purchase_order_materials_complete(self):
        purchase_orders = self.get_purchase_orders()
        material_assigned_pos = purchase_orders.filter(state=PurchaseOrder.MATERIALS_ASSIGNED)
        return purchase_orders.count() == material_assigned_pos.count()

    def purchase_order_cad_complete(self):
        purchase_orders = self.get_purchase_orders()
        cad_completed_pos = purchase_orders.filter(state=PurchaseOrder.CAD_COMPLETED)
        return purchase_orders.count() == cad_completed_pos.count()

    # def get_club_markers_for_supplier_inquiry_detail(self):
    #     markers = self.get_markers()
    #     po_fabric_marker_supplier_inquiry_details = POFabricMarkerSupplierInquiryDetail.objects.filter(
    #         po_marker__in=markers)
    #     return po_fabric_marker_supplier_inquiry_details

    def validate_consumption_ratio_complete(self):
        # TODO Mahesh - complete this validation
        markers = self.get_markers()
        has_complete = False
        exist_po_markers = markers.filter(reviewed=False).exists()
        if not exist_po_markers:
            has_complete = True
        # for item_id in self.get_item_ids():
        #     item_fabric_placements = self.get_pack_item_fabric_placements(item_id)
        #     material_ids = item_fabric_placements.values_list('po_material_id', flat=True).distinct()
        #     materials = CustomerBrandMaterial.objects.filter(pk__in=material_ids)
        #     for material in materials:
        #         po_fabric_markers = material.pofabricmarker_set.filter(actual_club=self)
        #         if not po_fabric_markers.exists():
        #             has_complete = False
        fabric_materials = self.get_fabrics_in_po_club()
        for material in fabric_materials:
            po_fabric_markers = material.pofabricmarker_set.filter(actual_club=self)
            if not po_fabric_markers.exists():
                has_complete = False
        return has_complete
    
    def validate_marker_create_for_fabrics(self):
        has_complete = True
        fabric_materials = self.get_fabrics_in_po_club()
        for material in fabric_materials:
            po_fabric_markers = material.pofabricmarker_set.filter(actual_club=self)
            if not po_fabric_markers.exists():
                has_complete = False
        return has_complete

    def get_purchase_orders(self):
        purchase_orders = self.purchaseorder_set.all()
        return purchase_orders

    def get_markers(self):
        markers = self.pofabricmarker_set.all()
        return markers

    def get_po_item_ids(self):
        pos = self.get_purchase_orders()
        po_items = POItem.objects.filter(purchase_order__in=pos)
        return po_items

    def get_item_ids(self):
        purchase_orders = self.get_purchase_orders()

        po_item_ids = []

        for purchase_order in purchase_orders:
            po_items = purchase_order.get_po_items()
            items = po_items.values_list('order_item__item_id', flat=True)
            po_item_ids = [*po_item_ids, *list(items)]

        item_ids = list(set(po_item_ids))
        return item_ids

    def get_all_pack_item_placements_in_clubbing(self, material_type):
        print(material_type)
        purchase_orders = self.get_purchase_orders()
        placements = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__purchase_order__in=purchase_orders,
            costing_pack_item_placement__item_attribute_other__type=material_type
        )
        return placements
    
    def get_all_material_type_pack_item_placements_in_clubbing(self):
        purchase_orders = self.get_purchase_orders()
        placements = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__purchase_order__in=purchase_orders
        )
        return placements

    def get_all_pack_item_placements_in_clubbing_by_material(self, materials):
        purchase_orders = self.get_purchase_orders()
        placements = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__purchase_order__in=purchase_orders,
            po_material__in=materials
        )
        return placements

    def get_pack_item_fabric_placements(self, item_id):
        pack_item_placements = self.get_all_pack_item_placements_in_clubbing(Material.FABRIC_MATERIAL).filter(
            po_pack_item__po_item__order_item__item_id=item_id
        )
        return pack_item_placements

    def get_materials_in_po_club(self, material_type=None):
        purchase_orders = self.get_purchase_orders()
        pack_item_placements = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__purchase_order__in=purchase_orders,
        )
        pack_placements = POPackPlacement.objects.filter(
            po_pack__purchase_order__in=purchase_orders,
        )
        if material_type:
            pack_item_placements = pack_item_placements.filter(
                costing_pack_item_placement__item_attribute_other__type=material_type
            )
            pack_placements = pack_placements.filter(
                costing_pack_placement__item_attribute_other__type=material_type
            )
        pack_material_ids = pack_placements.values('po_material_id', ).distinct()
        pack_item_material_ids = pack_item_placements.values('po_material_id', ).distinct()

        all_materials = [*pack_material_ids, *pack_item_material_ids]
        data = get_material_details(all_materials, 'po_material_id')
        return data
    
    def get_fabrics_in_po_club(self):
        material_ids = POPackItemPlacement.objects.filter(
            po_pack_item__po_pack__purchase_order__actual_po_club=self,
            po_material__material_detail__generic_material__user_material__category=Material.FABRIC_MATERIAL
        ).distinct('po_material').values_list('po_material', flat=True)
        entity_type = ContentType.objects.get_for_model(ActualPOClub)
        bcr_material_ids = BOMChangeRequestMaterialChange.objects.filter(bom_change_request_type__bom_change_request__entity_type=entity_type,
                                                                         bom_change_request_type__bom_change_request__entity_id=self.id,
                                                                         new_material__material_detail__generic_material__user_material__category=Material.FABRIC_MATERIAL).distinct('new_material').values_list('new_material', flat= True)
        all_material_ids = list(material_ids) + list(bcr_material_ids)
        fabrics = CustomerBrandMaterial.objects.filter(id__in=all_material_ids)
        return fabrics

    def get_fabric_widths(self, customer_brand_material_id):
        widths = FabricWidth.objects.filter(actual_po_club=self, customer_brand_material=customer_brand_material_id)
        return widths

    def create_po_fabric_default_widths(self):
        placements = self.get_all_pack_item_placements_in_clubbing(Material.FABRIC_MATERIAL)
        customer_brand_material_ids = placements.values_list('po_material_id', flat=True).distinct()

        for customer_brand_material_id in customer_brand_material_ids:
            inquiries = self.get_material_selected_supplier_inquiry_details(customer_brand_material_id)

            if not inquiries.exists():
                inquiries = self.get_fabric_selected_supplier_inquiry_detail_by_customer_code(customer_brand_material_id)
            for inquiry in inquiries:
                width = FabricWidth.objects.get_or_create(
                    actual_po_club=self,
                    customer_brand_material_id=customer_brand_material_id,
                    width=inquiry.cutting_width,
                    width_unit=inquiry.cutting_width_unit
                )[0]
                FabricWidthSupplier.objects.get_or_create(width=width, supplier_inquiry_detail=inquiry)

    def get_club_packs(self):
        pos = self.get_purchase_orders()
        packs = POPack.objects.filter(purchase_order__in=pos)
        return packs

    def get_material_selected_supplier_inquiry_details(self, customer_brand_material_id):
        pos = self.get_purchase_orders()
        versions = OrderCostingVersion.objects.filter(pk__in=pos.values_list('costing_version_id', flat=True))
        supplier_inquiries = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
            order_costing_version__in=versions,
            customer_brand_material_id=customer_brand_material_id,
        ).values_list('supplier_inquiry_detail_id', flat=True)
        supplier_inquiry_details = SupplierInquiryDetail.objects.filter(pk__in=supplier_inquiries, supplier_inquiry__version__in=versions)
        return supplier_inquiry_details

    def get_fabric_selected_supplier_inquiry_detail_by_customer_code(self, customer_brand_material_id):
        customer_brand_material = CustomerBrandMaterial.objects.get(pk=customer_brand_material_id)
        pos = self.get_purchase_orders()
        versions = OrderCostingVersion.objects.filter(pk__in=pos.values_list('costing_version_id', flat=True))
        material_details = GenericMaterialVariation.objects.filter(
            generic_material_id=customer_brand_material.material_detail.generic_material_id,
            user_defined_material_data__fabric_type=customer_brand_material.material_detail.user_defined_material_data.get('fabric_type', None)
        )
        supplier_inquiries = OrderCostingColorwayMaterialSupplierInquiry.objects.filter(
            order_costing_version__in=versions,
            customer_brand_material__material_detail__in=material_details
        ).values_list('supplier_inquiry_detail_id', flat=True)
        supplier_inquiry_details = SupplierInquiryDetail.objects.filter(pk__in=supplier_inquiries, supplier_inquiry__version__in=versions)
        return supplier_inquiry_details

    def organize_club_placement_material_bom_data(self, placements, material_data):
        for placement in placements:
            material = placement.po_material
            material_quantity = placement.material_quantity
            material_quantity_units = placement.material_quantity_units
            supplier_inquiry = placement.supplier_inquiry_detail

            if not material_data.get(material.pk, None):
                material_data[material.pk] = {}

            if not material_data[material.pk].get(supplier_inquiry.pk, None):
                material_data[material.pk][supplier_inquiry.pk] = {"quantity": 0, "measuring_unit": material_quantity_units}

            material_data[material.pk][supplier_inquiry.pk]["quantity"] += material_quantity

            if material_data[material.pk][supplier_inquiry.pk]["measuring_unit"] != material_quantity_units:
                raise POMaterialMismatchException("Units mismatch")
        return material_data

    def aggregate_bom_by_material_and_supplier_inquiry_detail_and_create_bom(self, user_defined_material):
        purchase_orders = self.get_purchase_orders()
        purchase_order_boms = PurchaseOrderBom.objects.filter(purchase_order__in=purchase_orders)
        success = True
        self.generate_general_po_materials(user_defined_material)
        self.generate_general_service_po_services()

        # if purchase_order_boms:
        #     aggregated_data = purchase_order_boms.values('material', 'supplier_inquiry_detail', 'measuring_unit').annotate(total_quantity=Sum('quantity'))

        #     for data in aggregated_data:
        #         club_bom, created = ActualClubBom.objects.get_or_create(actual_club=self, material_id=data['material'])
        #         if created:
        #             club_bom.quantity = data['total_quantity']
        #             club_bom.quantity_units = data['measuring_unit']
        #             club_bom.order_quantity = data['total_quantity']
        #         else:
        #             club_bom.quantity = float(data['total_quantity'])
        #             club_bom.measuring_unit = data['measuring_unit']
        #         club_bom.save()
                
        #         # filtered_purchase_order_boms = purchase_order_boms.filter(supplier_inquiry_detail_id=data['supplier_inquiry_detail'], material_id=data['material'])
                
        #         # for purchase_order_bom in filtered_purchase_order_boms:
        #         #     club_bom_supplier, created = PurchaseOrderClubBomSupplier.objects.get_or_create(
        #         #         purchase_order_bom=purchase_order_bom,
        #         #         supplier_inquiry_detail=purchase_order_bom.supplier_inquiry_detail
        #         #     )
        #         #     club_bom_supplier.supplier = purchase_order_bom.supplier_inquiry_detail.supplier_inquiry.supplier
        #         #     club_bom_supplier.supplier_inquiry_detail = purchase_order_bom.supplier_inquiry_detail
        #         #     club_bom_supplier.quantity = purchase_order_bom.quantity
        #         #     club_bom_supplier.quantity_units = purchase_order_bom.measuring_unit
        #         #     club_bom_supplier.default_supplier = True
        #         #     club_bom_supplier.save()
        #else:
        #    success = False

        return success
    
    def get_materials_in_club(self):
        material_ids = PurchaseOrderBom.objects.filter(purchase_order__actual_po_club=self).values_list('material', flat=True)
        materials = CustomerBrandMaterial.objects.filter(id__in=material_ids).distinct().order_by(
            'material_detail__generic_material__user_material__display_order'
        )
        return materials
    
    def get_material_categories(self):
        material_ids = PurchaseOrderBom.objects.filter(purchase_order__actual_po_club=self).values_list('material', flat=True)
        material_categories = CustomerBrandMaterial.objects.filter(id__in=material_ids).distinct().order_by(
            'material_detail__generic_material__user_material__display_order'
        ).values_list('material_detail__generic_material__user_material__material', flat=True)
        return material_categories

    def get_delivery_dates(self):
        supplier_pos = self.get_supplier_pos()
        supplier_delivery_dates = SupplierDeliveryDate.objects.filter(
            general_po_supplier__in=supplier_pos.filter().values_list('general_po_supplier', flat=True))
        return supplier_delivery_dates

    def get_fabric_acceptable_color_tone(self, material):
        acceptable_colot_tones = None
        po_club_material_color_tone = get_object_or_none(POClubMaterialColorTone,
            {'po_club': self, 'material' :material.customer_brand_material}
        )
        if po_club_material_color_tone:
            acceptable_colot_tones = po_club_material_color_tone.acceptable_color_tones.all()
        return acceptable_colot_tones

    def get_marketing_costing(self):
        costing = None
        purchase_order = self.get_purchase_orders()[0] if self.get_purchase_orders() else None
        if purchase_order:
            costing = purchase_order.marketing_costing
        return costing

    def get_costing(self):
        costing = None
        purchase_order = self.get_purchase_orders()[0] if self.get_purchase_orders() else None
        if purchase_order:
            if purchase_order.costing_version:
                costing = purchase_order.costing_version
        return costing

    def get_organized_po_club_bom_data_by_material(self, user_defined_material):
        purchase_orders = self.get_purchase_orders()
        purchase_order_boms = PurchaseOrderBom.objects.filter(purchase_order__in=purchase_orders, material__material_detail__generic_material__user_material=user_defined_material)
        material_ids = purchase_order_boms.values_list('material_id', flat=True).distinct()
        data = []
        for material_id in material_ids:
            material_boms = purchase_order_boms.filter(material_id=material_id)

            customer_brand_material = material_boms[0].material
            normalized_unit = customer_brand_material.material_normalized_measuring_unit

            quantity = calculate_queryset_total_normalized_quantity(material_boms, normalized_unit, 'quantity', 'measuring_unit')
            #BOM quantity debug
            material_data = {
                'material': customer_brand_material,
                'supplier_inquiry_detail': material_boms.order_by('supplier_inquiry_detail__cost_per_unit')[0].supplier_inquiry_detail,
                'required_quantity': get_quantity_dictionary(ceil_number(quantity), normalized_unit)
            }
            data.append(material_data)
        return data
    
    def get_is_pos_sent(self):
        costing = self.get_costing()
        general_pos = GeneralPO.objects.filter(po_club=self, costing=costing)
        is_exists = SupplierPO.objects.filter(general_po_supplier__general_po__in=general_pos, state__in=[SupplierPO.EMAIL_SENT_STATE, SupplierPO.COMPLETE_STATE]).exists()
        return is_exists

    def get_or_create_po_club_general_po(self):
        costing = self.get_costing()
        general_po, created = GeneralPO.objects.get_or_create(
            po_club=self,
            costing=costing,
            state=GeneralPO.DRAFT
        )
        if not self.get_is_pos_sent():
            general_po.state = GeneralPO.DRAFT
        return general_po
    
    def get_general_po(self):
        costing = self.get_costing()
        general_po = get_object_or_none(GeneralPO, {'costing': costing, 'po_club': self})
        return general_po
    
    def get_or_create_general_po_supplier(self, general_po, supplier, supplier_material):
        general_po_supplier = None
        general_po_suppliers = GeneralPOSupplier.objects.filter(
            general_po=general_po,
            supplier=supplier,
            supplierpo__isnull=True
        ).order_by('-pk')

        supplier_pos = SupplierPO.objects.filter(
            Q(supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material=supplier_material),
            general_po_supplier__general_po=general_po,
            general_po_supplier__supplier=supplier
        ).exclude(state=SupplierPO.DRAFT_STATE)

        if not supplier_pos.exists():# check if there is generated supplier po not in draft state for this material
            if general_po_suppliers.exists():
                general_po_supplier = general_po_suppliers.first()
            else:
                supplier_pos = SupplierPO.objects.filter(
                    Q(supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material=supplier_material),
                    general_po_supplier__general_po=general_po,
                    general_po_supplier__supplier=supplier,
                    state=SupplierPO.DRAFT_STATE
                )
                if supplier_pos.exists():# check if there is generated supplier po in draft state for this material
                    general_po_supplier = supplier_pos.first().general_po_supplier
                else:
                    supplier_pos = SupplierPO.objects.filter(
                        general_po_supplier__general_po=general_po,
                        general_po_supplier__supplier=supplier,
                        state=SupplierPO.DRAFT_STATE
                    )
                    if supplier_pos.exists():# check if there is generated supplier po in draft state for this supplier
                        general_po_supplier = supplier_pos.first().general_po_supplier
                    else:
                        supplier_pos = SupplierPO.objects.filter(
                            Q(supplierpogeneralpomaterialquantity__general_po_material_quantity__default_material_supplier__supplier_material=supplier_material),
                            general_po_supplier__general_po=general_po,
                            general_po_supplier__supplier=supplier
                        ).exclude(state=SupplierPO.DRAFT_STATE)

                        if not supplier_pos.exists(): # check if there is generated supplier po not in draft state for this material
                            # create GeneralPOSupplier
                            general_po_supplier = GeneralPOSupplier.objects.create(
                                general_po=general_po,
                                supplier=supplier
                            )
        return general_po_supplier
    
    def get_or_create_general_po_supplier_material_price(self, general_po_supplier, supplier_material, supplier_inquiry_detail):
        general_po_supplier_material_price = get_object_or_none(GeneralPOSupplierMaterialPrice,
                                                                {
                                                                    'supplier_material': supplier_material,
                                                                    'general_po_supplier__supplier': general_po_supplier.supplier,
                                                                    'general_po_supplier__general_po__po_club': general_po_supplier.general_po.po_club,
                                                                    'supplier_inquiry_detail': supplier_inquiry_detail
                                                                })
        if general_po_supplier_material_price:
            general_po_supplier_material_price.general_po_supplier = general_po_supplier
            general_po_supplier_material_price.save()
        else:
            general_po_supplier_material_price = GeneralPOSupplierMaterialPrice.objects.create(
                supplier_material=supplier_material,
                general_po_supplier=general_po_supplier,
                supplier_inquiry_detail=supplier_inquiry_detail
            )
        return general_po_supplier_material_price

    def generate_general_po_materials(self, user_defined_material):
        organized_bom_data = self.get_organized_po_club_bom_data_by_material(user_defined_material)
        success = len(organized_bom_data) > 0
        for organized_bom_row in organized_bom_data:
            #print(organized_bom_row)
            general_po = self.get_or_create_po_club_general_po()

            supplier_inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'pk': organized_bom_row['supplier_inquiry_detail'].pk})
            supplier = supplier_inquiry_detail.supplier_inquiry.supplier
            supplier_material = supplier_inquiry_detail.supplier_inquiry_material_code.get_related_supplier_material_for_different_supplier_material(organized_bom_row['material'], True)
            general_po_supplier = self.get_or_create_general_po_supplier(general_po, supplier, supplier_material)
            print(general_po_supplier)
            if not general_po_supplier:
                continue
            
            default_material_supplier = self.get_or_create_general_po_supplier_material_price(general_po_supplier, supplier_material, supplier_inquiry_detail)

            default_material_supplier.lead_time = supplier_inquiry_detail.lead_time
            default_material_supplier.costing_price = supplier_inquiry_detail.cost_per_unit
            default_material_supplier.costing_price_units = supplier_inquiry_detail.costing_unit
            default_material_supplier.order_price = supplier_inquiry_detail.cost_per_unit
            default_material_supplier.order_price_units = supplier_inquiry_detail.costing_unit
            default_material_supplier.excess_threshold = supplier_inquiry_detail.excess_threshold
            default_material_supplier.save()

            general_po_material_quantity, created = GeneralPOMaterialQuantity.objects.get_or_create(general_po=general_po, material=organized_bom_row['material'], default_material_supplier=default_material_supplier)
            if created:
                general_po_material_quantity.quantity = organized_bom_row['required_quantity']['quantity']
                general_po_material_quantity.measuring_unit = organized_bom_row['required_quantity']['quantity_units']
                general_po_material_quantity.order_quantity = organized_bom_row['required_quantity']['quantity']
                general_po_material_quantity.order_quantity_units = organized_bom_row['required_quantity']['quantity_units']
                general_po_material_quantity.supplier_inquiry_detail = supplier_inquiry_detail
                general_po_material_quantity.default_material_supplier = default_material_supplier
                general_po_material_quantity.send_po_for_material = True
            else:
                general_po_material_quantity.quantity = organized_bom_row['required_quantity']['quantity']
                general_po_material_quantity.order_quantity = organized_bom_row['required_quantity']['quantity']
                general_po_material_quantity.order_quantity_units = organized_bom_row['required_quantity']['quantity_units']
                general_po_material_quantity.default_material_supplier = default_material_supplier
                #general_po_material_quantity.quantity = float(organized_bom_row['required_quantity']['quantity'])
                general_po_material_quantity.measuring_unit = organized_bom_row['required_quantity']['quantity_units']

            general_po_material_quantity.save()

            supplier_delivery_date_quantity, created = SupplierDeliveryDateQuantity.objects.get_or_create(
                general_po_material_quantity=general_po_material_quantity,
                material_supplier=default_material_supplier,
                default_supplier=True
            )
            # supplier_delivery_date_quantity.supplier = purchase_order_bom.supplier_inquiry_detail.supplier_inquiry.supplier
            # supplier_delivery_date_quantity.supplier_inquiry_detail = purchase_order_bom.supplier_inquiry_detail
            supplier_delivery_date_quantity.quantity = organized_bom_row['required_quantity']['quantity']
            supplier_delivery_date_quantity.quantity_units = organized_bom_row['required_quantity']['quantity_units']
            supplier_delivery_date_quantity.proforma_invoice_quantity = organized_bom_row['required_quantity']['quantity']
            supplier_delivery_date_quantity.proforma_invoice_quantity_units = organized_bom_row['required_quantity']['quantity_units']
            supplier_delivery_date_quantity.default_supplier = True
            supplier_delivery_date_quantity.save()
        return success
    
    def get_organized_po_club_service_data(self):
        purchase_orders = self.get_purchase_orders()
        po_pack_services = POPackItemService.objects.filter(po_pack_item__po_pack__purchase_order__in=purchase_orders)
        data = []
        for po_pack_service in po_pack_services:
            service_object = po_pack_service.get_service_object()
            attributes = po_pack_service.get_attributes()
            supplier_inquiry_detail = po_pack_service.costing_po_pack_item_service.get_pack_item_service_selected_supplier_inquiry_detail().supplier_inquiry_detail if po_pack_service.costing_po_pack_item_service else None
            material_data = {
                'service': service_object,
                'service_type': service_object.service_type,
                'attributes': attributes,
                'supplier_inquiry_detail': supplier_inquiry_detail,
                'required_quantity': get_quantity_dictionary(ceil_number(0), 'meters') #TODO mahesh
            }
            data.append(material_data)
        return data
    
    def get_or_create_po_club_general_service_po(self):
        general_service_po, created = GeneralServicePO.objects.get_or_create(
                po_club=self
            )
        general_service_po.state = GeneralServicePO.DRAFT
        general_service_po.save()
        return general_service_po
    
    def generate_general_service_po_services(self):
        organized_service_data = self.get_organized_po_club_service_data()
        for organized_service_data_row in organized_service_data:
            general_service_po = self.get_or_create_po_club_general_service_po()

            supplier_inquiry_detail = get_object_or_none(SupplierInquiryDetail, {'pk': organized_service_data_row['supplier_inquiry_detail'].pk})
            general_service_po_supplier, created = GeneralServicePOSupplier.objects.get_or_create(
                general_service_po=general_service_po,
                supplier=supplier_inquiry_detail.supplier_inquiry.supplier
            )
            general_service_po_service = None
            content_type = None
            if organized_service_data_row['service_type'] == PackItemService.WASH_SERVICE_TYPE:
                content_type = ContentType.objects.get_for_model(POPackItemWashService)
            elif organized_service_data_row['service_type'] == PackItemService.EMBELLISHMENT_SERVICE_TYPE:
                content_type = ContentType.objects.get_for_model(POPackItemEmbellishmentService)

            service = organized_service_data_row['service']
            general_service_po_supplier_price, created = GeneralServicePOSupplierPrice.objects.get_or_create(
                general_service_po_supplier=general_service_po_supplier,
                supplier_inquiry_detail=supplier_inquiry_detail,
                entity_type=content_type,
                entity_id=service.id,
                service_detail=organized_service_data_row['attributes']
            )
            general_service_po_supplier_price.price = supplier_inquiry_detail.cost_per_unit
            general_service_po_supplier_price.price_currency = CurrencyHelper.USD_CURRENCY
            general_service_po_supplier_price.lead_time = supplier_inquiry_detail.lead_time
            general_service_po_supplier_price.costing_price = supplier_inquiry_detail.cost_per_unit
            general_service_po_supplier_price.costing_price_units = supplier_inquiry_detail.costing_unit
            general_service_po_supplier_price.save()

            general_service_po_service, created = GeneralServicePOService.objects.get_or_create(
                general_service_po=general_service_po,
                entity_type=content_type,
                entity_id=service.id,
                service_detail=organized_service_data_row['attributes']
            )
            general_service_po.service_detail = organized_service_data_row['attributes']
            general_service_po.save()
            

            if general_service_po_service:
                pass
            #general_po_material_quantity, created = GeneralServicePOServiceDelivery.objects.get_or_create(general_po=general_po, material=organized_bom_row['material'])

        return True

    def get_po_club_material_required_quantity(self, customer_brand_material):
        material_boms = PurchaseOrderBom.objects.filter(
            purchase_order__actual_po_club=self,
            material=customer_brand_material
        )
        material_unit = customer_brand_material.material_normalized_measuring_unit
        quantity = calculate_queryset_total_normalized_quantity(material_boms, material_unit, 'quantity', 'measuring_unit')
        return get_quantity_dictionary(quantity, material_unit)
    
    def get_po_club_left_over_fabric_exist(self):
        left_over_material_exist = POClubLeftOverMaterial.objects.filter(
            po_club=self,
            in_house_material__supplier_material__customer_brand_material__material_detail__generic_material__user_material__name=Material.FABRIC_MATERIAL
        ).exists()
        return left_over_material_exist
    
    def get_supplier_pos(self):
        supplier_pos = SupplierPO.objects.filter(general_po_supplier__general_po__po_club=self).exclude(state=SupplierPO.CANCEL_STATE)
        return supplier_pos
    
    def get_invoices(self):
        supplier_pos = self.get_supplier_pos()
        supplier_po_delivery_invoice_ids = SupplierActualDeliveryDate.objects.filter(supplier_po__in=supplier_pos).values_list('supplier_po_delivery_invoice', flat=True)
        invoices = SupplierPODeliveryInvoice.objects.filter(pk__in=supplier_po_delivery_invoice_ids)
        return invoices
    
    def set_calculated_values(self):
        for po in self.get_purchase_orders():
            po.set_calculated_values()
        self.material_fob_presentage = self.calculate_material_fob_percentage()
        self.save()
    
    def get_supplier_po_raw_material_total_paid(self):
        total_paid = 0
        # invoices = self.get_invoices()
        # outgoing_payments = OutgoingPayment.objects.filter(id__in=invoices.filter().values_list('payment', flat=True))
        # total_paid = calculate_queryset_total_amount_normalized_amount(outgoing_payments, 'amount')
        return total_paid
    
    def get_real_pcl_value(self):
        real_pcl_value = self.get_supplier_po_raw_material_total_cost() * self.material_fob_presentage
        return real_pcl_value

    def get_pcl_utilized_value(self):
        pcl_utilized_value = 0
        if self.material_fob_presentage > 70:
            pcl_utilized_value = self.get_max_pcl_value()
        return pcl_utilized_value

    def get_pcl_excess_value(self):
        pcl_excess_value = 0
        pcl_max_value = self.get_max_pcl_value()
        pcl_real_value = self.get_real_pcl_value()
        pcl_excess_value = pcl_max_value - pcl_real_value
        if pcl_excess_value > 0:
            return pcl_excess_value
        else:
            return 0

    def get_pcl_short_value(self):
        pcl_short_value = 0
        pcl_max_value = self.get_max_pcl_value()
        pcl_real_value = self.get_real_pcl_value()
        pcl_short_value = pcl_max_value - pcl_real_value
        if pcl_short_value < 0:
            return abs(pcl_short_value)
        else:
            return 0

    def get_pcl_available_value(self):
        available_value = 0
        if self.get_pcl_excess_value() > 0:
            available_value = self.get_pcl_excess_value() - self.get_pcl_used_value()
            return available_value
        return available_value

    def get_pcl_used_value(self):
        #outgoing_payments = self.get_outgoing_payments()
        pcls = self.get_supplier_po_delivery_invoice_pcls()
        used_value = calculate_queryset_total_amount_normalized_amount(pcls, 'amount', 'amount_currency')
        return used_value

    def get_incoming_payments(self):
        outgoing_comercial_invoice_ids = PurchaseOrderDelivery.objects.filter(
            purchase_order__in=self.get_purchase_orders()
        ).values_list('outgoing_commercial_invoice', flat=True)
        outgoing_payments = OutgoingCommercialInvoice.objects.filter(
            id__in=outgoing_comercial_invoice_ids
        )
        incoming_payments = IncomingPayment.objects.filter(outgoing_commercial_invoice__in=outgoing_payments)
        return incoming_payments

    def get_outgoing_payments(self):
        invoices = self.get_invoices()
        supplier_pos = self.get_supplier_pos()
        invoice_ct = ContentType.objects.get_for_model(SupplierPODeliveryInvoice)
        supplier_po_ct = ContentType.objects.get_for_model(SupplierPO)

        outgoing_payment_ids = list(SupplierPODeliveryInvoicePCL.objects.filter(
            entity_type=invoice_ct,
            entity_id__in=invoices.values_list('pk', flat=True)
        ).values_list('outgoing_payment', flat=True)) + list(
            SupplierPODeliveryInvoicePCL.objects.filter(
                entity_type=supplier_po_ct,
                entity_id__in=supplier_pos.values_list('pk', flat=True)
        ).values_list('outgoing_payment', flat=True))
        outgoing_payments = OutgoingPayment.objects.filter(id__in=outgoing_payment_ids)
        return outgoing_payments
    
    def get_supplier_po_delivery_invoice_pcls(self):
        invoices = self.get_invoices()
        supplier_pos = self.get_supplier_pos()
        invoice_ct = ContentType.objects.get_for_model(SupplierPODeliveryInvoice)
        supplier_po_ct = ContentType.objects.get_for_model(SupplierPO)

        supplier_po_delivery_invoice_ids = list(SupplierPODeliveryInvoicePCL.objects.filter(
            entity_type=invoice_ct,
            entity_id__in=invoices.values_list('pk', flat=True)
        ).values_list('pk', flat=True)) + list(
            SupplierPODeliveryInvoicePCL.objects.filter(
                entity_type=supplier_po_ct,
                entity_id__in=supplier_pos.values_list('pk', flat=True)
        ).values_list('pk', flat=True))
        supplier_po_delivery_invoice_pcls = SupplierPODeliveryInvoicePCL.objects.filter(id__in=supplier_po_delivery_invoice_ids)
        return supplier_po_delivery_invoice_pcls

    def get_purchase_order_deliveries(self):
        purchase_orders = self.get_purchase_orders()
        purchase_order_deliveries = PurchaseOrderDelivery.objects.filter(
            purchase_order__in=purchase_orders
        )
        return purchase_order_deliveries

    def get_material_category_supplier_pos(self, material_allocation_qs, material_category):
        supplier_po_ids = material_allocation_qs.filter(
            supplier_delivery_date_quantity__material_supplier__supplier_material__customer_brand_material__material_detail__generic_material__user_material__category=material_category
        ).values_list('supplier_delivery_date_quantity__material_supplier__general_po_supplier__supplierpo', flat=True)
        supplier_pos = SupplierPO.objects.filter(id__in=supplier_po_ids).order_by('id')
        return supplier_pos

    def generate_po_club_purchase_order_bom(self, material, exclude_po_clubs=False):
        purchase_orders = self.get_purchase_orders()

        for purchase_order in purchase_orders:
            purchase_order.build_purchase_order_bom(material, exclude_po_clubs)

    def is_po_club_colorways_mapping_completed(self):
        mapping_completed = True
        po_club_colorways = self.actualpoclubcolorway_set.all()
        if not po_club_colorways.exists():
            mapping_completed = False
        for po_club_colorway in po_club_colorways:
            if not po_club_colorway.completed:
                mapping_completed = False

        return mapping_completed

    def set_po_club_colorways_mapping_completed(self, completed):
        set_complete = True
        if completed:
            purchase_orders = self.get_purchase_orders()
            for purchase_order in purchase_orders:
                po_colorways = purchase_order.pocolorway_set.all().filter(po_club_colorway=None)
                if po_colorways.exists():
                    set_complete = False
        if set_complete:
            po_club_colorways = self.actualpoclubcolorway_set.all()
            for po_club_colorway in po_club_colorways:
                po_club_colorway.completed = completed
                po_club_colorway.save()

        return set_complete
    
    def get_pre_cositng(self):
        costing_version = None
        is_pre_costing = self.get_purchase_orders().filter().exclude(marketing_costing=None).exists()
        if is_pre_costing:
            costing_version_ids = self.get_purchase_orders().filter().values_list('costing_version', flat=True)
            costing_versions = OrderCostingVersion.objects.filter(id__in=costing_version_ids)
            if costing_versions:
                costing_version = costing_versions[0]
        return costing_version
    
    def get_costing_type(self):
        costing_type = None
        costing = self.get_costing()
        if costing:
            costing_type = costing.costing_type
        elif self.get_marketing_costing():
            costing = self.get_marketing_costing()
            costing_type = costing.costing_type
        return costing_type
    
    def is_create_supplier_pos(self):
        is_create_supplier_pos = self.get_supplier_pos().exists()
        return is_create_supplier_pos
    
    def get_warehouse_transfer_materials(self):
        from materials.models import WarehouseMaterialTransfer
        po_club_ct = ContentType.objects.get_for_model(ActualPOClub)
        warehouse_transfer_materials = WarehouseMaterialTransfer.objects.filter(entity_id=self.id, entity_type=po_club_ct)
        return warehouse_transfer_materials
    
    def finalize_po_packs_and_create_dependencies_from_material(self, material):
        purchase_orders = self.get_purchase_orders()
        for purchase_order in purchase_orders:
            purchase_order.finalize_po_packs_and_create_dependencies_from_material(material)
        POClubCompletedMaterial.objects.get_or_create(po_club=self, material=material)

    def get_po_pack_other_cost(self):
        other_costs = POPackOtherCost.objects.filter(pack__purchase_order__actual_po_club=self)
        return other_costs
    
    def get_po_pack_other_cost_value_from_other_cost(self, other_cost):
        cost = 0
        po_pack_other_costs = self.get_po_pack_other_cost().filter(costing_order_pack_other_cost__other_cost_type=other_cost)
        for po_pack_other_cost in po_pack_other_costs:
            cost += po_pack_other_cost.cost * po_pack_other_cost.pack.quantity
        return cost
    
    def get_po_pack_other_cost_value_used_value_from_other_cost(self, other_cost):
        from decimal import Decimal
        other_cost_type_ct = ContentType.objects.get_for_model(OtherCostType)
        used_value = 0
        other_cost_type_deliveries = GeneralServicePOServiceDelivery.objects.filter(
            general_service_po_supplier_price__entity_type=other_cost_type_ct,
            general_service_po_supplier_price__entity_id=other_cost.id
        )
        for other_cost_type_delivery in other_cost_type_deliveries:
            used_value += other_cost_type_delivery.general_service_po_supplier_price.price * other_cost_type_delivery.planned_send_quantity
        converted_decimal_value = Decimal(str(used_value))
        return converted_decimal_value


class POClubMaterialColorTone(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete=models.DO_NOTHING)
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.DO_NOTHING)
    acceptable_color_tones = models.ManyToManyField(FabricColorTone)


class FabricWidth(BaseAbstractModel):
    actual_po_club = models.ForeignKey(ActualPOClub, on_delete=models.DO_NOTHING)
    width = models.FloatField(null=True)  # Get from supplier inquirydetails
    width_unit = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    customer_brand_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)

    mh = MaterialUnitHelper()

    @property
    def normalized_width_unit(self):
        return self.mh.get_normalized_unit(self.width_unit)

    def get_club_fabric_width_suppliers(self):
        return self.fabricwidthsupplier_set.all().order_by('id')

    def get_default_fabric_width_supplier(self):
        suppliers = self.get_club_fabric_width_suppliers()
        supplier = None
        if suppliers.exists():
            supplier = suppliers[0]
        return supplier

    def get_normalized_width(self):
        return_data = None
        if self.width_unit and self.width:
            return_data = convert_quantity_to_unit(self.normalized_width_unit, self.width, self.width_unit)['quantity']
        return return_data

    def get_normalized_width_unit(self):
        return self.mh.get_normalized_unit(self.width_unit)

    def get_normalized_width(self):
        normalized_width_unit = self.get_normalized_width_unit()
        return convert_quantity_to_unit(normalized_width_unit, self.width, self.width_unit)


class FabricWidthSupplier(BaseAbstractModel):
    width = models.ForeignKey(FabricWidth, on_delete=models.CASCADE)
    supplier_inquiry_detail = models.ForeignKey(SupplierInquiryDetail, on_delete=models.CASCADE)
    # supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)


class POCADMarkerUpload(BaseAbstractModel):
    area_file = models.ForeignKey(FileAttachment, related_name='area_file', on_delete=models.CASCADE)
    mini_marker_file = models.ForeignKey(FileAttachment, related_name='minimarker_file', on_delete=models.CASCADE)


class CADMarkerPlacement(BaseAbstractModel):
    po_cad_marker_upload = models.ForeignKey(POCADMarkerUpload, on_delete=models.CASCADE)
    po_pack_item_placement = models.ForeignKey(POPackItemPlacement, on_delete=models.CASCADE)
    area = models.FloatField()
    placement_name = models.CharField(max_length=1000)


class POFabricMarker(BaseAbstractModel):
    PLACEMENT_LEVEL_MARKER = 'placement_level_marker'
    ITEM_LEVEL_MARKER = 'item_level_marker'
    MARKER_TYPES = (
        (PLACEMENT_LEVEL_MARKER, 'Placement Level Marker'),
        (ITEM_LEVEL_MARKER, 'Item Level Marker'),
    )
    marker_type = models.CharField(max_length=200, choices=MARKER_TYPES, null=True)
    item = models.ForeignKey(Item, on_delete=models.DO_NOTHING, null=True)
    actual_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    po_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.DO_NOTHING)
    parent_marker = models.ForeignKey("self", null=True, on_delete=models.CASCADE)
    consumption_ratio = models.FloatField(null=True)
    wastage = models.FloatField(null=True)
    reviewed = models.BooleanField(default=False)
    width = models.ForeignKey(FabricWidth,  on_delete=models.SET_NULL, null=True)
    number_of_plies = models.IntegerField(null=True) # Note This should be an integer value
    attachments = models.ManyToManyField(FileAttachment)
    marker_upload = models.ForeignKey(POCADMarkerUpload, null=True, on_delete=models.CASCADE)
    marker_name = models.CharField(max_length = 200, null=True)
    marker_length = models.FloatField(null = True)
    marker_length_unit = models.CharField(max_length = 200, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null = True)

    # These are calculated fields
    calculated_consumption_ratio = models.FloatField(null=True)
    calculated_total_material_quantity = models.FloatField(null=True)
    base_po_pack_item_marker_detail = models.ForeignKey('marketing.POFabricMarkerPlacement', on_delete=models.SET_NULL, null=True)
    material_quantity_units = models.CharField(max_length=200, default=MaterialUnitHelper.METERS_UNIT, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    derived_from_marker = models.ForeignKey('POFabricMarker', related_name = 'other_width_markers', null=True, on_delete=models.CASCADE)

    BOOKING_MARKER = 'booking_marker'
    LEFTOVER_MARKER = 'leftover_marker'

    MARKER_CLASSIFICATION_CHOICESS = (
        (BOOKING_MARKER, 'Booking Marker'),
        (LEFTOVER_MARKER, 'Leftover Marker'),
    )
    marker_classification = models.CharField(max_length=200, choices=MARKER_CLASSIFICATION_CHOICESS, default=BOOKING_MARKER)
    void_marker = models.BooleanField(default=False)

    mh = MaterialUnitHelper()

    # def save(self, *args, **kwargs):
        # if self.marker_name == None:
        #     marker_number = 1
        #     width_data = 'default_marker'
        #     if self.width:
        #         width_data = str(self.width.width) + '_' + self.width.get_width_unit_display()
        #     marker_name_base = width_data + '_' + self.item.name + '_' + self.po_material.verbose_reference_code
        #     for marker in POFabricMarker.objects.filter(marker_name__contains=marker_name_base):
        #         if marker.marker_name:
        #             marker_name_data = marker.marker_name.split('_')
        #             if isinstance(marker_name_data[len(marker_name_data)-1], int):
        #                 if marker_number <= int(marker_name_data[len(marker_name_data)-1]):
        #                     marker_number = int(marker_name_data[len(marker_name_data)-1]) + 1
        #     self.marker_name = marker_name_base + ' - ' + str(marker_number)
        # super().save(*args, **kwargs)
    
    def update_name(self):
        placements = self.pofabricmarkerplacement_set.all().distinct('placement__po_pack_item__po_item__order_item__item')
        item_names = placements.values_list('placement__po_pack_item__po_item__order_item__item__name', flat=True)
        item_name = None
        for item in item_names:
            if item_name:
                item_name += ', ' + item
            else:
                item_name = item
        marker_number = 1
        width_data = 'default_marker'
        if self.width:
            width_data = str(self.width.width) + '_' + self.width.get_width_unit_display()
        marker_name_base = width_data + '_' + item_name + '_' + self.po_material.verbose_reference_code
        for marker in POFabricMarker.objects.filter(marker_name__contains=marker_name_base):
            if marker.marker_name:
                marker_name_data = marker.marker_name.split('_')
                if isinstance(marker_name_data[len(marker_name_data)-1], int):
                    if marker_number <= int(marker_name_data[len(marker_name_data)-1]):
                        marker_number = int(marker_name_data[len(marker_name_data)-1]) + 1
        self.marker_name = marker_name_base + ' - ' + str(marker_number)
        self.save()
    def get_marker_placements(self):
        return self.pofabricmarkerplacement_set.all()

    def calculate_placement_level_consumption_ratio_and_completeness(self):
        from marketing.model_utils.po_model_utils import POFabricConsumptionUtils
        marker = POFabricConsumptionUtils(marker=self)
        marker.calculate_real_placement_ratios()

    def validate_fabric_marker(self):
        errors = {}

        if not self.wastage:
            errors['wastage'] = 'Wastage is required'

        if not self.consumption_ratio:
            errors['consumption_ratio'] = 'Consumption Ratio is required'

        if not self.number_of_plies:
            errors['number_of_plies'] = "Number of Plies is required"

        if not self.width:
            errors['width'] = "Width is required"
        elif self.width.customer_brand_material != self.po_material:
            errors['width'] = "Invalid width selected"

        marker_placements = self.get_marker_material_placements()
        areas_valid = marker_placements.filter(area__isnull=True).exists()
        ratios_valid = marker_placements.filter(ratio__isnull=True).exists()

        if areas_valid or ratios_valid:
            errors['placements'] = "Make sure to enter values to all Areas and Ratios"
        return not bool(errors), errors

    def get_marker_material_placements(self):
        return self.pofabricmarkerplacement_set.all().order_by('pk')

    def calculate_filled_placement_quantity(self):
        marker_placements = self.get_marker_material_placements()

        for marker_placement in marker_placements:
            quantity = marker_placement.ratio * float(self.number_of_plies)
            marker_placement.filled_placement_quantity = quantity
            marker_placement.save()

    def get_normalized_marker_length(self):
        normalized_marker_length = None
        if self.marker_length and self.marker_length_unit:
            normalized_marker_length = convert_quantity_to_unit(self.mh.get_normalized_unit(self.marker_length_unit), self.marker_length, self.marker_length_unit)
        return normalized_marker_length['quantity']

    def get_max_cut_position(self, normalized_initial_balance_quantity):
        marker_points = self.pomarkerpoint_set.all()
        max_marker_point = None
        for marker_point in marker_points:
            if marker_point.normalized_cut_point['quantity'] < normalized_initial_balance_quantity:
                if not max_marker_point:
                    max_marker_point = marker_point
                elif max_marker_point.normalized_cut_point['quantity'] < marker_point.normalized_cut_point['quantity']:
                    max_marker_point = marker_point
        return max_marker_point

    def get_marker_cut_plans(self, ):
        marker_cut_plans = self.markercutplan_set.all()
        return marker_cut_plans

    def calculate_roll_sequence_ply_count(self, left_over=False):
        ply_count = 0
        marker_cut_plans = self.get_marker_cut_plans()
        for marker_cut_plan in marker_cut_plans:
            ply_count += marker_cut_plan.calculate_marker_cut_plan_ply_count(left_over)
        return ply_count
    
    def get_remaining_ply_count(self):
        remaining_ply_count = self.number_of_plies
        marker_cut_plans = self.markercutplan_set.all()
        for marker_cut_plan in marker_cut_plans:
            remaining_ply_count -= marker_cut_plan.ply_count
        
        other_width_markers = POFabricMarker.objects.filter(derived_from_marker=self)

        for other_width_marker in other_width_markers:
            for marker_cut_plan in other_width_marker.markercutplan_set.all():
                remaining_ply_count -= marker_cut_plan.ply_count

        return remaining_ply_count


class POFabricMarkerPlacement(BaseAbstractModel):
    marker = models.ForeignKey(POFabricMarker, on_delete=models.CASCADE)
    placement = models.ForeignKey(POPackItemPlacement, on_delete=models.CASCADE)
    area = models.FloatField(null=True)
    ratio = models.IntegerField(null=True)
    filled_placement_quantity = models.IntegerField(null=True)
    related_marker_placements = models.ManyToManyField('self')

    # These are calculated fields # TODO - add units
    calculated_consumption_ratio = models.FloatField(null=True)
    calculated_material_quantity = models.FloatField(null=True)

    @property
    def material_quantity_units(self):
        return self.marker.material_quantity_units

    def calculate_placement_filled_quantity(self, left_over=False):
        ply_count = self.marker.calculate_roll_sequence_ply_count(left_over)
        return self.ratio * ply_count if self.ratio else 0

    def get_cad_marker_placement_area(self):
        area = 0.00
        cad_marker_placements = self.placement.cadmarkerplacement_set.all().filter(po_cad_marker_upload=self.marker.marker_upload)
        for cad_marker_placement in cad_marker_placements:
            area += cad_marker_placement.area
        return int(area*10000)/10000

    def save_cad_marker_placement_area(self):
        area = self.get_cad_marker_placement_area()
        if area > 0:
            self.area = area
            self.save()



# TODO - is this needed anymore?
class ActualClubBom(BaseAbstractModel):
    actual_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
    quantity = models.FloatField(null=True)
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    order_quantity = models.FloatField(null=True)

    def get_aggregate_order_quantity(self, material):
        from django.db.models import Sum
        total_order_quantity = PurchaseOrderBom.objects.filter(purchase_order__actual_po_club=self.actual_club, material=material).aggregate(total_order_quantity=Sum('order_quantity'))
        return total_order_quantity['total_order_quantity']


# TODO - is this needed?
class SupplierBOMFile(BaseAbstractModel):
    actual_po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    bom_file = models.ForeignKey(FileAttachment, on_delete=models.DO_NOTHING)
    supplier = models.ForeignKey(Supplier, on_delete=models.DO_NOTHING)
    purchase_order_bom_suppliers = models.ManyToManyField(SupplierDeliveryDateQuantity)


class PurchaseOrderAllocatedMaterial(BaseAbstractModel):
    purchase_order_bom = models.ForeignKey(PurchaseOrderBom, on_delete=models.CASCADE)
    in_house_material = models.ForeignKey('shared.InHouseMaterial', on_delete=models.CASCADE)
    allocated_quantity = models.FloatField(null=True)
    allocated_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    used_quantity = models.FloatField(null=True)
    used_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    shade = models.ForeignKey('marketing.POClubShade', null=True, on_delete=models.SET_NULL) # TODO ask dasith sir about this
    width = models.ForeignKey(FabricWidth, on_delete=models.SET_NULL, null=True)
    is_left_over = models.BooleanField(default=False)

    ALLOCATED_QUANTITY_VALUE_KEY = 'allocated_quantity'
    ALLOCATED_QUANTITY_UNITS_VALUE_KEY = 'allocated_quantity_units'
    WIDTH_VALUE_KEY = 'width'
    WIDTH_UNITS_VALUE_KEY = 'width_units'
    SHADE_VALUE_KEY = 'shade'

    @property
    def normalized_allocated_quantity_unit(self):
        mh = MaterialUnitHelper()
        return mh.get_normalized_unit(self.allocated_quantity_units)
    
    @property
    def normalized_used_quantity_unit(self):
        mh = MaterialUnitHelper()
        return mh.get_normalized_unit(self.used_quantity_units)
    
    @property
    def normalized_allocated_quantity(self):
        normalized_unit = self.normalized_allocated_quantity_unit
        value = convert_quantity_to_unit(normalized_unit, self.allocated_quantity, self.allocated_quantity_units)
        return value
    
    @property
    def normalized_used_quantity(self):
        normalized_unit = self.normalized_used_quantity_unit
        value = convert_quantity_to_unit(normalized_unit, self.used_quantity, self.used_quantity_units)
        return value

    @property
    def normalized_available_quantity(self):
        normalized_used_quantity = 0
        selected_rolls = self.selectedroll_set.all()
        for selected_roll in selected_rolls:
            normalized_used_quantity += selected_roll.normalized_quantity + selected_roll.normalized_unusable_quantity
        return self.normalized_allocated_quantity['quantity'] - normalized_used_quantity

    @property
    def normalized_used_quantity(self):
        normalized_used_quantity = 0
        selected_rolls = self.selectedroll_set.all()
        for selected_roll in selected_rolls:
            normalized_used_quantity += selected_roll.normalized_quantity + selected_roll.normalized_unusable_quantity
        return convert_quantity_to_unit(self.normalized_allocated_quantity_unit, normalized_used_quantity, self.allocated_quantity_units)

    def is_unusable_quantity(self, marker_cut_plan, normalized_available_quantity):
        return_data = True
        next_marker_cut_plans = marker_cut_plan.get_marker_cut_plans_not_sequenced()
        normalized_fabric_width = self.width.get_normalized_width()
        for next_marker_cut_plan in next_marker_cut_plans:
            normalized_next_marker_width = next_marker_cut_plan.marker.width.get_normalized_width()
            if normalized_next_marker_width:
                if normalized_next_marker_width <= normalized_fabric_width:
                    normalized_next_marker_length = next_marker_cut_plan.normalized_marker_length_allowance
                    if normalized_next_marker_length:
                        if normalized_next_marker_length <= normalized_available_quantity:
                            return_data = False

        return return_data

    def get_layering_details_without_joint(self, marker_cut_plan, cumulative_ply_count):
        return_details = {}
        max_ply_count = marker_cut_plan.ply_count
        ply_count = 0
        normalized_used_quantity = 0
        normalized_unusable_quantity = 0
        normalized_available_quantity = self.normalized_available_quantity
        return_details['marker_point'] = None
        normalized_marker_length = marker_cut_plan.normalized_marker_length_with_allowance
        complete_ply_count = int(normalized_available_quantity/normalized_marker_length)
        if complete_ply_count > max_ply_count:
            ply_count = max_ply_count
        else:
            ply_count = complete_ply_count
        normalized_used_quantity = ply_count*normalized_marker_length
        normalized_used_quantity = ceil_number(normalized_used_quantity*100)/100
        normalized_available_quantity -= normalized_used_quantity
        if self.is_unusable_quantity(marker_cut_plan, normalized_available_quantity):
            normalized_unusable_quantity = normalized_available_quantity
            normalized_available_quantity = 0
        normalized_unusable_quantity = round_if_number(normalized_unusable_quantity, 2)
        return_details['normalized_used_quantity'] = normalized_used_quantity
        return_details['normalized_unusable_quantity'] = normalized_unusable_quantity
        return_details['ply_count'] = ply_count
        return_details['cumulative_ply_count'] = cumulative_ply_count + ply_count
        return_details['self'] = self
        return_details['roll_id'] = self.id
        return_details['shade'] = self.shade
        return_details['width'] = self.width.get_normalized_width()
        return return_details

    def get_layering_details_with_joint(self, marker_cut_plan, last_layer_details, cumulative_ply_count, is_last_roll):
        return_details = {}
        max_ply_count = marker_cut_plan.ply_count
        ply_count = 0
        normalized_used_quantity = 0
        normalized_unusable_quantity = 0
        normalized_available_quantity = self.normalized_available_quantity
        normalized_marker_length = marker_cut_plan.normalized_marker_length_with_allowance

        if last_layer_details != {}:
            if last_layer_details['marker_point'] != None:
                normalized_used_quantity += (normalized_marker_length - last_layer_details['marker_point'].normalized_back_point['quantity'])
                normalized_available_quantity -= normalized_used_quantity
                max_ply_count -= 1
                ply_count = 1

        complete_ply_count = int(normalized_available_quantity/normalized_marker_length)
        # print(complete_ply_count)
        if complete_ply_count > max_ply_count:
            ply_count += max_ply_count
            normalized_used_quantity += max_ply_count*normalized_marker_length
            normalized_used_quantity = ceil_number(normalized_used_quantity*100)/100
            normalized_available_quantity -= normalized_used_quantity
            return_details['marker_point'] = None
        else:
            ply_count += complete_ply_count
            normalized_used_quantity += complete_ply_count*normalized_marker_length
            normalized_used_quantity = ceil_number(normalized_used_quantity*100)/100
            normalized_initial_balance_quantity = normalized_available_quantity - normalized_used_quantity
            if is_last_roll:
                return_details['marker_point'] = None
                normalized_available_quantity = normalized_initial_balance_quantity
            else:
                return_details['marker_point'] = marker_cut_plan.marker.get_max_cut_position(normalized_initial_balance_quantity)
                normalized_available_quantity = 0
            if return_details['marker_point']:
                normalized_available_quantity = normalized_initial_balance_quantity - return_details['marker_point'].normalized_cut_point['quantity']
                normalized_unusable_quantity += normalized_used_quantity + return_details['marker_point'].normalized_cut_point['quantity']
            else:
                normalized_available_quantity = normalized_initial_balance_quantity
                normalized_unusable_quantity += normalized_used_quantity
        if self.is_unusable_quantity(marker_cut_plan, normalized_available_quantity):
            normalized_unusable_quantity = normalized_available_quantity
            normalized_available_quantity = 0
        normalized_unusable_quantity = round_if_number(normalized_unusable_quantity, 2)
        # print(normalized_available_quantity, normalized_unusable_quantity)
        # print('used', normalized_used_quantity, 'ply_count', ply_count)
        return_details['normalized_used_quantity'] = normalized_used_quantity
        return_details['normalized_unusable_quantity'] = normalized_unusable_quantity
        return_details['ply_count'] = ply_count
        return_details['cumulative_ply_count'] = cumulative_ply_count + ply_count
        return_details['self'] = self
        return_details['roll_id'] = self.id
        return_details['shade'] = self.shade
        return_details['width'] = self.width.get_normalized_width()
        # print(ply_count, normalized_used_quantity, normalized_unusable_quantity, self.normalized_available_quantity, normalized_available_quantity)
        return return_details



#
#
# class SupplierPOGRN(BaseAbstractModel, SupplierPOGRNModelMixin):
#     supplier_po = models.ForeignKey(SupplierPO, on_delete=models.CASCADE)
#     supplier_pack_list = models.ForeignKey(SupplierPODeliveryInvoicePackList, on_delete=models.SET_NULL, null=True)
#     #supplier_delivery_date = models.ForeignKey(SupplierDeliveryDate, on_delete=models.SET_NULL, null=True)
#     attachments = models.ManyToManyField(FileAttachment, blank=True)
#     remarks = models.CharField(max_length=500, null=True)
#     replacement_grn = models.ManyToManyField("self")
#
#     DRAFT_STATE = 'draft'
#     QUANTITY_VERIFICATION_STATE = 'quantity_verification'
#     QA_VERIFICATION_STATE = 'qa_verification'
#     GRN_COMPLETE = 'grn_complete'
#     STATE_OPTIONS = (
#         (DRAFT_STATE, 'Draft'),
#         (QUANTITY_VERIFICATION_STATE, 'Quantity Verification'),
#         (QA_VERIFICATION_STATE, 'QA Verification'),
#         (GRN_COMPLETE, 'GRN Complete')
#     )
#     state = models.CharField(max_length=200, choices=STATE_OPTIONS, default=DRAFT_STATE)
#
#     @property
#     def grn_number(self):
#         return f"GRN{self.id:06}"
#
#     def get_delivery_note(self):
#         return self.supplier_pack_list.supplier_po_delivery_note
#
#     def get_invoice(self):
#         return self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice
#
#     def get_supplier_po_from_commercial_invoice(self):
#         po = self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice.get_supplier_po()
#         return po
#
#     def get_supplier_po_previous_completed_summary_for_material(self, material):
#         from marketing.helpers.summary_calculator_helper import GRNMaterialSummaryCalculatorMixin
#         supplier_po = self.get_supplier_po_from_commercial_invoice()
#         po_grns = supplier_po.get_grns().filter(state=self.GRN_COMPLETE).exclude(pk=self.pk)
#         normalized_unit = material.material_normalized_measuring_unit
#         summary_data = GRNMaterialSummaryCalculatorMixin().get_grns_data_summary(po_grns, material, normalized_unit)
#         return summary_data
#
#     def get_debit_note(self):
#         debit_note = get_object_or_none(DebitNote, {'commercial_invoice': self.get_invoice()})
#         return debit_note
#
#     def get_actual_delivery_date(self):
#         actual_delivery_date = None
#         if  self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice:
#             actual_delivery_date = self.supplier_pack_list.supplier_po_delivery_note.supplier_po_delivery_invoice.supplieractualdeliverydate
#         return actual_delivery_date
#
#     def get_shades(self):
#         shade_ids = SupplierPOGRNMaterialDetail.objects.filter(supplier_po_grn_material__supplier_po_grn=self).values_list('shade__actual_shade', flat=True)
#         shades = POClubShade.objects.filter(id__in=shade_ids)
#         return shades
#
#
# class SupplierPOGRNMaterial(BaseAbstractModel):
#     supplier_po_grn = models.ForeignKey(SupplierPOGRN, on_delete=models.CASCADE)
#     grn_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
#     material_pack_list_attachment = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
#     total_expected_quantity = models.FloatField(null=True) # This is indicated quantity/ pack list
#     total_expected_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     commercial_invoice_quantity = models.FloatField(null=True) # This is indicated quantity
#     commercial_invoice_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#
#     grn_price = models.FloatField(null=True) # Unit Price
#     total_price = models.FloatField(null=True)
#
#     # Calculated fields
#     total_actual_quantity = models.FloatField(null=True)
#     total_actual_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     total_qa_rejected_quantity = models.FloatField(null=True)
#     total_qa_rejected_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#
#     # total_qa_passed_quantity = models.FloatField(null=True)
#     # total_qa_passed_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     total_excess_quantity = models.FloatField(null=True, default=0)
#     total_excess_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     total_deficit_quantity = models.FloatField(null=True, default=0) #Short quantity
#     total_deficit_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     usable_quantity = models.FloatField(null=True, default=0) # This will be total_grnable_quantity when you in house it
#     usable_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     mismatch_quantity = models.FloatField(null=True, default=0)
#     mismatch_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     # End of calculated fields
#
#     # Based on supplier input
#     #total_replacement_quantity = models.FloatField(null=True, default=0)
#     #total_replacement_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#
#     ATTACHMENT_KEY = 'material_pack_list_attachment'
#     TOTAL_EXPECTED_QUANTITY_VALUE_KEY = 'total_expected_quantity'
#     TOTAL_EXPECTED_QUANTITY_UNITS_VALUE_KEY = 'total_expected_quantity_units'
#     ACTUAL_QUANTITY_VALUE_KEY = 'total_actual_quantity'
#     ACTUAL_QUANTITY_UNITS_VALUE_KEY = 'total_actual_quantity_units'
#     GRN_PRICE_VALUE_KEY = 'grn_price'
#
#     @property
#     def total_in_housed_quantity(self):
#         mh = MaterialUnitHelper()
#         material_unit = mh.get_normalized_unit(self.total_actual_quantity_units)
#         in_housed_materials = InHouseMaterial.objects.filter(grn_material_detail__supplier_po_grn_material=self)
#         total = calculate_queryset_total_normalized_quantity(in_housed_materials, material_unit, 'quantity', 'quantity_units')
#         data = {
#             'quantity': total,
#             'quantity_units': material_unit
#         }
#         return data
#
#     @property
#     def total_grnable_quantity(self):# Change this to total_grned_quantity and add if the excess is in housed
#         '''
#         This returns what we can take in to our system after removing any excess and rejected
#         '''
#         mh = MaterialUnitHelper()
#         material_unit = mh.get_normalized_unit(self.total_actual_quantity_units)
#
#         qa_passed_quantity = self.total_qa_passed_quantity
#
#         normalized_qa_passed_quantity = mh.convert_to_units(material_unit, qa_passed_quantity['total_qa_passed_quantity'], qa_passed_quantity['total_qa_passed_quantity_units'])
#         grnable_quantity = normalized_qa_passed_quantity
#         if self.total_excess_quantity > 0:
#             normalized_excess_quantity = mh.convert_to_units(material_unit, self.total_excess_quantity, self.total_excess_quantity_units)
#             grnable_quantity = normalized_qa_passed_quantity - normalized_excess_quantity
#         data = {
#             'grnable_quantity': grnable_quantity,
#             'grnable_quantity_units': material_unit,
#         }
#         return data
#
#     @property
#     def total_qa_passed_quantity(self):
#         mh = MaterialUnitHelper()
#         material_unit = mh.get_normalized_unit(self.total_actual_quantity_units)
#         total_actual_quantity = mh.convert_to_units(material_unit, get_float_or_zero(self.total_actual_quantity), self.total_actual_quantity_units)
#         total_rejected_quantity = mh.convert_to_units(material_unit, get_float_or_zero(self.total_qa_rejected_quantity), self.total_qa_rejected_quantity_units)
#         data = {
#             'total_qa_passed_quantity': total_actual_quantity - total_rejected_quantity,
#             'total_qa_passed_quantity_units': material_unit
#         }
#         return data
#
#     def get_quantity_attribute(self, quantity_attribute, quantity_unit_attribute, default_quantity=None):
#         quantity = getattr(self, quantity_attribute, None)
#         quantity_unit = getattr(self, quantity_unit_attribute, None)
#         normalized_unit = self.grn_material.material_normalized_measuring_unit
#         data = convert_quantity_to_unit(normalized_unit, quantity, quantity_unit)
#         #data = {'quantity': quantity, 'quantity_unit': quantity_unit, 'quantity_unit_display': material_helper.all_measuring_units_dictionary.get(quantity_unit, "N/A")}
#         return data
#
#     def get_all_material_details(self):
#         material_details = self.supplierpogrnmaterialdetail_set.all()
#         return material_details
#
#     def get_inspection_passed_material_details(self):
#         material_details = self.get_all_material_details().filter(qa_inspection_passed=True)
#         return material_details
#
#     def get_inspection_failed_material_details(self):
#         material_details = self.get_all_material_details().filter(qa_inspection_passed=False)
#         return material_details
#
#     def mark_material_detail_excess_quantity(self, excess_quantity, excess_quantity_units, supplier_po_grn_material_details, quantity_field, quantity_field_units):
#         # TODO major - mark only if ci is still open
#         total_marked_rolls_quantity = 0
#         excess_marked = False
#         if excess_quantity > 0:
#             for supplier_po_grn_material_detail in supplier_po_grn_material_details:
#                 remaining_excess_quantity = excess_quantity - total_marked_rolls_quantity
#                 if quantity_field == 'qa_passed_quantity':
#                     qa_passed_quantity = supplier_po_grn_material_detail.qa_passed_quantity
#                     quantity = qa_passed_quantity['qa_passed_quantity']
#                     quantity_units = qa_passed_quantity['qa_passed_quantity_units']
#                 else:
#                     quantity = getattr(supplier_po_grn_material_detail, quantity_field)
#                     quantity_units = getattr(supplier_po_grn_material_detail, quantity_field_units)
#                 material_detail_quantity = convert_quantity_to_unit(excess_quantity_units, quantity, quantity_units)['quantity']
#
#                 # Set full quantity as failed and if it is greater than what is needed only set the partial amount
#                 roll_excess_quantity = material_detail_quantity
#                 if remaining_excess_quantity <= material_detail_quantity:
#                     roll_excess_quantity = remaining_excess_quantity
#                     excess_marked = True
#
#                 total_marked_rolls_quantity += roll_excess_quantity
#                 roll_excess_quantity += supplier_po_grn_material_detail.excess_quantity # Add any previously marked excess quantity
#
#                 supplier_po_grn_material_detail.excess_quantity = roll_excess_quantity
#                 supplier_po_grn_material_detail.excess_quantity_units = excess_quantity_units
#                 supplier_po_grn_material_detail.save()
#
#                 if excess_marked:
#                     break
#
#         data = {
#             'quantity': total_marked_rolls_quantity,
#             'quantity_units': excess_quantity_units
#         }
#         return data
#
#     def reset_excess_material_details(self):
#         all_material_details = self.get_all_material_details().exclude(excess_quantity=0)
#         all_material_details.update(excess_quantity=0)
#
#     def mark_excess_quantity(self, excess_quantity, excess_quantity_units):
#         self.reset_excess_material_details()
#         all_material_details = self.get_all_material_details().all() # .all to prevent caching
#         marked_quantity = calculate_queryset_total_normalized_quantity(all_material_details, excess_quantity_units, 'excess_quantity', 'excess_quantity_units')
#         remaining_excess_quantity = excess_quantity - marked_quantity
#         # print(remaining_excess_quantity, 'remaining_excess_quantity')
#         if remaining_excess_quantity > 0:
#             if self.grn_material.get_user_defined_material().name == Material.FABRIC_MATERIAL:
#                 failed_batches = self.get_inspection_failed_material_details().all().order_by('batch_number', '-actual_quantity')  # .all to prevent caching
#                 total_marked_rolls_quantity = self.mark_material_detail_excess_quantity(remaining_excess_quantity, excess_quantity_units, failed_batches, 'actual_quantity', 'actual_quantity_units')
#                 normalized_total_marked_rolls_quantity = convert_quantity_to_unit(excess_quantity_units, total_marked_rolls_quantity['quantity'], total_marked_rolls_quantity['quantity_units'])
#                 remaining_excess_quantity = remaining_excess_quantity - normalized_total_marked_rolls_quantity['quantity']
#
#                 if remaining_excess_quantity > 0:
#                     qa_passed_batches = self.get_inspection_passed_material_details().all().order_by('batch_number', '-actual_quantity')
#                     self.mark_material_detail_excess_quantity(remaining_excess_quantity, excess_quantity_units, qa_passed_batches, 'actual_quantity', 'actual_quantity_units')
#             else:
#                 material_details = self.get_all_material_details().all().order_by('qa_failed_quantity')
#                 total_marked_rolls_quantity = self.mark_material_detail_excess_quantity(remaining_excess_quantity, excess_quantity_units, material_details, 'qa_failed_quantity', 'qa_failed_quantity_units')
#                 remaining_excess_quantity = excess_quantity - total_marked_rolls_quantity['quantity']
#
#                 self.mark_material_detail_excess_quantity(remaining_excess_quantity, excess_quantity_units, material_details, 'qa_passed_quantity', None)
#
#     def calculate_commercial_invoice_mismatch_quantity(self):
#         normalized_unit = self.grn_material.material_normalized_measuring_unit
#         normalized_actual_quantity = convert_quantity_to_unit(normalized_unit, self.total_actual_quantity, self.total_actual_quantity_units)
#         commercial_invoice_quantity = convert_quantity_to_unit(normalized_unit, self.commercial_invoice_quantity, self.commercial_invoice_quantity_units)
#         quantity_difference = normalized_actual_quantity['quantity'] - commercial_invoice_quantity['quantity']
#         self.mismatch_quantity = quantity_difference
#         self.mismatch_quantity_units = normalized_unit
#         self.save()
#
#     def set_material_details_grn_quantity(self):
#         spo_grn_material_details = self.get_all_material_details().all() # .all To prevent caching
#         normalized_unit = self.grn_material.material_normalized_measuring_unit
#         for spo_grn_material_detail in spo_grn_material_details:
#             normalized_qa_passed_quantity = convert_quantity_to_unit(normalized_unit, spo_grn_material_detail.actual_quantity, spo_grn_material_detail.actual_quantity_units)
#             normalized_excess_quantity = convert_quantity_to_unit(normalized_unit, spo_grn_material_detail.excess_quantity, spo_grn_material_detail.excess_quantity_units)
#             grn_quantity = normalized_qa_passed_quantity['quantity'] - normalized_excess_quantity['quantity']
#             spo_grn_material_detail.grn_quantity = grn_quantity
#             spo_grn_material_detail.grn_quantity_units = normalized_unit
#             spo_grn_material_detail.save()
#
#     def calculate_and_mark_excess_quantity(self):
#         from marketing.helpers.summary_calculator_helper import GRNMaterialSummaryCalculatorMixin
#         supplier_po = self.supplier_po_grn.get_supplier_po_from_commercial_invoice()
#         po_club = supplier_po.po_club
#         commercial_invoice = self.supplier_po_grn.get_invoice()
#         actual_delivery_date = commercial_invoice.supplieractualdeliverydate
#
#         self.calculate_material_quantity_summary()
#         material = self.grn_material.get_user_defined_material()
#         mh = MaterialUnitHelper()
#         normalized_unit = self.grn_material.material_normalized_measuring_unit
#
#         # normalized_actual_quantity = mh.convert_to_units(normalized_unit, self.total_actual_quantity, self.total_actual_quantity_units)
#
#         qa_passed_quantity = self.total_qa_passed_quantity
#         normalized_qa_passed_quantity = mh.convert_to_units(normalized_unit, qa_passed_quantity['total_qa_passed_quantity'], qa_passed_quantity['total_qa_passed_quantity_units'])
#
#         normalized_actual_quantity = mh.convert_to_units(normalized_unit, self.total_actual_quantity, self.total_actual_quantity_units)
#
#         previous_supplier_po_grns_data = self.supplier_po_grn.get_supplier_po_previous_completed_summary_for_material(self.grn_material)
#         previous_usable_quantity = previous_supplier_po_grns_data[GRNMaterialSummaryCalculatorMixin.SUPPLIER_PO_EXCESS_QUANTITY_KEY]
#         normalized_previous_grn_usable_quantity = mh.convert_to_units(normalized_unit, previous_usable_quantity['quantity'], previous_usable_quantity['quantity_units'])
#         total_quantity_of_supplier_po = normalized_actual_quantity + normalized_previous_grn_usable_quantity # TODO major - this should take into account total actual quantity?
#
#         excess_threshold = po_club.get_supplier_material_excess_threshold(supplier_po.supplier, self.grn_material)
#         required_quantity = po_club.get_po_club_material_required_quantity(self.grn_material, supplier_po)
#         normalized_po_club_required_quantity = mh.convert_to_units(normalized_unit, required_quantity['quantity'], required_quantity['quantity_units'])
#
#         excess_quantity = math.ceil(normalized_po_club_required_quantity * (1 + (excess_threshold/100)))
#         deficit_quantity = math.ceil(normalized_po_club_required_quantity * (1 - (excess_threshold/100)))
#         # print(total_usable_quantity_of_supplier_po, excess_quantity, deficit_quantity, 'total_usable_quantity_of_supplier_po, excess_quantity, deficit_quantity')
#         if total_quantity_of_supplier_po > excess_quantity:
#             excess_quantity_value = total_quantity_of_supplier_po - excess_quantity
#             self.mark_excess_quantity(excess_quantity_value, normalized_unit)
#             self.total_excess_quantity = excess_quantity_value
#         else:
#             self.total_excess_quantity = 0
#
#         if actual_delivery_date.is_last_delivery_for_supplier_po_and_material(self.grn_material) and total_quantity_of_supplier_po < deficit_quantity:
#             deficit_quantity_value = deficit_quantity - total_quantity_of_supplier_po
#             self.total_deficit_quantity = deficit_quantity_value
#         else:
#             self.total_deficit_quantity = 0
#
#         self.set_material_details_grn_quantity()
#         self.usable_quantity = normalized_qa_passed_quantity - self.total_excess_quantity
#         self.usable_quantity_units = normalized_unit
#
#         self.total_deficit_quantity_units = normalized_unit
#         self.total_excess_quantity_units = normalized_unit
#         self.save()
#
#     def set_grnable_material_details(self):
#         self.calculate_and_mark_excess_quantity()
#         self.calculate_commercial_invoice_mismatch_quantity()
#
#     def calculate_material_quantity_summary(self):
#         material_helper = MaterialUnitHelper()
#         material_details = self.get_all_material_details().all()
#         material = self.grn_material.get_user_defined_material()
#         normalized_unit = material_helper.get_normalized_unit_based_on_category(material.consumption_measurement_unit)
#
#         total_actual_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_unit, 'actual_quantity', 'actual_quantity_units')
#         if material.name == Material.FABRIC_MATERIAL:
#             rejected_batches = self.fabricgrnbatchnumber_set.filter(inspection_status=FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_FAILED)
#             rejected_material_details = material_details.filter(batch_number__in=rejected_batches)
#             rejected_quantity = calculate_queryset_total_normalized_quantity(rejected_material_details, normalized_unit, 'actual_quantity', 'actual_quantity_units')
#         else:
#             rejected_quantity = calculate_queryset_total_normalized_quantity(material_details, normalized_unit, 'qa_failed_quantity', 'qa_failed_quantity_units')
#
#         self.total_actual_quantity = total_actual_quantity
#         self.total_actual_quantity_units = normalized_unit
#
#         self.total_qa_rejected_quantity = rejected_quantity
#         self.total_qa_rejected_quantity_units = normalized_unit
#         self.save()
#
#     def get_color_tone_rejected_material_details(self):
#         grn_material_details = None
#         is_fabric = self.grn_material.material_type == Material.FABRIC_MATERIAL
#         acceptable_color_tones = self.supplier_po_grn.supplier_po.po_club.get_fabric_acceptable_color_tone(self.grn_material)
#         if is_fabric and acceptable_color_tones:
#             grn_material_details = self.get_all_material_details().filter().exclude(
#                 fabricgrndetail__color_tone__in=acceptable_color_tones
#             )
#         return grn_material_details
#
#     def get_color_tone_rejected_total_replacement_quantity(self):
#         rejected_color_tone_rolls = self.get_color_tone_rejected_material_details()
#         normalized_unit = self.grn_material.material_normalized_measuring_unit
#         quantity = 0
#         if rejected_color_tone_rolls:
#             quantity = calculate_queryset_total_normalized_quantity(rejected_color_tone_rolls, normalized_unit, 'actual_quantity', 'actual_quantity_units')
#         data = get_quantity_dictionary(quantity, normalized_unit)
#         return data
#
#     # def get_qa_rejected_total_replacement_quantity(self):
#     #     normalized_unit = self.grn_material.material_normalized_measuring_unit
#     #     data = get_quantity_dictionary(self.total_qa_rejected_quantity, normalized_unit) # TODO Mahesh review notes - this should be converted to the normalized unit first? Also, shouldn't this be connected to Replacement model?
#     #     return data
#
#     # def get_total_excess_quantity(self):
#     #     normalized_unit = self.grn_material.material_normalized_measuring_unit
#     #     data = get_quantity_dictionary(self.total_excess_quantity, normalized_unit) # TODO Mahesh review notes - this should be converted to the normalized unit first?
#     #     return data
#
#     # def get_total_shortage_quantity(self):
#     #     normalized_unit = self.grn_material.material_normalized_measuring_unit
#     #     data = get_quantity_dictionary(self.total_deficit_quantity, normalized_unit) # TODO Mahesh review notes - this should be converted to the normalized unit first?
#     #     return data
#
#     # def get_total_mismatch_quantity(self):
#     #     normalized_unit = self.grn_material.material_normalized_measuring_unit
#     #     data = get_quantity_dictionary(self.mismatch_quantity, normalized_unit) # TODO Mahesh review notes - this should be converted to the normalized unit first?
#     #     return data
#
#     def get_mismatch_remediation_quantity(self):
#         quantity = 0
#         if self.mismatch_quantity < 0:
#             quantity = abs(self.mismatch_quantity)
#         data = get_quantity_dictionary(quantity, self.mismatch_quantity_units)
#         return data
#
#     def get_total_replacement_quantity(self, reason):
#         replacement_quantities = self.get_replacement_delivery_details(reason)
#         normalized_unit = self.grn_material.material_normalized_measuring_unit
#         quantity = 0
#         if replacement_quantities:
#             quantity = calculate_queryset_total_normalized_quantity(replacement_quantities, normalized_unit, 'quantity', 'quantity_units')
#         data = get_quantity_dictionary(quantity, normalized_unit)
#         return data
#
#     def get_total_replacement_quantity_all(self):
#         replacement_quantities = self.replacementquantitydeliverydate_set.all()
#         normalized_unit = self.grn_material.material_normalized_measuring_unit
#         quantity = 0
#         if replacement_quantities:
#             quantity = calculate_queryset_total_normalized_quantity(replacement_quantities, normalized_unit, 'quantity', 'quantity_units')
#         data = get_quantity_dictionary(quantity, normalized_unit)
#         return data
#
#     def get_price_from_quantity(self, quantity):
#         price = None
#         if self.grn_price and quantity:
#             price = self.grn_price * quantity # TODO Major - this needs to be normalized
#         return price
#
#     def get_replacement_delivery_details(self, reason):
#         deliveries = self.replacementquantitydeliverydate_set.filter(reason=reason)
#         return deliveries
#
#     # def is_debit_note_created(self, invoice):
#     #     is_debit_note_created = False # TODO Mahesh - something like this is already implemented at the invoice level. Also the invoice should not be passed as a parameter since you can get it from the supplierpogrnmaterial object. If you want it for the invoice, get it directly from the invoice
#     #     debit_note = get_object_or_none(DebitNote, {'commercial_invoice': invoice})
#     #     if debit_note:
#     #         is_debit_note_created = DebitNoteMaterial.objects.filter(
#     #             debit_note=debit_note,
#     #             supplier_po_grn_material=self
#     #         ).exists()
#     #     return is_debit_note_created
#
#     def is_replacements_created(self, reason):
#         is_created = self.replacementquantitydeliverydate_set.filter(
#             reason=reason
#         ).exists()
#         return is_created
#
#     @cached_property
#     def active_commercial_invoice_debit_note(self):
#         commercial_invoice = self.supplier_po_grn.get_invoice()
#         return commercial_invoice.get_active_debit_note()
#
#     def get_active_debit_note_supplier_po_grn_material(self, reason):
#         debit_note = self.active_commercial_invoice_debit_note
#         debit_note_material = get_object_or_none(
#             DebitNoteMaterial,
#             {
#                 'debit_note': debit_note,
#                 'supplier_po_grn_material': self,
#                 'reason': reason
#             }
#         )
#         return debit_note_material


# class FabricGRNBatchNumber(BaseAbstractModel):
#     batch_number = models.CharField(max_length=300)
#     grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.CASCADE, null=True)
#     # TODO - major grn batch number
#     INSPECTION_STATUS_INSPECTION_INPROGRESS = 'inspection_in_progress'
#     INSPECTION_STATUS_INSPECTION_PASSED = 'inspection_passed'
#     INSPECTION_STATUS_INSPECTION_FAILED = 'inspection_failed'
#     INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE = 'inspection_high_fail_rate'
#
#     INSPECTION_STATUS_CHOICES = (
#         (INSPECTION_STATUS_INSPECTION_INPROGRESS, 'Inspection In Progress'),
#         (INSPECTION_STATUS_INSPECTION_PASSED, 'Inspection Passed'),
#         (INSPECTION_STATUS_INSPECTION_FAILED, 'Inspection Failed'),
#         (INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE, 'Inspection High Fail Rate')
#     )
#
#     inspection_status = models.CharField(max_length=200, choices=INSPECTION_STATUS_CHOICES, null=True, default=None)
#     inspection_percentage = models.FloatField(default=0)
#     avg_defect_rate_per_100_square_yards = models.FloatField(null=True)
#
#     def set_supplier_po_grn_material_detail_qa_inspection_passed(self, qa_inspection_passed):
#         supplier_po_grn_material_details = self.supplierpogrnmaterialdetail_set.all()
#         for supplier_po_grn_material_detail in supplier_po_grn_material_details:
#             supplier_po_grn_material_detail.save()
#
#     def set_inspection_status(self):
#         supplier_po_grn_material_details = self.supplierpogrnmaterialdetail_set.exclude(inspection_state=SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_NOT_NEED)
#         if supplier_po_grn_material_details.exclude(inspection_state = SupplierPOGRNMaterialDetail.INSPECTION_STATE_INSPECTION_COMPLETE).exists():
#             self.inspection_status = self.INSPECTION_STATUS_INSPECTION_INPROGRESS
#         else:
#             inspection_attempts = [supplier_po_grn_material_detail.inspection_attempt for supplier_po_grn_material_detail in supplier_po_grn_material_details.exclude(inspection_attempt = None).distinct('inspection_attempt')]
#             try:
#                 latest_attempt = max(inspection_attempts)
#             except ValueError:
#                 latest_attempt = 0
#             total_defect_value = 0
#             number_of_rolls = 0
#             inspected_supplier_po_grn_material_details = supplier_po_grn_material_details.filter(inspection_attempt = latest_attempt)
#             for inspected_supplier_po_grn_material_detail in inspected_supplier_po_grn_material_details:
#                 defect_value = inspected_supplier_po_grn_material_detail.defect_rate_per_100_square_yards
#                 if defect_value >= 0:
#                     total_defect_value += defect_value
#                     number_of_rolls += 1
#             if number_of_rolls > 0:
#                 batch_defect_rate = round(total_defect_value/number_of_rolls,2)
#                 self.avg_defect_rate_per_100_square_yards = batch_defect_rate
#                 if batch_defect_rate >= 28:
#                     self.inspection_status = self.INSPECTION_STATUS_INSPECTION_FAILED
#                     self.set_supplier_po_grn_material_detail_qa_inspection_passed(False)
#                 elif batch_defect_rate >=25 and batch_defect_rate < 28:
#                     self.inspection_status = self.INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE
#                 elif batch_defect_rate < 25:
#                     self.inspection_status = self.INSPECTION_STATUS_INSPECTION_PASSED
#                     self.set_supplier_po_grn_material_detail_qa_inspection_passed(True)
#
#         self.save()
#         return self.inspection_status
#
#     def get_rejected_color_tones(self):
#         rejected_color_tones = None
#         po_club = self.grn_material.supplier_po_grn.supplier_po.po_club
#         material = self.grn_material.grn_material
#         po_club_material_color_tone = POClubMaterialColorTone.objects.filter(
#             po_club=po_club,
#             material=material
#         ).first()
#         if po_club_material_color_tone:
#             accepted_color_tones = po_club_material_color_tone.acceptable_color_tones.all()
#         else:
#             accepted_color_tones = FabricColorTone.objects.none()
#
#         rejected_color_tone_ids = SupplierPOGRNMaterialDetail.objects.filter(batch_number=self, supplier_po_grn_material__grn_material=material).exclude(
#             fabricgrndetail__color_tone__in=accepted_color_tones
#         ).exclude(fabricgrndetail__color_tone=None).values_list('fabricgrndetail__color_tone', flat=True)
#
#         if rejected_color_tone_ids:
#             rejected_color_tones = FabricColorTone.objects.filter(id__in=rejected_color_tone_ids)
#         return rejected_color_tones
#
#     def get_color_tone_rejected_rolls(self, grn_material_details):
#         from django.db.models import Q
#         po_club = self.grn_material.supplier_po_grn.supplier_po.po_club
#         material = self.grn_material.grn_material
#         po_club_material_color_tone = POClubMaterialColorTone.objects.filter(
#             po_club=po_club,
#             material=material
#         ).first()
#         if po_club_material_color_tone:
#             accepted_color_tones = po_club_material_color_tone.acceptable_color_tones.all()
#         else:
#             accepted_color_tones = FabricColorTone.objects.none()
#
#         rejected_color_tone_rolls = grn_material_details.filter(
#             batch_number=self, supplier_po_grn_material__grn_material=material
#         ).exclude(Q(fabricgrndetail__color_tone__in=accepted_color_tones) &
#                     Q(fabricgrndetail__color_tone__isnull=False)
#         )
#
#         return rejected_color_tone_rolls
#
#     def get_defected_batches_remediation(self, grn_material_details):
#         material = self.grn_material.grn_material
#
#         rejected_qa_failed_rolls = grn_material_details.filter(
#             batch_number=self, supplier_po_grn_material__grn_material=material,
#             qa_inspection_passed=False,
#             batch_number__inspection_status=self.INSPECTION_STATUS_INSPECTION_FAILED
#         )
#         return rejected_qa_failed_rolls
#
#     def get_excess_batches_remediation(self, grn_material_details):
#         material = self.grn_material.grn_material
#
#         excess_rolls = grn_material_details.filter(
#             batch_number=self, supplier_po_grn_material__grn_material=material,
#             excess_quantity__gt=0
#         )
#         return excess_rolls
#
#     def get_cpi_rolls(self, grn_material_details):
#         material_detail_ids = InHouseMaterial.objects.filter(
#             grn_material_detail__in=grn_material_details,
#             required_cpi=True
#         ).values_list('grn_material_detail', flat=True)
#         cpi_rolls = grn_material_details.filter(id__in=material_detail_ids, batch_number=self)
#         return cpi_rolls
#
#     def get_total_quantity(self, grn_material_details):
#         normalized_unit = self.grn_material.grn_material.material_normalized_measuring_unit
#         quantity = 0
#         if grn_material_details:
#             quantity = calculate_queryset_total_normalized_quantity(grn_material_details, normalized_unit, 'actual_quantity', 'actual_quantity_units')
#         data = get_quantity_dictionary(quantity, normalized_unit)
#         return data


class POClubShade(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.DO_NOTHING)
    shade_name = models.CharField(max_length=500)
    shade_swatch = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
    display_order = models.IntegerField(null=True)


# class GRNBatchNumberShade(BaseAbstractModel):
#     batch_number = models.ForeignKey(FabricGRNBatchNumber, on_delete=models.CASCADE)
#     shade = models.CharField(max_length=200)
#     # grn = models.ForeignKey(SupplierPOGRN, on_delete=models.CASCADE)# TODO - we can remove this
#     actual_shade = models.ForeignKey(POClubShade, on_delete=models.SET_NULL, null=True)
#     # material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.DO_NOTHING, null=True) # TODO 03/24 should this be SupplierPOGRNMaterial? Is this needed? can get from batch_number
#     club_shade_display_order = models.IntegerField(null=True)
#     split_from = models.ForeignKey("self", null=True, on_delete=models.CASCADE)
#
#
# class FabricGRNWidth(BaseAbstractModel):
#     actual_width = models.FloatField()
#     actual_width_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True, default=MaterialUnitHelper.INCHES_UNIT)
#     grn = models.ForeignKey(SupplierPOGRN, on_delete=models.CASCADE)
#     material_helper = MaterialUnitHelper()
#
#     @property
#     def normalized_actual_width_unit(self):
#         return MaterialUnitHelper.INCHES_UNIT
#
#     @property
#     def normalized_actual_width(self):
#         value = self.actual_width
#         if value:
#             inch_conversion = self.material_helper.get_inch_conversion(self.actual_width_units)
#             value = value * inch_conversion
#         return value
#
#     @property
#     def actual_width_display_value(self):
#         measuring_units_dict = self.material_helper.all_measuring_units_dictionary
#         unit_display_value = measuring_units_dict.get(self.normalized_actual_width_unit, self.normalized_actual_width_unit)
#         return f'{self.normalized_actual_width} {unit_display_value}'

#
# class ReplacementQuantityDeliveryDate(BaseAbstractModel):
#     supplier_po_grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.CASCADE)
#     quantity = models.FloatField(null=True, default=0)
#     quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     replacement_expected_delivery_date = models.ForeignKey(SupplierDeliveryDate, on_delete=models.SET_NULL, null=True)
#
#     # DS Review notes TODO !!!! - looks like these reasons are copied from DebitNote, that is not correct. The only reasons for replacement are defects (color tone and defect) and short. For excess and mismatch there is always a debit note, and the values should not have debit_note in it
#     REJECTED_COLOR_TONE_REASON = 'color_tone_rejected_debit_note'
#     REJECTED_DEFECT_DEBIT_NOTE_REASON = 'defect_rejected_debit_note'
#     REJECTED_DEFECT_CPI_REASON = 'defect_rejected_cpi'
#
#     EXCESS_REASON = 'excess'
#     SHORT_REASON = 'short'
#     MISMATCH_REASON = 'mismatch'
#
#     REASON_CHOICES = (
#         (REJECTED_COLOR_TONE_REASON, 'Color Tone Rejected'),
#         (REJECTED_DEFECT_CPI_REASON, 'Defect Rejected CPI'),
#         (REJECTED_DEFECT_DEBIT_NOTE_REASON, 'Defect Rejected'),
#         (EXCESS_REASON, 'Excess'),
#         (SHORT_REASON, 'Short'),
#         (MISMATCH_REASON, 'Mismatch'),
#     )
#
#     reason = models.CharField(max_length=1000, choices=REASON_CHOICES, null=True)
#
#     def get_quantity_details(self):
#         normalized_unit = self.supplier_po_grn_material.grn_material.material_normalized_measuring_unit
#         data = get_quantity_dictionary(self.quantity, normalized_unit)
#         return data

#
# class SupplierPOGRNMaterialDetail(BaseAbstractModel):
#     supplier_po_grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.CASCADE)
#     indicated_quantity = models.FloatField(null=True)
#     indicated_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     actual_quantity = models.FloatField(null=True)
#     actual_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     indicated_grn_field_value = models.JSONField(null=True)
#     actual_grn_field_value = models.JSONField(null=True)
#     barcode = models.CharField(max_length=300, null=True)
#     qa_inspection_passed = models.BooleanField(null=True)
#     attachments = models.ManyToManyField(FileAttachment, blank=True)
#     supplier_barcode = models.CharField(max_length=500, null=True)
#     shade = models.ForeignKey(GRNBatchNumberShade, on_delete=models.SET_NULL, null=True)
#     batch_number = models.ForeignKey(FabricGRNBatchNumber, on_delete=models.DO_NOTHING, null=True)
#
#     qa_failed_quantity = models.FloatField(null=True, default=0)
#     qa_failed_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#
#     # These will be calculated once GRN is set to complete
#     excess_quantity = models.FloatField(null=True) # This need to be stored, to track what exactly happened
#     excess_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#
#     grn_quantity = models.FloatField(null=True) # This is the amount that will be grn'd. It is there to track excess values
#     grn_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     replacement_quantity = models.FloatField(null=True) # TODO - is this needed?
#     replacement_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True) # TODO - is this needed?
#     # End of calculated fields
#
#     INSPECTION_STATE_INSPECTION_NOT_NEED = 'inspection_not_need'
#     INSPECTION_STATE_READY_FOR_INSPECTION = 'ready_for_inspection'
#     INSPECTION_STATE_INSPECTION_IN_PROGRESS = 'inspection_in_progress'
#     INSPECTION_STATE_INSPECTION_COMPLETE = 'inspection_complete'
#     INSPECTION_STATE_CHOICES = (
#         (INSPECTION_STATE_INSPECTION_NOT_NEED, 'Inspection Not Need'),
#         (INSPECTION_STATE_READY_FOR_INSPECTION, 'Ready For Inspection'),
#         (INSPECTION_STATE_INSPECTION_IN_PROGRESS, 'Inspection In Progress'),
#         (INSPECTION_STATE_INSPECTION_COMPLETE, 'Inspection Complete')
#     )
#
#     inspection_state = models.CharField(max_length=200, choices=INSPECTION_STATE_CHOICES, default=INSPECTION_STATE_INSPECTION_NOT_NEED)
#     inspection_attempt = models.IntegerField(null=True)
#
#     SHADE_CATEGORY_ROLL_TO_ROLL_SHADING = 'roll_to_roll_shading'
#     SHADE_CATEGORY_WITHIN_THE_ROLL_SHADING = 'within_the_roll_shading'
#     SHADE_CATEGORY_CHOICES = (
#         (SHADE_CATEGORY_ROLL_TO_ROLL_SHADING, 'Roll To Roll Shading'),
#         (SHADE_CATEGORY_WITHIN_THE_ROLL_SHADING, 'Within The Roll Shading')
#     )
#     shade_category = models.CharField(max_length=200, choices=SHADE_CATEGORY_CHOICES, null = True)
#     defect_rate_per_100_square_yards = models.FloatField(null=True)
#
#     # Keeps track of in housed quantity
#     in_housed_quantity = models.FloatField(default=0)
#     in_housed_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#
#     #TODO IF key value changes from the field name get_grn_editable_fileds() will break
#     INDICATED_QUANTITY_VALUE_KEY = 'indicated_quantity'
#     INDICATED_QUANTITY_UNITS_VALUE_KEY = 'indicated_quantity_units'
#     ACTUAL_QUANTITY_VALUE_KEY = 'actual_quantity'
#     ACTUAL_QUANTITY_UNITS_VALUE_KEY = 'actual_quantity_units'
#     INDICATED_GRN_FIELD_VALUE_KEY = 'indicated_grn_field_value'
#     ACTUAL_GRN_FIELD_VALUE_KEY = 'actual_grn_field_value'
#     BARCODE_VALUE_KEY = 'barcode'
#     QA_INSPECTION_VALUE_KEY = 'qa_inspection_passed'
#     ATTACHMENTS_VALUE_KEY = 'attachments'
#     SHADE_VALUE_KEY = 'shade'
#     BATCH_NUMBER_VALUE_KEY = 'batch_number'
#     SHADE_CATEGORY_VALUE_KEY = 'shade_category'
#     QA_FAILED_QUANTITY_KEY = 'qa_failed_quantity'
#     QA_FAILED_QUANTITY_UNITS_KEY = 'qa_failed_quantity_units'
#
#     material_helper = MaterialUnitHelper()
#
#     @property
#     def qa_passed_quantity(self):
#         mh = MaterialUnitHelper()
#         material = self.supplier_po_grn_material.grn_material.get_user_defined_material()
#         material_unit = mh.get_normalized_unit_based_on_category(material.consumption_measurement_unit)
#         actual_quantity = mh.convert_to_units(material_unit, self.actual_quantity, self.actual_quantity_units)
#         if material.name == Material.FABRIC_MATERIAL:
#             if self.batch_number and self.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_FAILED:
#                 qa_passed_quantity = 0
#             else:
#                 qa_passed_quantity = actual_quantity
#
#         else:
#             qa_rejected_quantity = self.qa_failed_quantity
#             if self.qa_failed_quantity:
#                 qa_rejected_quantity = mh.convert_to_units(material_unit, get_float_or_zero(self.qa_failed_quantity), self.qa_failed_quantity_units)
#             qa_passed_quantity = actual_quantity - qa_rejected_quantity
#         data = {
#             'qa_passed_quantity': qa_passed_quantity,
#             'qa_passed_quantity_units': material_unit,
#         }
#         return data
#
#     @property
#     def passed_qa(self):
#         return self.qa_inspection_passed
#
#     @property
#     def normalized_actual_quantity_unit(self):
#         return self.material_helper.get_normalized_unit(self.actual_quantity_units)
#
#     @property
#     def normalized_actual_quantity(self):
#         normalized_unit = self.normalized_actual_quantity_unit
#         value = 0
#         if self.actual_quantity:
#             value = self.material_helper.convert_to_units(normalized_unit, self.actual_quantity, self.actual_quantity_units)
#         return value
#
#     @property
#     def normalized_actual_quantity_display_value(self):
#         measuring_units_dict = self.material_helper.all_measuring_units_dictionary
#         unit_display_value = measuring_units_dict.get(self.normalized_actual_quantity_unit, self.normalized_actual_quantity_unit)
#         return f'{self.normalized_actual_quantity} {unit_display_value}'
#
#     def set_barcode(self):
#         if not self.barcode:
#             barcode_string = f"GRNMATD-{self.pk}".upper()
#             self.barcode = base64_encode_string(barcode_string)
#             self.save()
#
#     def calculate_defect_rate(self):
#         defect_rate_sum = float(self.supplierpogrnmaterialqa_set.all().aggregate(Sum("defect", default=0))['defect__sum'])
#         fabric_grn_detail = get_object_or_none(FabricGRNDetail, {'grn_material_detail': self.id})
#         result = None
#         if fabric_grn_detail:
#             length = self.actual_quantity * self.material_helper.get_yard_conversion_amount(self.actual_quantity_units)
#             width = fabric_grn_detail.actual_width.actual_width * self.material_helper.get_yard_conversion_amount(fabric_grn_detail.actual_width.actual_width_units)
#             role_square_yards = length * width
#             defect_rate_per_100_square_yards = round((defect_rate_sum / role_square_yards) * 100,2)
#             self.defect_rate_per_100_square_yards = defect_rate_per_100_square_yards
#             # print(role_square_yards, defect_rate_per_100_square_yards)
#             if defect_rate_per_100_square_yards >= 28:
#                 self.qa_inspection_passed = False
#             else:
#                 self.qa_inspection_passed = True
#             self.save()
#         return result
#
#
# class FabricGRNDetail(BaseAbstractModel):
#     grn_material_detail = models.OneToOneField(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)
#     pack_number = models.CharField(max_length=300, null=True)
#     actual_width = models.ForeignKey(FabricGRNWidth, on_delete=models.DO_NOTHING, null=True)
#     indicated_width = models.FloatField(null=True)
#     indicated_width_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     actual_gsm = models.FloatField(null=True)
#     indicated_gsm = models.FloatField(null=True)
#     shrink_lot = models.FloatField(null=True)
#     shrink_width = models.FloatField(null=True)
#     shrink_length = models.FloatField(null=True)
#     remarks = models.CharField(max_length=300, null=True)
#     color_tone = models.ForeignKey(FabricColorTone, on_delete=models.DO_NOTHING, null=True)
#
#     COLOR_TONE_MISMATCH = 'color_tone_mismatch'
#     BATCH_HIGH_FAILURE = 'batch_high_failure'
#     COLOR_TONE_MISMATCH_AND_BATCH_HIGH_FAILURE = 'color_tone_mismatch_batch_high_failure'
#     OTHER_REASON = 'other'
#
#     INSPECTION_FAILED_REASON_CHICES = (
#         (COLOR_TONE_MISMATCH, "Color Tone Mismatch"),
#         (BATCH_HIGH_FAILURE, "Batch High Failure"),
#         (COLOR_TONE_MISMATCH_AND_BATCH_HIGH_FAILURE, "Color Tone Mismatch Batch High Failure"),
#         (OTHER_REASON, "Other Reason")
#     )
#
#     qa_inspection_failed_reason = models.CharField(max_length=100, choices=INSPECTION_FAILED_REASON_CHICES, null=True)
#
#     #TODO IF key value changes from the field name get_grn_editable_fileds() will break
#     PACK_NUMBER_VALUE_KEY = 'pack_number'
#     ACTUAL_WIDTH_VALUE_KEY = 'actual_width'
#     ACTUAL_WIDTH_UNITS_VALUE_KEY = 'actual_width_units'
#     INDICATED_WIDTH_VALUE_KEY = 'indicated_width'
#     INDICATED_WIDTH_UNITS_VALUE_KEY = 'indicated_width_units'
#     ACTUAL_GSM_VALUE_KEY = 'actual_gsm'
#     INDICATED_GSM_VALUE_KEY = 'indicated_gsm'
#     SHRINK_LOT_VALUE_KEY = 'shrink_lot'
#     SHRINK_WIDTH_VALUE_KEY = 'shrink_width'
#     SHRINK_LENGTH_VALUE_KEY = 'shrink_length'
#     REMARKS_VALUE_KEY = 'remarks'
#     COLOR_TONE_VALUE_KEY = 'color_tone'
#
#     @property
#     def is_valid_color_tone(self):
#         valid = False
#         po_club = self.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.po_club
#         material = self.grn_material_detail.supplier_po_grn_material.grn_material
#         if self.color_tone:
#             valid = POClubMaterialColorTone.objects.filter(
#                 po_club=po_club,
#                 material=material,
#                 acceptable_color_tones=self.color_tone
#             ).exists()
#         return valid
#
#     def set_qa_inspection_failed_reason(self):
#         if self.color_tone:
#             po_club = self.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.po_club
#             material = self.grn_material_detail.supplier_po_grn_material.grn_material
#             if self.color_tone:
#                 valid = POClubMaterialColorTone.objects.filter(
#                     po_club=po_club,
#                     material=material,
#                     acceptable_color_tones=self.color_tone
#                 ).exists()
#             if self.grn_material_detail.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_FAILED and not valid:
#                 self.qa_inspection_failed_reason = FabricGRNDetail.COLOR_TONE_MISMATCH_AND_BATCH_HIGH_FAILURE
#             elif self.grn_material_detail.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_HIGH_FAIL_RATE and valid:
#                 self.qa_inspection_failed_reason = FabricGRNDetail.BATCH_HIGH_FAILURE
#             elif self.grn_material_detail.batch_number.inspection_status == FabricGRNBatchNumber.INSPECTION_STATUS_INSPECTION_PASSED and not valid:
#                 self.qa_inspection_failed_reason = FabricGRNDetail.COLOR_TONE_MISMATCH
#                 self.grn_material_detail.qa_inspection_passed = False
#                 self.grn_material_detail.save()
#             self.save()
#
#
# class SupplierPOGRNMaterialQA(BaseAbstractModel):
#     supplier_po_grn_material_detail = models.ForeignKey(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)
#     defect = models.ForeignKey(UserDefinedMaterialDefect, on_delete=models.DO_NOTHING, null=True)
#     remarks = models.TextField(null=True)
#     defect_distance_from_start = models.FloatField(null=True)
#     defect_distance_from_start_units = models.CharField(max_length=200, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, default=MaterialUnitHelper.CENTIMETERS_UNIT)
#     defect_width_from_left = models.FloatField(null=True)
#     defect_width_from_left_units = models.CharField(max_length=200, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, default=MaterialUnitHelper.CENTIMETERS_UNIT)
#
#     DEFECT_RATING_CHOICES = (
#         (1, 1),
#         (2, 2),
#         (3, 3),
#         (4, 4),
#     )
#     defect_rating = models.IntegerField(null=True, choices=DEFECT_RATING_CHOICES, default=1)


# class POClubMaterialShrinkage(BaseAbstractModel):
#     po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
#     material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
#     supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)

#     SHRINKAGE_TIME_FRAME_24_HOURS = '24_hours'
#     SHRINKAGE_TIME_FRAME_48_HOURS = '48_hours'

#     SHRINKAGE_TIMES = (
#         (SHRINKAGE_TIME_FRAME_24_HOURS, '24 Hours'),
#         (SHRINKAGE_TIME_FRAME_48_HOURS, '48 Hours'),
#     )

#     shrinkage_test_time_frame = models.CharField(max_length=200, choices=SHRINKAGE_TIMES, null=True)


# class POClubShrinkLot(BaseAbstractModel):
#     material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE)
#     po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
#     shrink_lot_name = models.CharField(max_length=400)


# class SupplierPOGRNShrinkageValue(BaseAbstractModel):
#     po_club_shrinkage = models.ForeignKey(POClubMaterialShrinkage, on_delete=models.CASCADE)
#     grn_material_detail = models.OneToOneField(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)
#     residual_shrinkage_length = models.FloatField(null=True)
#     residual_shrinkage_width = models.FloatField(null=True)
#     steam_shrinkage_length = models.FloatField(null=True)
#     steam_shrinkage_width = models.FloatField(null=True)
#     wash_shrinkage_length = models.FloatField(null=True)
#     wash_shrinkage_width = models.FloatField(null=True)
#     panel_before_shrinking = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True, related_name='panel_before_shrinking')
#     panel_after_shrinking = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True, related_name='panel_after_shrinking')
#     shrinkage_unit = models.CharField(max_length=400, choices=MaterialUnitHelper.ALL_LENGTH_UNITS, default=MaterialUnitHelper.INCHES_UNIT, null=True)
#     shrinkage_lot = models.ForeignKey(POClubShrinkLot, on_delete=models.DO_NOTHING, null=True)


class POMarkerPoint(BaseAbstractModel):
    po_marker = models.ForeignKey(POFabricMarker, on_delete = models.CASCADE)
    cut_point = models.FloatField()
    cut_point_unit = models.CharField(max_length=200, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    back_point = models.FloatField()
    back_point_unit = models.CharField(max_length=200, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)

    mh = MaterialUnitHelper()

    @property
    def normalized_cut_point(self):
        return convert_quantity_to_unit(self.mh.get_normalized_unit(self.cut_point_unit), self.cut_point, self.cut_point_unit)

    @property
    def normalized_back_point(self):
        return convert_quantity_to_unit(self.mh.get_normalized_unit(self.back_point_unit), self.back_point, self.back_point_unit)

class POClubItemClassification(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete = models.CASCADE)
    item = models.ForeignKey('Item', on_delete = models.CASCADE)
    size = models.ForeignKey('shared.Size', on_delete = models.CASCADE)
    country = models.ForeignKey('shared.Country', on_delete = models.CASCADE)
    name = models.CharField(max_length = 200, null = True)

# class DebitNote(BaseAbstractModel):
#     commercial_invoice = models.ForeignKey(SupplierPODeliveryInvoice, on_delete=models.CASCADE)
#     DRAFT_STATE = 'draft'
#     READY_TO_SEND = 'ready_to_send'
#     DEBIT_NOTE_SEND = 'debit_note_sent'
#     COMPLETE_STATE = 'complete'
#     CANCELED_STATE = 'canceled'
# 
#     STATE_CHOICES = (
#         (DRAFT_STATE, 'Draft'),
#         (READY_TO_SEND, 'Ready To Send'),
#         (DEBIT_NOTE_SEND, 'Debit Note Sent'),
#         (COMPLETE_STATE, 'Complete'),
#         (CANCELED_STATE, 'Canceled')
#     )
#     ACTIVE_STATES = [
#         DRAFT_STATE,
#         READY_TO_SEND,
#         DEBIT_NOTE_SEND,
#         COMPLETE_STATE
#     ]
#     status = models.CharField(max_length=100, choices=STATE_CHOICES, default=DRAFT_STATE)
# 
#     FREE_OF_CHARGE = 'free_of_charge'
#     RETURN = 'return'
# 
#     REMEDIATION_STATUS = (
#         (FREE_OF_CHARGE, 'free_of_charge'),
#         (RETURN, 'return')
#     )
#     remediation_action = models.CharField(max_length=100, choices=REMEDIATION_STATUS, null=True) # TODO MAJOR - Move this to debit note material
# 
#     attachment = models.ForeignKey(FileAttachment, on_delete=models.CASCADE, null=True)
#     free_of_charge = models.BooleanField(null=True)
# 
#     @property
#     def display_number(self):
#         return f"DEBNOTE{self.id:06}"
# 
#     @property
#     def debit_note_editable(self):
#         editable = self.status in [
#             self.DRAFT_STATE,
#         ]
#         return editable
# 
# 
# class DebitNoteMaterial(BaseAbstractModel):
#     debit_note = models.ForeignKey(DebitNote, on_delete=models.CASCADE)
#     #debit_note_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE) # TODO - remove this field
#     supplier_po_grn_material = models.ForeignKey(SupplierPOGRNMaterial, on_delete=models.SET_NULL, null=True)
# 
#     REJECTED_COLOR_TONE_REASON = 'color_tone_rejected_debit_note'
#     REJECTED_DEFECT_DEBIT_NOTE_REASON = 'defect_rejected_debit_note'
#     REJECTED_DEFECT_CPI_REASON = 'defect_rejected_cpi'
# 
#     EXCESS_REASON = 'excess'
#     SHORT_REASON = 'short'
#     MISMATCH_REASON = 'mismatch'
# 
#     REASON_CHOICES = (
#         (REJECTED_COLOR_TONE_REASON, 'Color Tone Rejected'),
#         (REJECTED_DEFECT_CPI_REASON, 'Defect Rejected CPI'),
#         (REJECTED_DEFECT_DEBIT_NOTE_REASON, 'Defect Rejected'),
#         (EXCESS_REASON, 'Excess'),
#         (SHORT_REASON, 'Short'),
#         (MISMATCH_REASON, 'Mismatch'),
#     )
# 
#     reason = models.CharField(max_length=100, choices=REASON_CHOICES, null=True)
#     unit_price = models.FloatField(null=True)
#     unit_price_units = models.CharField(max_length=100, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
#     total_price = models.FloatField(null=True)
#     total_quantity = models.FloatField(null=True)
#     total_quantity_units =  models.CharField(max_length=100, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
# 
#     # TODO Major - this is wrong. Don't need this function also
#     def get_total_quantity(self):
#         normalized_unit = self.supplier_po_grn_material.grn_material.material_normalized_measuring_unit
#         data = get_quantity_dictionary(self.total_quantity, normalized_unit)
#         return data
# 
# 
# class DebitNoteMaterialDetail(BaseAbstractModel):
#     debit_note_material = models.ForeignKey(DebitNoteMaterial, on_delete=models.CASCADE)
#     quantity = models.FloatField(null=True)
#     quanity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
#     grn_material_detail = models.ForeignKey(SupplierPOGRNMaterialDetail, on_delete=models.CASCADE)


class PackPackaging(BaseAbstractModel):
    costing = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    current_version = models.BooleanField(default=False)

    @property
    def display_number(self):
        return f"PIV{self.id:06}"


class PackInstruction(BaseAbstractModel):
    pack_packaging = models.ForeignKey(PackPackaging, on_delete=models.CASCADE)
    carton = models.ForeignKey(CustomerBrandMaterial, on_delete=models.SET_NULL, null=True)


class PackInstructionOrderPack(BaseAbstractModel):
    pack_instruction = models.ForeignKey(PackInstruction, on_delete=models.CASCADE)
    order_pack = models.ForeignKey(OrderPack, on_delete=models.CASCADE)
    quantity = models.IntegerField(null=True)
    ratio = models.IntegerField(null=True)


class PurchaseOrderPackaging(BaseAbstractModel):
    purchase_order = models.OneToOneField(PurchaseOrder, on_delete=models.CASCADE)

    @property
    def display_number(self):
        return f"POPIV{self.id:06}"


class PurchaseOrderPackagingInstruction(BaseAbstractModel):
    po_pack_packaging = models.ForeignKey(PurchaseOrderPackaging, on_delete=models.CASCADE)
    carton = models.ForeignKey(CustomerBrandMaterial, on_delete=models.SET_NULL, null=True)


class PurchaseOrderPackagingInstructionOrderPack(BaseAbstractModel):
    po_pack_instruction = models.ForeignKey(PurchaseOrderPackagingInstruction, on_delete=models.CASCADE)
    po_pack = models.ForeignKey(POPack, on_delete=models.CASCADE)
    quantity = models.IntegerField(null=True)
    ratio = models.IntegerField(null=True)


class POClubLeftOverMaterial(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete=models.DO_NOTHING)
    in_house_material = models.ForeignKey('shared.InHouseMaterial', on_delete=models.CASCADE)
    assigned_customer_brand_material = models.ForeignKey('materials.CustomerBrandMaterial', on_delete=models.CASCADE)
    quantity = models.FloatField(null=True)
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)


class POClubCutInstruction(BaseAbstractModel):
    cut_number = models.IntegerField()
    marker = models.ForeignKey(POFabricMarker, on_delete=models.CASCADE)
    WITH_JOINT_LAYERING_TYPE = 'with_joint'
    WITHOUT_JOINT_LAYERING_TYPE = 'without_joint'
    LAYERING_TYPE_CHOICES = (
        (WITH_JOINT_LAYERING_TYPE, 'With Joint'),
        (WITHOUT_JOINT_LAYERING_TYPE, 'Without Joint')
    )
    layering_type = models.CharField(max_length=200, choices=LAYERING_TYPE_CHOICES)
    ply_count = models.IntegerField()


class PurchaseOrderDelivery(BaseAbstractModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    transport_delivery_date_tracking = models.ForeignKey('transport.TransportDeliveryDateTracking', on_delete=models.SET_NULL, null=True, related_name="export")
    delivery_port = models.ForeignKey(Port, on_delete=models.SET_NULL, null=True)
    # customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True)
    shipping_method = models.CharField(max_length=20, choices=SHIPPING_MODE_TYPES, null=True)
    delivery_date = models.DateField()
    outgoing_commercial_invoice = models.ForeignKey(OutgoingCommercialInvoice ,on_delete=models.SET_NULL, null=True)
    total_amount = models.FloatField(null=True)
    currency = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)

    @property
    def display_number(self):
        return f"SHIPMENT{self.id:06}"
    
    def set_total_amount(self):
        total_amount = 0
        for purchase_order_delivery_pack in self.purchaseorderdeliverypack_set.all():
            pack_cost = purchase_order_delivery_pack.po_pack.get_pack_cost()
            total_amount += pack_cost
        self.total_amount = total_amount
        self.save()

    def get_balance(self):
        balance = 0
        if self.outgoing_commercial_invoice:
            balance = self.total_amount - self.outgoing_commercial_invoice.amount
        else:
            balance = self.total_amount
        return balance

    def get_plant(self):
        plant = self.purchase_order.plant
        return plant


class PurchaseOrderDeliveryPack(BaseAbstractModel):
    purchase_order_delivery = models.ForeignKey(PurchaseOrderDelivery, on_delete=models.CASCADE)
    po_pack = models.ForeignKey(POPack, on_delete=models.CASCADE)
    quantity = models.IntegerField(null=True)
    shipped_quantity = models.IntegerField(null=True)


class ActualPOClubColorway(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    colorway_name = models.CharField(max_length=1000)
    completed = models.BooleanField(default=False)
    marketing_order_colorway = models.ForeignKey(OrderColorway, related_name='actual_po_club_marketing_costing_order_colorway', on_delete=models.SET_NULL, null=True)
    pre_costing_order_colorway = models.ForeignKey(OrderColorway, related_name='actual_po_club_pre_costing_colorway_set', on_delete=models.SET_NULL, null=True)

    def get_purchase_order_colorways(self):
        return self.pocolorway_set.all()


class ActualPOClubCountry(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    country_name = models.CharField(max_length=1000)
    marketing_order_country = models.ForeignKey(OrderCountry, related_name='actual_po_club_marketing_costing_order_country', on_delete=models.SET_NULL, null=True)
    pre_costing_order_country = models.ForeignKey(OrderCountry, related_name='actual_po_club_pre_costing_order_country_set', on_delete=models.SET_NULL, null=True)

    def get_purchase_order_countries(self):
        return self.pocountry_set.all()


class ActualPOClubSize(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    size_name = models.CharField(max_length=1000)
    sorting_order = models.IntegerField(default=0)
    marketing_order_size = models.ForeignKey(OrderSize, related_name='actual_po_club_marketing_costing_order_size',  on_delete=models.SET_NULL, null=True)
    pre_costing_order_size = models.ForeignKey(OrderSize, related_name='actual_po_club_pre_costing_order_size_set', on_delete=models.SET_NULL, null=True)

    def get_purchase_order_sizes(self):
        return self.posize_set.all()


class ActualPOClubItem(BaseAbstractModel):
    po_club = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    item_name = models.CharField(max_length=1000)
    item_identifier = models.CharField(max_length=10, null=True)
    marketing_costing_order_item = models.ForeignKey(OrderItem, related_name='actual_po_club_marketing_costing_order_item', on_delete=models.SET_NULL, null=True)
    pre_costing_order_item = models.ForeignKey(OrderItem, related_name='actual_po_club_pre_costing_order_item_set', on_delete=models.SET_NULL, null=True)


class MarkerCutPlan(BaseAbstractModel):
    cut_number = models.IntegerField()
    # marker_length = models.FloatField()
    ply_count = models.IntegerField()
    marker = models.ForeignKey(POFabricMarker, on_delete=models.CASCADE)
    # marker_shade = models.CharField(max_length=200, null=True)
    required_fabric_qty = models.FloatField()
    LAYERING_TYPE_AUTO = 'auto'
    LAYERING_TYPE_WITH_JOINT = 'with_joint'
    LAYERING_TYPE_WITHOUT_JOINT = 'without_joint'
    LAYERING_TYPE_CHOICE = (
        (LAYERING_TYPE_AUTO, 'Auto'),
        (LAYERING_TYPE_WITH_JOINT, 'With Joint'),
        (LAYERING_TYPE_WITHOUT_JOINT, 'Without Joint')
    )
    layering_type = models.CharField(max_length=100, null=True, choices=LAYERING_TYPE_CHOICE)

    DRAFT_STATE = 'draft'
    ROLL_SEQUENCE_GENARETED_STATE = 'roll_sequence_generated'
    FINALIZED_STATE = 'finalized'

    STATE_CHOICE = (
        (DRAFT_STATE, 'Draft'),
        (ROLL_SEQUENCE_GENARETED_STATE, 'Roll Sequence Genareted'),
        (FINALIZED_STATE, 'Finalized')
    )

    state = models.CharField(max_length=100, default=DRAFT_STATE, choices=STATE_CHOICE)
    marker_length_allowance = models.FloatField(default=0)
    marker_length_allowance_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_LENGTH_UNITS,
                                                     null=True)

    mh = MaterialUnitHelper()

    def get_marker_cut_plans_not_sequenced(self):
        next_marker_cut_plans = MarkerCutPlan.objects.filter(marker__po_material=self.marker.po_material,
                                                             marker__actual_club=self.marker.actual_club).exclude(
            pk=self.id)
        return next_marker_cut_plans

    @property
    def normalized_marker_length_allowance_units(self):
        return self.mh.get_normalized_unit(self.marker_length_allowance_units)

    @property
    def normalized_marker_length_allowance(self):
        value = 0
        if self.normalized_marker_length_allowance_units:
            value = \
            convert_quantity_to_unit(self.normalized_marker_length_allowance_units, self.marker_length_allowance,
                                     self.marker_length_allowance_units)['quantity']
        return value

    @property
    def normalized_marker_length_with_allowance(self):
        original_normalized_marker_length = self.marker.get_normalized_marker_length()
        return original_normalized_marker_length + self.normalized_marker_length_allowance

    def get_marker_options(self):
        marker_options = []

        po_club_markers = self.marker.actual_club.get_markers().filter(reviewed=True)
        po_club_width_markers = po_club_markers.filter(item=self.marker.item, width=self.marker.width,
                                                       po_material=self.marker.po_material)
        for po_club_width_marker in po_club_width_markers:
            marker_options.append({
                "marker_id": po_club_width_marker.id,
                "marker_name": po_club_width_marker.marker_name,
                "marker_length": po_club_width_marker.marker_length,
                "marker_length_unit": po_club_width_marker.marker_length_unit
            })
        return marker_options

    def get_roll_sequences(self):
        roll_sequences = self.rollsequence_set.all().order_by('sequence_number')
        return roll_sequences

    def calculate_marker_cut_plan_ply_count(self, left_over=False):
        ply_count = 0
        roll_sequences = self.get_roll_sequences()
        for roll_sequence in roll_sequences:
            ply_count += roll_sequence.calculate_ply_count(left_over)
        return ply_count


class RollSequence(BaseAbstractModel):
    cut_plan = models.ForeignKey(MarkerCutPlan, on_delete=models.CASCADE)
    sequence_number = models.IntegerField()

    WITH_JOINT = 'with_joint'
    WITHOUT_JOINT = 'without_joint'
    LAYERING_TYPE_CHOICE = ((WITH_JOINT, 'With Joint'),
                            (WITHOUT_JOINT, 'Without Joint'))
    layering_type = models.CharField(max_length=100, choices=LAYERING_TYPE_CHOICE)

    def calculate_ply_count(self, left_over=False):
        selected_rolls = self.selectedroll_set.all().order_by('sequence_number').filter(
            purchase_order_allocated_material__is_left_over=left_over)
        ply_count = 0
        for selected_roll in selected_rolls:
            ply_count += selected_roll.ply_count
        return ply_count


class SelectedRoll(models.Model):
    purchase_order_allocated_material = models.ForeignKey(PurchaseOrderAllocatedMaterial, on_delete=models.CASCADE)
    sequence_number = models.IntegerField()
    ply_count = models.IntegerField()
    quantity = models.FloatField()
    quantity_units = models.CharField(max_length=200, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    unusable_quantity = models.FloatField()
    unusable_quantity_units = models.CharField(max_length=200, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    marker_point = models.ForeignKey(POMarkerPoint, on_delete=models.CASCADE, null=True)
    roll_sequence = models.ForeignKey(RollSequence, models.CASCADE)

    mh = MaterialUnitHelper()

    @property
    def normalized_quantity_units(self):
        return self.mh.get_normalized_unit(self.quantity_units)

    @property
    def normalized_quantity(self):
        return convert_quantity_to_unit(self.normalized_quantity_units, self.quantity, self.quantity_units)['quantity']

    @property
    def normalized_unusable_quantity_units(self):
        return self.mh.get_normalized_unit(self.unusable_quantity_units)

    @property
    def normalized_unusable_quantity(self):
        return convert_quantity_to_unit(self.normalized_unusable_quantity_units, self.unusable_quantity,
                                        self.unusable_quantity_units)['quantity']

class SupplierInquiryCostingVersion(BaseAbstractModel):
    supplier_inquiry = models.ForeignKey(SupplierInquiry, on_delete=models.CASCADE)
    costing_version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    estimated_quantity = models.FloatField(null=True)
    estimated_quantity_unit = models.CharField(max_length=200, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)


class CostingCompletedMaterial(BaseAbstractModel):
    costing_version = models.ForeignKey(OrderCostingVersion, on_delete=models.CASCADE)
    material = models.ForeignKey(UserDefinedMaterial, on_delete=models.CASCADE)


class POClubCompletedMaterial(BaseAbstractModel):
    po_club  = models.ForeignKey(ActualPOClub, on_delete=models.CASCADE)
    material = models.ForeignKey(UserDefinedMaterial, on_delete=models.CASCADE)


class BOMChangeRequest(BaseAbstractModel):
    entity_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    entity_id = models.PositiveIntegerField()
    entity = GenericForeignKey('entity_type', 'entity_id')
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    reason = models.TextField(null=True)

    DRAFT_STATE = 'draft'
    PENDING_APPROVAL_STATE = 'pending_approval'
    APPROVED_STATE = 'approved'
    REJECTED_STATE = 'rejected'

    STATE_CHOICES = (
        (DRAFT_STATE, 'Draft'),
        (PENDING_APPROVAL_STATE, 'Pending Approval'),
        (APPROVED_STATE, 'Approved'),
        (REJECTED_STATE, 'Rejected'),
    )
    state = models.CharField(max_length=400, choices=STATE_CHOICES, default=DRAFT_STATE)

    @property
    def display_number(self):
        return f"BCR{self.id:06}"

    @property
    def po_club(self):
        return self.entity if isinstance(self.entity, ActualPOClub) else None

    def create_approval(self, users, action_user, approval):
        from shared.approvals.utils import ApprovalUtils
        from shared.approvals.constants.task_entities import BOM_CHANGE_REQUEST_ENTITY
        from shared.approvals.constants.approval_choices import get_approval_display_value
        approval_entity_data = []
        approval_entity_data.append({
			'entity_id': self.id,
			'entity_name': BOM_CHANGE_REQUEST_ENTITY
		})
        approval_display_value = get_approval_display_value(approval)
        approval = ApprovalUtils.assign_approval(users, action_user, approval_entity_data, approval, approval_display_value)
        return approval

    def get_consumption_change_material_ids(self):
        consumption_change_material_ids = []
        consumption_change_materials = BOMChangeRequestConsumptionChange.objects.filter(bom_change_request_type__bom_change_request=self)
        for consumption_change_material in consumption_change_materials:
            if consumption_change_material.po_pack_placement:
                consumption_change_material_ids.append(consumption_change_material.po_pack_placement.po_material)
            elif consumption_change_material.po_pack_item_placement:
                consumption_change_material_ids.append(consumption_change_material.po_pack_item_placement.po_material)
        return consumption_change_material_ids

    def get_not_approved_materials(self):
        materials = None
        all_material_ids = []
        if self.state in [self.DRAFT_STATE, self.PENDING_APPROVAL_STATE]:
            price_material_ids = BOMChangeRequestPriceChange.objects.filter(bom_change_request_type__bom_change_request=self).values_list('material_price__supplier_material__customer_brand_material', flat=True)
            material_change_material_ids = BOMChangeRequestMaterialChange.objects.filter(bom_change_request_type__bom_change_request=self).values_list('old_material', flat=True)
            consumption_change_material_ids = self.get_consumption_change_material_ids()
            supplier_change_material_ids = BOMChangeRequestSupplierChange.objects.filter(bom_change_request_type__bom_change_request=self).values_list('material', flat=True)
            all_material_ids = list(price_material_ids) + list(material_change_material_ids) + list(consumption_change_material_ids) + list(supplier_change_material_ids)
            #materials = CustomerBrandMaterial.objects.filter(id__in=all_material_ids)
        return all_material_ids

    def validate_material_in_pending_approve(self, bcr_materials):
        is_in_approve_material = False
        for id in self.get_not_approved_materials():
            if id in bcr_materials:
                is_in_approve_material = True
        return is_in_approve_material


class BOMChangeRequestChangeType(BaseAbstractModel):
    bom_change_request = models.ForeignKey(BOMChangeRequest, on_delete=models.CASCADE)

    PRICE_CHANGE = 'price_change'
    MATERIAL_CHANGE = 'material_change'
    CONSUMPTION_CHANGE = 'consumption_change'
    SUPPLIER_CHANGE  = 'supplier_change'

    CHANGE_TYPES = (
		(PRICE_CHANGE, 'Price Change'),
		(MATERIAL_CHANGE, 'Material Change'),
		(CONSUMPTION_CHANGE, 'Consumption Ratio Change'),
        (SUPPLIER_CHANGE, 'Supplier Change')
	)
    state = models.CharField(max_length=400, choices=CHANGE_TYPES, default=PRICE_CHANGE)

    def get_select_markers(self):
        marker_ids = self.bomchangerequestfabricmarker_set.all().values_list('marker', flat=True)
        return marker_ids

    def get_material_id(self):
        material_id = None
        if self.state == BOMChangeRequestChangeType.CONSUMPTION_CHANGE:
            bom_change_request_consumption_changes = self.bomchangerequestconsumptionchange_set.all()
            for bom_change_request_consumption_change in bom_change_request_consumption_changes:
                if isinstance(bom_change_request_consumption_change.entity, POPackItemPlacement):
                    po_pack_item_placement = get_object_or_404(POPackItemPlacement, pk=bom_change_request_consumption_change.entity_id)
                    material_id = po_pack_item_placement.po_material.id
                    break
                elif isinstance(bom_change_request_consumption_change.entity, POPackPlacement):
                    po_pack_placement = get_object_or_404(POPackPlacement, pk=bom_change_request_consumption_change.entity_id)
                    material_id = po_pack_placement.po_material.id
                    break
            marker_ids = self.get_select_markers()
            makers = POFabricMarker.objects.filter(id__in=marker_ids)
            for maker in makers:
                material_id = maker.po_material.id
                break
        return material_id


class BOMChangeRequestPriceChange(BaseAbstractModel):
    bom_change_request_type = models.ForeignKey(BOMChangeRequestChangeType, on_delete=models.CASCADE)
    material_price = models.ForeignKey('supplier_po.GeneralPOSupplierMaterialPrice', on_delete=models.SET_NULL, null=True) # Old material price
    old_price = models.FloatField(null=True)
    old_price_units = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)
    new_price = models.FloatField(null=True)
    new_price_units = models.CharField(max_length=100, choices=CurrencyHelper.CURRENCY_CHOICES, default=CurrencyHelper.USD_CURRENCY)


class BOMChangeRequestMaterialChange(BaseAbstractModel):
    bom_change_request_type = models.ForeignKey(BOMChangeRequestChangeType, on_delete=models.CASCADE)
    old_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE, related_name='old_materials')
    new_material = models.ForeignKey(CustomerBrandMaterial, on_delete=models.CASCADE, related_name='new_materials')
    supplier = models.ForeignKey('shared.Supplier', on_delete=models.SET_NULL, null=True)
    cutting_width = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    cutting_width_unit = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    costing_unit = models.CharField(max_length=200, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
    cost_per_unit = models.DecimalField(max_digits=20, decimal_places=6, default=None, blank=True, null=True)
    fob_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    cif_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    transport_charges = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    ex_work_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    expiration_date = models.DateField(null=True, blank=True)
    lead_time = models.IntegerField(null=True, blank = True)
    minimum_order_quantity = models.FloatField(null = True)
    minimum_order_quantity_units = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    excess_threshold = models.FloatField(null=True)
    supplier_inquiry_material_code = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE, null=True)

    SHIP_MODE_CHOICES = SHIPPING_MODE_TYPES
    SEA_CHOICE = SEA_TRANSPORT_METHOD
    ship_mode = models.CharField(max_length=100, choices=SHIP_MODE_CHOICES, default=SEA_TRANSPORT_METHOD)
    pay_mode = models.CharField(max_length=200, choices=PAYMENT_METHOD_TYPES, null=True)
    cost_per_unit_type = models.CharField(max_length=200, choices=COSTING_MODE_TYPES, null=True)


class BOMChangeRequestMaterialAppliedPackandPackItemPlacements(BaseAbstractModel):
    entity_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    entity_id = models.PositiveIntegerField()
    entity = GenericForeignKey('entity_type', 'entity_id')
    bom_change_request_material_change = models.ForeignKey(BOMChangeRequestMaterialChange, on_delete=models.CASCADE)
    new_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    new_wastage = models.DecimalField(null=True, decimal_places=6, max_digits=20)

    @property
    def placement(self):
        return self.entity

    @property
    def po_material(self):
        return self.placement.po_material



class BOMChangeRequestConsumptionChange(BaseAbstractModel):
    bom_change_request_type = models.ForeignKey(BOMChangeRequestChangeType, on_delete=models.CASCADE)
    entity_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    entity_id = models.PositiveIntegerField()
    entity = GenericForeignKey('entity_type', 'entity_id')
    old_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    old_wastage = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    new_consumption_ratio = models.DecimalField(null=True, decimal_places=6, max_digits=20)
    new_wastage = models.DecimalField(null=True, decimal_places=6, max_digits=20)

    @property
    def po_pack_placement(self):
        return self.entity if isinstance(self.entity, POPackPlacement) else None

    @property
    def po_pack_item_placement(self):
        return self.entity if isinstance(self.entity, POPackItemPlacement) else None


class BOMChangeRequestFabricVoidMarker(BaseAbstractModel):
    bom_change_request_type = models.ForeignKey(BOMChangeRequestChangeType, on_delete=models.CASCADE)
    void_marker = models.ForeignKey(POFabricMarker, on_delete=models.CASCADE)


class BOMChangeRequestFabricMarker(BaseAbstractModel):
    bom_change_request_type = models.ForeignKey(BOMChangeRequestChangeType, on_delete=models.CASCADE)
    marker = models.ForeignKey(POFabricMarker, on_delete=models.CASCADE)


class BOMChangeRequestSupplierChange(BaseAbstractModel):
    bom_change_request_type = models.ForeignKey(BOMChangeRequestChangeType, on_delete=models.CASCADE)
    material = models.ForeignKey('materials.CustomerBrandMaterial', on_delete=models.SET_NULL, null=True)
    old_material_price = models.ForeignKey('supplier_po.GeneralPOSupplierMaterialPrice', on_delete=models.SET_NULL, null=True)
    supplier = models.ForeignKey('shared.Supplier', on_delete=models.SET_NULL, null=True)
    cutting_width = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    cutting_width_unit = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    costing_unit = models.CharField(max_length=200, choices=PerMeasuringUnitHelper.ALL_PER_LENGTH_MEASURING_UNITS, null=True)
    cost_per_unit = models.DecimalField(max_digits=20, decimal_places=6, default=None, blank=True, null=True)
    fob_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    cif_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    transport_charges = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    ex_work_price = models.DecimalField(max_digits=20, decimal_places=6, default=0, blank=True, null=True)
    expiration_date = models.DateField(null=True, blank=True)
    lead_time = models.IntegerField(null=True, blank = True)
    minimum_order_quantity = models.FloatField(null = True)
    minimum_order_quantity_units = models.CharField(max_length=100, null=True, choices=MaterialUnitHelper.ALL_MEASURING_UNITS)
    excess_threshold = models.FloatField(null=True)
    supplier_inquiry_material_code = models.ForeignKey(SupplierInquiryMaterialCode, on_delete=models.CASCADE, null=True)

    SHIP_MODE_CHOICES = SHIPPING_MODE_TYPES
    SEA_CHOICE = SEA_TRANSPORT_METHOD
    ship_mode = models.CharField(max_length=100, choices=SHIP_MODE_CHOICES, default=SEA_TRANSPORT_METHOD)
    pay_mode = models.CharField(max_length=200, choices=PAYMENT_METHOD_TYPES, null=True)
    cost_per_unit_type = models.CharField(max_length=200, choices=COSTING_MODE_TYPES, null=True)