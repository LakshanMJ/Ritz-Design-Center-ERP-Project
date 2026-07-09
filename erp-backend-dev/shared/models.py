from django.db import models
from django.contrib.auth.models import AbstractUser, Group
from django.db.models import Sum

from shared.permissions.roles import ADMIN_ROLE
from materials.fieldmetadata.measuring_unit_helpers import PerMeasuringUnitHelper, MaterialUnitHelper, MaterialVolumeUnitHelper, MaterialWeightUnitHelper
from shared.utils import get_object_or_none_qs
from shared.utils import convert_quantity_to_unit, get_quantity_dictionary
from shared.utils import convert_quantity_to_unit, get_object_or_none, get_object_or_none_qs, \
    calculate_queryset_total_normalized_quantity, get_quantity_dictionary
from datetime import date
from dateutil.relativedelta import relativedelta
from shared.approvals.constants.approval_choices import APPROVAL_NAME_CHOICES
from shared.approvals.constants.task_descriptions import TASK_CHOICES

AIR_TRANSPORT_METHOD = 'air'
ROAD_TRANSPORT_METHOD = 'road'
SEA_TRANSPORT_METHOD = 'sea'

ALL_COSTING_TYPE = 'all'
CIF_COSTING_TYPE = 'cif'
FOB_COSTING_TYPE = 'fob'
EX_WORKS_COSTING_TYPE = 'ex-works'

SHIPPING_MODE_TYPES = (
    (AIR_TRANSPORT_METHOD, 'Air'),
    (ROAD_TRANSPORT_METHOD, 'Road'),
    (SEA_TRANSPORT_METHOD, 'Sea')
)

COSTING_MODE_TYPES = (
    (ALL_COSTING_TYPE, 'CIF-All'),
    (CIF_COSTING_TYPE, 'CIF-Sea'),
    (FOB_COSTING_TYPE, 'FOB'),
    (EX_WORKS_COSTING_TYPE, 'EX-Works')
)

TT_IN_ADVANCE_100_PRECENT_PAYMENT_METHOD_TYPE = '100% tt in advance'
TT_ADVANCE_PAYMENT_METHOD_TYPE = 'tt-advance'
CREDIT_DAYS_30_PAYMENT_METHOD_TYPE = '30 days credit'
CREDIT_DAYS_140_PAYMENT_METHOD_TYPE = '140 days credit'
LC_PAYMENT_METHOD_TYPE = 'lc'

PAYMENT_METHOD_TYPES = (
    (TT_IN_ADVANCE_100_PRECENT_PAYMENT_METHOD_TYPE, '100% TT in Advance'),
    (TT_ADVANCE_PAYMENT_METHOD_TYPE, 'TT-Advance'),
    (CREDIT_DAYS_30_PAYMENT_METHOD_TYPE, '30 Days Credit'),
    (CREDIT_DAYS_140_PAYMENT_METHOD_TYPE, '140 Days Credit'),
    (LC_PAYMENT_METHOD_TYPE, 'LC')
)



class Role(models.Model):
    name = models.CharField(max_length=200)
    users = models.ManyToManyField('User')
    groups = models.ManyToManyField(Group)

    def __str__(self):
        return self.name


class User(AbstractUser):

    # Checks if a user has a role
    def has_role(self, role_name):
        # If user is a superuser, they will inherit all the roles
        if self.is_superuser:
            return True
        elif self.role_set.filter(name=ADMIN_ROLE):
            return True

        role = Role.objects.get(name__iexact=role_name)
        user_has_role = role.users.filter(pk=self.pk)

        # Check if user inherits the role through a group
        user_groups = self.groups.all().values_list('pk', flat=True)
        role_groups = role.groups.all().values_list('pk', flat=True)
        user_inherits_role = list(set(user_groups) & set(role_groups))

        return user_has_role or user_inherits_role


# Every model imports from this. DO NOT MAKE CHANGES.
class BaseAbstractModel(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    active = models.BooleanField(default=True)
    updated_by = models.CharField(max_length=500, null=True)
    created_by = models.CharField(max_length=500, null=True)

    class Meta:
        abstract = True # DON'T CHANGE THIS to FALSE EVER

    def save(self, *args, **kwargs):
        request = kwargs.pop('request', None)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            self.created_by = request.user.username
        super().save(*args, **kwargs)

    def update(self, *args, **kwargs):
        request = kwargs.pop('request', None)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            self.updated_by = request.user.username
        super().save(*args, **kwargs)


class Brand(BaseAbstractModel):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=5, null=False, unique=False)

    def __str__(self):
        return self.name    


class Customer(BaseAbstractModel):
    name = models.CharField(max_length=500)
    phone_number = models.CharField(max_length=20, blank=True)
    email = models.CharField(max_length=100, blank=True)
    address = models.ForeignKey('shared.Address', on_delete=models.CASCADE, null=True)
    brands = models.ManyToManyField(Brand, through='CustomerBrand')
    code = models.CharField(max_length=5, null=False, unique=False )
    po_processor_name = models.CharField(max_length=500, null=True)
    payment_term = models.CharField(choices=PAYMENT_METHOD_TYPES, max_length=100, default=None, null=True)
    credit_days = models.IntegerField(null=True)
    users = models.ManyToManyField(User, through='CustomerMerchant')

    def __str__(self):
        return self.name
    

class CustomerMerchant(BaseAbstractModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    is_admin = models.BooleanField(default=False)


class CustomerBrand(BaseAbstractModel):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ('customer', 'brand'),
                name = 'unique_customer_brand'
            )
        ]

    def get_customer_brand_materials_qs(self, material_type=None):
        from materials.models import CustomerBrandMaterial, Material, UserDefinedMaterial
        customer_brand_materials = CustomerBrandMaterial.objects.filter(material_code__customer_brand=self)
        if material_type:
            customer_brand_materials = customer_brand_materials.filter(material_detail__generic_material__user_material__name=material_type)
        return customer_brand_materials

    def get_customer_brand_materials_data(self, material_type=None):
        if material_type:
            customer_brand_materials = self.get_customer_brand_materials_qs(material_type)
        else:
            customer_brand_materials = self.get_customer_brand_materials_qs()

        all_materials = []
        for customer_brand_material in customer_brand_materials:
            all_materials.append(customer_brand_material.get_attributes())
        return all_materials
    

class CustomerBrandDepartment(BaseAbstractModel):
    customer_brand = models.ForeignKey(CustomerBrand, on_delete=models.CASCADE)
    department = models.CharField(max_length=300)


class CustomerContactPerson(BaseAbstractModel):
    name = models.CharField(max_length=300)
    phone_number = models.CharField(max_length=20)
    email = models.CharField(max_length=100)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    primary_contact = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.primary_contact:
            CustomerContactPerson.objects.filter(customer=self.customer, primary_contact=True).update(primary_contact=False)
        super(CustomerContactPerson, self).save(*args, **kwargs)


class Supplier(BaseAbstractModel):
    name = models.CharField(max_length=1000)
    email = models.CharField(max_length=500)
    phone_number = models.CharField(max_length=20, blank=True)
    supplier_location = models.ForeignKey('shared.Address', on_delete=models.CASCADE, default=None, null=True) #Billing Location
    fax = models.CharField(max_length=20, default=None, null=True, blank=True)
    customer_brand = models.ManyToManyField(CustomerBrand, through='SupplierBrand', blank=True)

    FOREIGN = 'foreign'
    LOCAL = 'local'

    LOCATION_CHOICE = (
        (FOREIGN, 'Foreign'),
        (LOCAL, 'Local')
    )

    location = models.CharField(choices=LOCATION_CHOICE, max_length=100, default=None, null=True, blank=True)
    raw_material = models.BooleanField(default=False, null=True)
    service = models.BooleanField(default=False, null=True)
    materials = models.ManyToManyField('materials.UserDefinedMaterial', default=None, blank=True)

    RAW_MATERIAL_SUPPLIER_TYPE = 'raw_material'
    SERVICE_SUPPLIER_TYPE = 'service'
    FREIGHT_FORWARDER_SUPPLIER_TYPE = 'freight_forwarder'

    SUPPLIER_TYPES = (
        (RAW_MATERIAL_SUPPLIER_TYPE, 'Raw Material'),
        (SERVICE_SUPPLIER_TYPE, 'Service'),
        (FREIGHT_FORWARDER_SUPPLIER_TYPE, 'Freight Forwarder'),
    )

    supplier_type = models.CharField(max_length=200, choices=SUPPLIER_TYPES, null=True)

    TT_IN_ADVANCE_100_PRECENT_PAYMENT_METHOD_TYPE = '100% tt in advance'
    TT_ADVANCE_PAYMENT_METHOD_TYPE = 'tt-advance'
    CREDIT_DAYS_30_PAYMENT_METHOD_TYPE = '30 days credit'
    CREDIT_DAYS_140_PAYMENT_METHOD_TYPE = '140 days credit'
    LC_PAYMENT_METHOD_TYPE = 'lc'

    PAYMENT_METHOD_TYPES = (
        (TT_IN_ADVANCE_100_PRECENT_PAYMENT_METHOD_TYPE, '100% TT in Advance'),
        (TT_ADVANCE_PAYMENT_METHOD_TYPE, 'TT-Advance'),
        (CREDIT_DAYS_30_PAYMENT_METHOD_TYPE, '30 Days Credit'),
        (CREDIT_DAYS_140_PAYMENT_METHOD_TYPE, '140 Days Credit'),
        (LC_PAYMENT_METHOD_TYPE, 'LC')
    )

    payment_term = models.CharField(choices=PAYMENT_METHOD_TYPES, max_length=100, default=None, null=True)
    credit_days = models.IntegerField(null=True)
    shipping_mode = models.CharField(choices=SHIPPING_MODE_TYPES, max_length=100, default=None, null=True)
    costing_mode = models.CharField(choices=COSTING_MODE_TYPES, max_length=100, default=None, null=True)
    ex_fty_to_inhouse = models.IntegerField(default=0)
    fob_to_inhouse = models.IntegerField(default=0)
    remarks = models.CharField(max_length=1000, default=None, null=True)

    def get_supplier_contacts(self):
        contacts = self.suppliercontactperson_set.all()
        return contacts

    def get_supplier_primary_contact(self):
        contacts = self.get_supplier_contacts()
        primary_contact = None
        if contacts.exists():
            primary_contact = contacts[0]
        return primary_contact


class SupplierBrand(BaseAbstractModel):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    customer_brand = models.ForeignKey(CustomerBrand, on_delete=models.CASCADE)


class SupplierContactPerson(BaseAbstractModel):
    name = models.CharField(max_length=300, default=None, null=True)
    phone_number = models.CharField(max_length=20, default=None, null=True)
    email = models.CharField(max_length=100, default=None, null=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    primary_contact = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.primary_contact:
            SupplierContactPerson.objects.filter(supplier=self.supplier, primary_contact=True).update(primary_contact=False)
        super(SupplierContactPerson, self).save(*args, **kwargs)
        

class Season(BaseAbstractModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=5, null=False, unique=False)
    customer_brand = models.ForeignKey(CustomerBrand, on_delete=models.CASCADE, null=True)
    def __str__(self):
        return self.name


class Country(BaseAbstractModel):
    name = models.CharField(max_length=500)
    customer_brand = models.ForeignKey(CustomerBrand, on_delete=models.CASCADE, null=True)
    def __str__(self):
        return self.name


class SizeCategory(BaseAbstractModel):
    name = models.CharField(max_length=100)


class Size(BaseAbstractModel):
    category = models.ForeignKey(SizeCategory, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    sorting_order = models.IntegerField(default=0)
    abbreviation = models.CharField(max_length=100)


class ColorwayCategory(BaseAbstractModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=3, null=True)

    '''
    @:param item - item is marketing.Item object (not order item)
    :return - returns order_items matching the criteria
    '''
    def get_order_items_for_item_and_colorway(self, item_id, colorway):
        from marketing.models import OrderItem
        cw_item_types = self.colorwayitemtype_set.filter(item__item_id=item_id, colorway=colorway)
        order_items = OrderItem.objects.filter(pk__in=cw_item_types.values('item_id'))
        return order_items

    def __str__(self):
        return self.name
    
    
class FileAttachment(BaseAbstractModel):
    display_name = models.CharField(max_length=1200)
    file_path = models.SlugField(max_length=1200)
    type = models.CharField(max_length=10)

    DISPLAY_NAME_KEY = 'display_name'
    FILE_PATH_KEY = 'file_path'
    TYPE_KEY = 'type'
    ID_KEY = 'id'

    def get_object_data(self):
        return {
            self.FILE_PATH_KEY: self.file_path,
            self.ID_KEY: self.id,
            self.TYPE_KEY: self.type,
            self.DISPLAY_NAME_KEY: self.display_name
        }


class Email(BaseAbstractModel):

    to = models.TextField(null=True)
    cc = models.TextField(null=True)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    attachments = models.ManyToManyField(FileAttachment)
    EMAIL_SENT = 'email_sent'
    EMAIL_RECEIVED = 'email_received'
    EMAIL_RECEIVED_PROCESSED = 'email_received_processed'
    TYPE_CHOICE = (
        (EMAIL_SENT, 'Email Sent'),
        (EMAIL_RECEIVED, 'Email Received'),
        (EMAIL_RECEIVED_PROCESSED, 'Email Received and Processed')
    )
    type = models.CharField(choices=TYPE_CHOICE, max_length=100)
    email_hash_tag = models.CharField(max_length=100, null=True)
    email_id = models.CharField(max_length=200, null=True)


class MachineType(BaseAbstractModel):

    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=200)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('short_name',),
                name='unique_short_name'
            ),
            models.UniqueConstraint(
                fields=('name',),
                name='unique_machine_type_name'
            )
        ]


class FolderType(BaseAbstractModel):

    name = models.CharField(max_length=200)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('name',),
                name='unique_folder_type_name'
            )
        ]


class OtherCost(BaseAbstractModel):
    name = models.CharField(max_length=1000)


#This model will used for Machine Inventory
# class Machine(BaseAbstractModel):

#     machine_type = models.ForeignKey(MachineType, on_delete=models.CASCADE)
#     barand_name = models.CharField(max_length=200)
#     model_no = models.CharField(max_length=200)
#     serial_no = models.CharField(max_length=200)
#     qr_code = models.CharField(max_length=200)
#     own_plant = models.ForeignKey('plant', on_delete=models.CASCADE)
#     current_plant = models.ForeignKey('plant', on_delete=models.CASCADE)
#     RENT = 'rent'
#     OWN = 'own'
#     MACHINE_CATEGORY = ((RENT, 'Rent'),
#                         (OWN, 'Own'))
#     machine_category = models.CharField(max_length=200, choices=MACHINE_CATEGORY)
#     last_service_date = models.DateField(null=True)
#     next_service_date = models.DateField(null=True)


class LocationCountry(BaseAbstractModel):
    name = models.CharField(max_length=100)
    iso_code = models.CharField(max_length=50)



class Address(BaseAbstractModel):
    address_line_1 = models.CharField(max_length=500)
    address_line_2 = models.CharField(max_length=500)
    city = models.CharField(max_length=100)
    country = models.ForeignKey(LocationCountry, on_delete=models.CASCADE, default=None, null=True)

    def get_verbose_address(self):
        address = ''
        if self.address_line_1:
            address = str(self.address_line_1)
        if self.address_line_2:
            address += ' ' + self.address_line_2
        if self.city:
            address += ' ' + self.city
        if self.country:
            address += ' ' + self.country.name
        return address.strip()
    

class AddressAbstractModel(BaseAbstractModel):

    address_line_1 = models.CharField(max_length=500)
    address_line_2 = models.CharField(max_length=500)
    city = models.CharField(max_length=100)
    country = models.ForeignKey(LocationCountry, on_delete=models.CASCADE, default=None, null=True)

    def get_verbose_address(self):
        address = ''
        if self.address_line_1:
            address = str(self.address_line_1)
        if self.address_line_2:
            address += ' ' + self.address_line_2
        if self.city:
            address += ' ' + self.city
        if self.country:
            address += ' ' + self.country.name
        return address.strip()

    class Meta:
        abstract = True # DON'T CHANGE THIS to FALSE EVER


class Port(BaseAbstractModel):
    name = models.CharField(max_length=100)
    address = models.ForeignKey(Address, on_delete=models.CASCADE)
    port_type = models.CharField(max_length=100, choices=SHIPPING_MODE_TYPES)

    @property
    def port_display_value(self):
        return f'{self.name} ({self.get_port_type_display()})'


class Plant(BaseAbstractModel):
    name = models.CharField(max_length=100)
    port_type = models.ForeignKey(Port, on_delete=models.CASCADE)
    address = models.ForeignKey(Address, on_delete=models.CASCADE)
    email = models.CharField(max_length=500, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    contact_person = models.CharField(max_length=200, null=True)
    users = models.ManyToManyField(User, related_name="plants")
    #Billing Information

    billing_location_name = models.CharField(max_length=500, null=True)
    billing_address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, related_name='billing_address')
    billing_phone_number = models.CharField(max_length=20, null=True)
    billing_email = models.CharField(max_length=500, null=True)

    #VAT Reg No
    value_added_tax_registration_number = models.CharField(max_length=200, blank=True)
    #SVAT Reg No
    simplified_value_added_tax_registration_number = models.CharField(max_length=200, blank=True)
    #BOI Reg No
    board_of_investment_registration_number = models.CharField(max_length=200, blank=True)
    warehouse_code = models.CharField(max_length=500, null=True)

    #Billing Information End

    def get_plant_users(self):
        return self.users.all()

class SupplierLocation(BaseAbstractModel):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    # default_port = models.ForeignKey(Port, on_delete=models.CASCADE, related_name='default_port')
    # ports = models.ForeignKey(Port, on_delete=models.CASCADE, null=True)
    address = models.ForeignKey(Address, on_delete=models.CASCADE)

    @property
    def name(self):
        return f"{self.supplier.name}/ {self.address.get_verbose_address()}"


class SupplierLocationPort(BaseAbstractModel):
    supplier_location = models.ForeignKey(SupplierLocation, on_delete=models.CASCADE)
    port = models.ForeignKey(Port, on_delete=models.CASCADE)
    default_port = models.BooleanField(default=False)

    @property
    def display_name(self):
        return f'{self.supplier_location.supplier.name}, {self.port.name}'


class EmailEvent(BaseAbstractModel):
    email_type = models.CharField(max_length=300)
    PENDING_STATUS = 'pending'
    SENT_STATUS = 'sent'
    FAILED_STATUS = 'failed'

    EMAIL_TYPE_CHOICES = (
        (PENDING_STATUS, 'Email Pending'),
        (SENT_STATUS, 'Email Send'),
        (FAILED_STATUS, 'Email Failed')
    )

    email_status = models.CharField(EMAIL_TYPE_CHOICES, max_length=100)
    object_type = models.CharField(max_length=300)
    object_id = models.IntegerField(default=0)


class PlantWarehouse(BaseAbstractModel):
    warehouse_name = models.CharField(max_length=300)
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE)
    role = models.ForeignKey(User,on_delete=models.CASCADE, null=True, blank=True)
    
    @property
    def display_number(self):
        return f"WRH{self.id:05}"
    

class PlantWarehouseRack(BaseAbstractModel):
    warehouse = models.ForeignKey(PlantWarehouse, on_delete=models.CASCADE)
    rack_number = models.CharField(max_length=300)
    number_of_bins = models.IntegerField(default=0)
    location_x = models.IntegerField(default=0)
    location_y = models.IntegerField(default=0)

    @property
    def display_number(self):
        return f"RACK{self.id:05}"
    

class PlantWarehouseRackBin(BaseAbstractModel):
    warehouse_rack = models.ForeignKey(PlantWarehouseRack, on_delete=models.CASCADE)
    bin_number = models.CharField(max_length=300)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    length = models.FloatField(null=True)
    length_unit = models.CharField(max_length=300)
    width = models.FloatField(null=True)
    width_unit = models.CharField(max_length=300)
    height = models.FloatField(null=True)
    height_unit = models.CharField(max_length=300)

    @property
    def display_number(self):
        return f"BIN{self.id:05}"
    
    @property
    def bin_user_friendly_display_number(self):
        return f"{self.warehouse_rack.rack_number} / {self.bin_number}"


class InHouseMaterial(BaseAbstractModel):
    barcode = models.CharField(max_length=300, null=True)
    supplier_material = models.ForeignKey('materials.SupplierInquiryMaterialCode', on_delete=models.DO_NOTHING, null=True)
    customer_brand_material = models.ForeignKey('materials.CustomerBrandMaterial', on_delete=models.DO_NOTHING, null=True)
    quantity = models.FloatField(null=True) # This will have the initial quantity after GRN
    quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    available_quantity = models.FloatField(null=True) # TODO Check if 0 value (not to return)
    available_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    cutting_width = models.FloatField(null=True)
    cutting_width_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)
    grn_material_detail = models.ForeignKey('supplier_po.SupplierPOGRNMaterialDetail', null=True, on_delete=models.SET_NULL)
    manually_added = models.BooleanField(default=False)
    #warehouse_rack = models.ForeignKey(PlantWarehouseRack, on_delete=models.DO_NOTHING, null=True)
    warehouse_bin = models.ForeignKey(PlantWarehouseRackBin, on_delete=models.SET_NULL, null=True)
    grn_date = models.DateTimeField(null=True)
    purchase_order_club_bom_supplier = models.ForeignKey('supplier_po.SupplierDeliveryDateQuantity', on_delete=models.SET_NULL, null=True) # TODO Mahesh - why is this need
    po_club = models.ForeignKey('marketing.ActualPOClub', on_delete=models.SET_NULL, null=True)

    required_cpi = models.BooleanField(default=False)
    free_of_charge = models.BooleanField(default=False)

    EXCESS_STATUS = 'excess'
    LEFT_OVER_STATUS = 'left_over'
    SAVING_BULK = 'saving_bulk'
    SAVING_PRODUCTION = 'saving_production'
    SAVING_CUTTING = 'saving_cutting'
    RETURNABLES_STATUS = 'returnables'
    COLOR_TONE_REJECTION = 'color_tone_rejection'
    BATCH_REJECTION = 'batch_rejection'
    OTHER_REJECTION = 'other_rejection'
    ACCEPTED_STATUS = 'material_accepted' # This is anything that is good and usable

    STATE_CHOICE = (
        (EXCESS_STATUS,'Excess'),
        (LEFT_OVER_STATUS, 'Left Over'),
        (SAVING_BULK, 'Bulk Saving'),
        (SAVING_PRODUCTION,'Production Saving'),
        (SAVING_CUTTING,'Cutting Saving'),
        (RETURNABLES_STATUS, 'Returnable'),
        (COLOR_TONE_REJECTION, 'Rejected Due to Color Tone Mismatch'),
        (BATCH_REJECTION, 'Batch Rejected'),
        (OTHER_REJECTION, 'Rejected Material'),
        (ACCEPTED_STATUS, 'Material Accepted'),
    )

    state = models.CharField(max_length=200, null=True, choices=STATE_CHOICE)
    parent_material = models.ForeignKey('self', null=True, on_delete=models.SET_NULL)

    BARCODE_VALUE_KEY = 'barcode'
    QUANTITY_VALUE_KEY = 'quantity'
    QUANTITY_UNITS_VALUE_KEY = 'quantity_units'
    CUTTING_WIDTH_VALUE_KEY = 'cutting_width'
    CUTTING_WIDTH_UNITS_VALUE_KEY = 'cutting_width_units'
    MANUALLY_ADDED_VALUE_KEY = 'manually_added'

    @staticmethod
    def get_virtual_warehouse_category_states(state):
        states={
            'order_specific_raw_material': [InHouseMaterial.EXCESS_STATUS],
            'left_over': [InHouseMaterial.LEFT_OVER_STATUS],
            'rejection': [InHouseMaterial.BATCH_REJECTION, InHouseMaterial.COLOR_TONE_REJECTION, InHouseMaterial.OTHER_REJECTION],
            'returnables': [InHouseMaterial.RETURNABLES_STATUS]
        }
        return states.get(state, [])

    def get_allocated_materials(self):
        allocated_materials = self.purchaseorderallocatedmaterial_set.all()
        return allocated_materials

    @property
    def normalized_quantity_unit(self):
        return self.supplier_material.customer_brand_material.material_normalized_measuring_unit

    @property
    def normalized_quantity(self):
        mh = MaterialUnitHelper()
        normalized_unit = self.normalized_quantity_unit
        value = mh.convert_to_units(normalized_unit, self.quantity, self.quantity_units)
        return round(value, 4)

    @property
    def normalized_available_quantity(self):
        value = 0
        if self.available_quantity and self.available_quantity > 0:
            material_unit_helper = MaterialUnitHelper()
            normalized_unit = self.normalized_quantity_unit
            value = material_unit_helper.convert_to_units(normalized_unit, self.available_quantity, self.available_quantity_units)
        return round(value, 4)
    
    @property
    def normalized_issue_quantity(self):
        value = self.normalized_quantity - self.normalized_available_quantity
        return round(value, 4)

    def get_allocated_quantity(self):
        allocated_materials = self.get_allocated_materials().filter(in_house_material=self)
        normalized_unit = self.normalized_quantity_unit
        quantity = calculate_queryset_total_normalized_quantity(allocated_materials, normalized_unit, 'allocated_quantity', 'allocated_quantity_units')
        return get_quantity_dictionary(quantity, normalized_unit)

    def create_markers_for_width(self, width, po_club):
        from marketing.models import POFabricMarker
        main_markers = POFabricMarker.objects.filter(actual_club=po_club, po_material=self.supplier_material.customer_brand_material, derived_from_marker=None)
        for main_marker in main_markers:
            POFabricMarker.objects.get_or_create(
                marker_type=main_marker.marker_type,
                item=main_marker.item, actual_club=po_club,
                po_material=self.supplier_material.customer_brand_material,
                width=width,
                derived_from_marker=main_marker
            )

    def get_po_club_shade(self, supplier_po_shade, po_club, create_object=False):
        from marketing.models import POClubShade
        from supplier_po.models import SupplierPOClubMaterialShadeMapping, SupplierPOFabricShade

        po_club_shade = None
        shade_mapping = get_object_or_none(SupplierPOClubMaterialShadeMapping, {'supplier_po_shade': supplier_po_shade, 'po_club_shade__po_club': po_club})

        if not shade_mapping and create_object:
            po_club_shades = POClubShade.objects.filter(po_club=po_club, material=supplier_po_shade.material)
            club_shade_mappings = SupplierPOClubMaterialShadeMapping.objects.filter(po_club_shade__in=po_club_shades, supplier_po_shade__supplier_po=supplier_po_shade.supplier_po)

            if po_club_shades.count() == club_shade_mappings.count():
                shade_swatch_copy = supplier_po_shade.shade_swatch # TODO Medium - handle this. Save file to another location and copy it
                shade_swatch_copy.pk = None
                shade_swatch_copy.save()
                shade = POClubShade.objects.create(
                    po_club=po_club,
                    material=supplier_po_shade.material,
                    shade_name=supplier_po_shade.shade_name,
                    shade_swatch=shade_swatch_copy,
                    display_order=supplier_po_shade.display_order,
                )
                shade_mapping, created = SupplierPOClubMaterialShadeMapping.objects.get_or_create(po_club_shade=shade, supplier_po_shade=supplier_po_shade)

        if shade_mapping:
            po_club_shade = shade_mapping.po_club_shade
        return po_club_shade

    # DS Reviewed 08/01
    def allocate_in_house_material_to_purchase_order_bom(self, allocate_quantity, allocate_quantity_units, purchase_order_bom):
        from materials.models import Material
        from marketing.models import FabricWidth, PurchaseOrderAllocatedMaterial, PurchaseOrderBom, FabricGRNDetail, POFabricMarker, ActualPOClub
        self.refresh_from_db()
        normalized_unit = self.supplier_material.customer_brand_material.material_normalized_measuring_unit
        mh = MaterialUnitHelper()
        available_quantity_data = convert_quantity_to_unit(normalized_unit, self.available_quantity, self.available_quantity_units)
        available_quantity = available_quantity_data['quantity']
        fabric_width = None
        material_type = self.supplier_material.customer_brand_material.material_type
        allocation = None
        if available_quantity > 0:
            normalized_allocate_quantity = convert_quantity_to_unit(normalized_unit, allocate_quantity, allocate_quantity_units)['quantity']
            normalized_available_quantity = convert_quantity_to_unit(normalized_unit, self.available_quantity, self.available_quantity_units)['quantity']

            po_allocate_quantity = normalized_available_quantity
            if normalized_available_quantity > normalized_allocate_quantity:
                po_allocate_quantity = normalized_allocate_quantity

            if material_type == Material.FABRIC_MATERIAL and available_quantity > 0:

                grn_width = self.grn_material_detail.fabricgrndetail.actual_width
                inch_converter = mh.get_inch_conversion(grn_width.actual_width_units)
                width_in_inches = inch_converter * grn_width.actual_width
                fabric_width = FabricWidth.objects.get_or_create(
                    customer_brand_material=self.supplier_material.customer_brand_material,
                    width=width_in_inches, width_unit=MaterialUnitHelper.INCHES_UNIT,
                    actual_po_club=purchase_order_bom.purchase_order.actual_po_club
                )[0]

            allocation = PurchaseOrderAllocatedMaterial.objects.create(
                purchase_order_bom=purchase_order_bom,
                in_house_material=self,
                allocated_quantity_units=normalized_unit,
                allocated_quantity=po_allocate_quantity,
            )

            # Reduce allocated quantity from the available quantity
            updated_in_house_available_quantity = normalized_available_quantity - po_allocate_quantity
            self.available_quantity = updated_in_house_available_quantity
            self.available_quantity_units = normalized_unit
            self.save()

            from supplier_po.models import SupplierPO
            in_house_material_po_club = self.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.po_club

            # Set the shade if po_club of grn and po_bom are the same
            if in_house_material_po_club == purchase_order_bom.purchase_order.actual_po_club and self.grn_material_detail and self.grn_material_detail.shade:
                po_club_shade = self.get_po_club_shade(self.grn_material_detail.shade.supplier_po_shade, purchase_order_bom.purchase_order.actual_po_club, True)
                allocation.shade = po_club_shade
                allocation.save()

            # Set fabric width and create the necessary markers
            if fabric_width:
                if not allocation.width:
                    allocation.width = fabric_width
                    allocation.save()
                self.create_markers_for_width(fabric_width, purchase_order_bom.purchase_order.actual_po_club)
        return allocation

    # TODO Dasith - Review these
    def get_excess_quantity(self):
        excess_quantity = self.available_quantity if self.state == self.EXCESS_STATUS else 0
        material_unit_helper = MaterialUnitHelper()
        normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
        excess_quantity = material_unit_helper.convert_to_units(normalized_unit, excess_quantity, self.available_quantity_units)
        excess_quantity = get_quantity_dictionary(excess_quantity, normalized_unit)
        return excess_quantity

    # def get_excess_display_quantity(self):
    #     display_quantity = ''
    #     quantity = self.get_excess_quantity()
    #     if quantity > 0:
    #         material_unit_helper = MaterialUnitHelper()
    #         normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
    #         normalized_display_unit = dict(material_unit_helper.ALL_MEASURING_UNITS)[normalized_unit]
    #         if (quantity - int(quantity)) == 0:
    #             quantity = int(quantity)
    #         display_quantity = str(quantity) + ' ' + normalized_display_unit
    #     return display_quantity

    def get_bulk_saving_quantity(self):
        bulk_savings = self.inhousematerial_set.filter(state=self.SAVING_BULK)
        bulk_saving_quantity = 0

        for bulk_saving in bulk_savings:
            bulk_saving_quantity += bulk_saving.normalized_available_quantity
        material_unit_helper = MaterialUnitHelper()
        normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
        bulk_saving_quantity = get_quantity_dictionary(bulk_saving_quantity, normalized_unit)
        return bulk_saving_quantity

    # def get_bulk_saving_display_quantity(self):
    #     display_quantity = ''
    #     quantity = self.get_bulk_saving_quantity()
    #     if quantity > 0:
    #         material_unit_helper = MaterialUnitHelper()
    #         normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
    #         normalized_display_unit = dict(material_unit_helper.ALL_MEASURING_UNITS)[normalized_unit]
    #         if (quantity - int(quantity)) == 0:
    #             quantity = int(quantity)
    #         display_quantity = str(quantity) + ' ' + normalized_display_unit
    #     return display_quantity

    def get_cutting_saving_quantity(self):
        cutting_savings = self.inhousematerial_set.filter(state=self.SAVING_CUTTING)
        cutting_saving_quantity = 0
        for cutting_saving in cutting_savings:
            cutting_saving_quantity += cutting_saving.normalized_available_quantity
        material_unit_helper = MaterialUnitHelper()
        normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
        cutting_saving_quantity = get_quantity_dictionary(cutting_saving_quantity, normalized_unit)
        return cutting_saving_quantity

    # def get_cutting_saving_display_quantity(self):
    #     display_quantity = ''
    #     quantity = self.get_cutting_saving_quantity()
    #     if quantity > 0:
    #         material_unit_helper = MaterialUnitHelper()
    #         normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
    #         normalized_display_unit = dict(material_unit_helper.ALL_MEASURING_UNITS)[normalized_unit]
    #         if (quantity - int(quantity)) == 0:
    #             quantity = int(quantity)
    #         display_quantity = str(quantity) + ' ' + normalized_display_unit
    #     return display_quantity

    def get_production_saving_quantity(self):
        production_savings = self.inhousematerial_set.filter(state=self.SAVING_PRODUCTION)
        production_saving_quantity = 0
        for production_saving in production_savings:
            production_saving_quantity += production_saving.normalized_available_quantity
        material_unit_helper = MaterialUnitHelper()
        normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
        production_saving_quantity = get_quantity_dictionary(production_saving_quantity, normalized_unit)
        return production_saving_quantity

    # def get_production_saving_display_quantity(self):
    #     display_quantity = ''
    #     quantity = self.get_production_saving_quantity()
    #     if quantity > 0:
    #         material_unit_helper = MaterialUnitHelper()
    #         normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
    #         normalized_display_unit = dict(material_unit_helper.ALL_MEASURING_UNITS)[normalized_unit]
    #         if (quantity - int(quantity)) == 0:
    #             quantity = int(quantity)
    #         display_quantity = str(quantity) + ' ' + normalized_display_unit
    #     return display_quantity

    def get_sewing_quantity(self):
        sewing_quantity = 0
        for sewing in self.get_allocated_materials():
            sewing_quantity += sewing.normalized_allocated_quantity
        material_unit_helper = MaterialUnitHelper()
        normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
        sewing_quantity = get_quantity_dictionary(sewing_quantity, normalized_unit)
        return sewing_quantity

    # def get_sewing_display_quantity(self):
    #     display_quantity = ''
    #     quantity = self.get_sewing_quantity()
    #     if quantity > 0:
    #         material_unit_helper = MaterialUnitHelper()
    #         normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
    #         normalized_display_unit = dict(material_unit_helper.ALL_MEASURING_UNITS)[normalized_unit]
    #         if (quantity - int(quantity)) == 0:
    #             quantity = int(quantity)
    #         display_quantity = str(quantity) + ' ' + normalized_display_unit
    #     return display_quantity

    def get_total_quantity(self):
        excess_quantity = self.get_excess_quantity()
        bulk_saving_quantity = self.get_bulk_saving_quantity()
        cutting_saving_quantity = self.get_cutting_saving_quantity()
        production_saving_quantity = self.get_production_saving_quantity()
        sewing_quantity = self.get_sewing_quantity()
        material_unit_helper = MaterialUnitHelper()
        normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
        if not self.state in self.get_virtual_warehouse_category_states('order_specific_raw_material'):
            available_quantity = material_unit_helper.convert_to_units(normalized_unit, self.available_quantity, self.available_quantity_units)
        else:
            available_quantity = 0
        total_quantity = excess_quantity['quantity'] + bulk_saving_quantity['quantity'] + cutting_saving_quantity['quantity'] + production_saving_quantity['quantity'] + sewing_quantity['quantity'] + available_quantity
        
        total_quantity = get_quantity_dictionary(total_quantity, normalized_unit)
        return total_quantity

    # def get_total_display_quantity(self):
    #     display_quantity = ''
    #     quantity = self.get_total_quantity()
    #     if quantity > 0:
    #         material_unit_helper = MaterialUnitHelper()
    #         normalized_unit = material_unit_helper.get_normalized_unit(self.available_quantity_units)
    #         normalized_display_unit = dict(material_unit_helper.ALL_MEASURING_UNITS)[normalized_unit]
    #         if (quantity - int(quantity)) == 0:
    #             quantity = int(quantity)
    #         display_quantity = str(quantity) + ' ' + normalized_display_unit
    #     return display_quantity

    def get_aging(self):
        from shared.utils import get_attributes
        actual_delivery_date = get_attributes(self,'grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__supplieractualdeliverydate__delivery_date')
        aging = ''
        if actual_delivery_date:
            aging = 'Today'
            now = date.today()
            aging_data = relativedelta(now, actual_delivery_date)
            days = aging_data.days
            months = aging_data.months
            years = aging_data.years
            if months > 3 or years > 0:
                days = 0
            aging = str(years) + ' Years' if years > 0 else ''
            if years > 0 and months > 0:
                aging += ' And'
            aging += ' ' + str(months) + ' Months' if months > 0 else ''
            if months > 0 and days > 0:
                aging += ' And'
            aging += ' ' + str(days) + ' Days' if days > 0 else ''
            aging = aging.strip()
        return aging
    
    def get_delivery_date(self):
        from shared.utils import get_attributes
        date = get_attributes(self,'grn_material_detail__supplier_po_grn_material__supplier_po_grn__supplier_pack_list__supplier_po_delivery_note__supplier_po_delivery_invoice__supplieractualdeliverydate__delivery_date')
        # if not date:
        #     supplier_po_grn = get_attributes(self,'grn_material_detail__supplier_po_grn_material__supplier_po_grn')
        #     if not supplier_po_grn.supplier_pack_list:
        #         supplier_pack_list = 
        return date
    
    def get_sao(self):
        return self.grn_material_detail.supplier_po_grn_material.supplier_po_grn.supplier_po.general_po_supplier.general_po.costing.version_display_number

    def get_po(self):
        pos = ''
        allocated_materials = self.get_allocated_materials()
        for allocated_material in allocated_materials:
            if pos == '':
                pos = allocated_material.purchase_order_bom.purchase_order.display_number
            else:
                pos = pos + ',/n' + allocated_material.purchase_order_bom.purchase_order.display_number

        return pos


class IssueNote(BaseAbstractModel):
    issuer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    remarks = models.TextField(null=True)
    issue_date = models.DateTimeField(null=True)

    DRAFT_STATUS = 'draft'
    COMPLETE_STATUS = 'complete'

    STATE_CHOICE = (
        (DRAFT_STATUS, 'Draft'),
        (COMPLETE_STATUS, 'Complete'),
    )

    state = models.CharField(max_length=200, default=DRAFT_STATUS, choices=STATE_CHOICE)

    @property
    def display_number(self):
        return f"ISSUENOTE{self.id:06}"


class IssueNoteMaterial(BaseAbstractModel):
    issue_note = models.ForeignKey(IssueNote, on_delete=models.DO_NOTHING, null=False)
    in_house_material = models.ForeignKey(InHouseMaterial, on_delete=models.SET_NULL, null=True)
    issue_quantity = models.FloatField(null=True)
    issue_quantity_units = models.CharField(max_length=100, choices=MaterialUnitHelper.ALL_MEASURING_UNITS, null=True)


class BaseTask(BaseAbstractModel):
    entity = models.JSONField(default=list)
    assigned_users = models.ManyToManyField(User, related_name='assigned_users', blank=True)
    action_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    description = models.TextField(null=True)
    #assigned_group = models.ForeignKey(Group)
    
    def get_task_or_approval_entities(self, task_name=None):
        from shared.approvals.utils import ApprovalUtils
        approval_utils = ApprovalUtils(self)
        entity_display_values = approval_utils.get_task_or_approval_entities(task_name)
        return entity_display_values



class Approval(BaseTask):
    approval_name = models.CharField(max_length=500, choices=APPROVAL_NAME_CHOICES) # all the choices are in shared/approvals/constants/approval_choices.py
    
    PENDING_APPROVAL = 'pending'
    CANCELED_APPROVAL = 'canceled'
    REJECTED_APPROVAL = 'rejected'
    APPROVED_APPROVAL = 'approved'
    
    APPROVAL_STATE_CHOICES = (
        (PENDING_APPROVAL, 'Pending'),
        (CANCELED_APPROVAL, 'Canceled'),
        (REJECTED_APPROVAL, 'Rejected'),
        (APPROVED_APPROVAL, 'Approved'),
    )
    action = models.CharField(choices=APPROVAL_STATE_CHOICES, max_length=100)
    action_date = models.DateField(null=True)
    
    @property
    def display_number(self):
        return f"APPROVAL{self.id:06}"
    

class ActionTask(BaseTask):
    task_name = models.CharField(max_length=500, choices=TASK_CHOICES, null=True)

    OPEN_STATE = 'open'
    CLOSED_COMPLETE_STATE = 'closed_complete'
    CANCELED_STATE = 'canceled'
    IN_PROGRESS_STATE = 'in_progress'
    
    ACTION_TASK_STATE_CHOICES = (
        (OPEN_STATE, 'Open'),
        (CLOSED_COMPLETE_STATE, 'Closed'),
        (CANCELED_STATE, 'Canceled'),
        (IN_PROGRESS_STATE, 'In Progress'),
    )
    task_state = models.CharField(choices=ACTION_TASK_STATE_CHOICES, max_length=100)

    @property
    def display_number(self):
        return f"TASK{self.id:06}"


class TaskComment(BaseAbstractModel):
    task = models.ForeignKey(BaseTask, on_delete=models.CASCADE)
    comment = models.TextField()
    comment_user = models.ForeignKey(User, on_delete=models.CASCADE)


class Report(BaseAbstractModel):
    report_name = models.CharField(max_length=1000)
    report_description = models.TextField()
    report_data = models.JSONField()