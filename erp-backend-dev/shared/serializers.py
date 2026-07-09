from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from shared.models import Customer, Brand, Supplier, Season, User, SizeCategory, Size, Role, Group, Country, ColorwayCategory, \
      FileAttachment, MachineType, FolderType, LocationCountry, Port, Address, SupplierLocationPort, SupplierLocation, Plant, CustomerContactPerson, \
      SupplierContactPerson, CustomerBrand, SupplierBrand, CustomerBrandDepartment, CustomerMerchant
from django.db import models
from marketing.models import *
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password


class CustomerContactPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerContactPerson
        fields = '__all__'


class CustomerBrandSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    customer_brand_name = serializers.SerializerMethodField(read_only=True)

    def get_customer_brand_name(self, instance):
        customer_brand_name = instance.customer.name + ' (' +instance.brand.name + ')'
        return customer_brand_name
    
    class Meta:
        model = CustomerBrand
        fields = '__all__'

class CustomerBrandDepartmentSerializer(serializers.ModelSerializer):
    customer_brand_name = serializers.CharField(source='customer_brand.brand.name', read_only=True)
    customer_name = serializers.CharField(source='customer_brand.customer.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = CustomerBrandDepartment
        fields = '__all__'


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'code']

    def validate(self, attrs):
        errors = {}
        code = attrs.get('code', None)
        if self.instance:
            code_is_exist = Brand.objects.exclude(id=self.instance.id).filter(code=code).exists()
        else:
            code_is_exist = Brand.objects.filter(code=code).exists()
        if code_is_exist:
            errors["code"] = "Code cannot be duplicate."
        if errors:
            raise serializers.ValidationError(errors)
        attrs = super().validate(attrs)
        return attrs


class CustomerSerializer(serializers.ModelSerializer):
    contact_persons = CustomerContactPersonSerializer(source='customercontactperson_set', many=True, read_only=True)
    brands = BrandSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone_number', 'email', 'contact_persons', 'code', 'brands', 'po_processor_name']

    def validate(self, attrs):
        errors = {}
        code = attrs.get('code', None)
        name = attrs.get('name', None)
        if self.instance:
            code_is_exist = Customer.objects.exclude(id=self.instance.id).filter(code=code).exists()
        else:
            code_is_exist = Customer.objects.filter(code=code).exists()
        if code_is_exist:
            errors["code"] = "Code cannot be duplicate."
        if errors:
            raise serializers.ValidationError(errors)
        attrs = super().validate(attrs)
        return attrs        

class SupplierBrandPayloadSerializer(serializers.Serializer):
    supplier_id = serializers.IntegerField()
    customer_brands = serializers.ListField(child=serializers.IntegerField())


class SupplierMaterialsPayloadSerializer(serializers.Serializer):
    supplier_id = serializers.IntegerField()
    supplier_materials= serializers.ListField(child=serializers.IntegerField())


class SupplierContactPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierContactPerson
        fields = '__all__'


class SupplierBrandSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer_brand.customer.name', read_only=True)
    brand_name = serializers.CharField(source='customer_brand.brand.name', read_only=True)

    class Meta:
        model = SupplierBrand
        fields = '__all__'


class SupplierMaterialSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserDefinedMaterial
        fields = '__all__'


class PortSerializer(serializers.ModelSerializer):

    address_line_1 = serializers.CharField(source='address.address_line_1', read_only=True)
    address_line_2 = serializers.CharField(source='address.address_line_2', read_only=True)
    city = serializers.CharField(source='address.city', read_only=True)
    country_name = serializers.CharField(source='address.country.name', read_only=True)
    country = serializers.IntegerField(source='address.country.id', read_only=True)
    port_type_display = serializers.CharField(source='get_port_type_display', read_only=True)
    port_display_value = serializers.CharField(read_only=True)

    class Meta:
        model = Port
        fields = '__all__'


class SupplierSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True)
    email = serializers.CharField(required=True)
    shipping_mode = serializers.CharField(required=True)
    costing_mode = serializers.CharField(required=True)
    customers = SupplierBrandSerializer(source='supplierbrand_set', many=True, read_only=True)
    material_names = serializers.SerializerMethodField(read_only=True)
    contact_persons = SupplierContactPersonSerializer(source='suppliercontactperson_set', many=True, read_only=True)
    locations = serializers.SerializerMethodField(read_only=True)
    materials = SupplierMaterialSerializer(read_only=True, many=True)
    location_display = serializers.CharField(source='get_location_display', read_only=True)
    payment_term_display = serializers.CharField(source='get_payment_term_display', read_only=True)
    shipping_mode_display = serializers.CharField(source='get_shipping_mode_display', read_only=True)
    costing_mode_display = serializers.CharField(source='get_costing_mode_display', read_only=True)
    freight_forwarder_id = serializers.IntegerField(source='freightforwarder.id', read_only=True)

    def get_material_names(self, instance):
        # return UserDefinedMaterial.objects.filter().values_list('name', flat=True)
        return instance.materials.all().values_list('name', flat=True)
    
    def get_locations(self, instance):
        locations = instance.supplierlocation_set.all()
        return SupplierLocationSerializer(locations, many=True).data
    
    class Meta:
        model = Supplier
        fields = ("__all__")


class SeasonSerializer(serializers.ModelSerializer):
    customer_brand_name = serializers.CharField(source='customer_brand.brand.name', read_only=True)
    class Meta:
        model=Season
        fields = ("__all__")

    def validate(self, attrs):
        errors = {}
        code = attrs.get('code', None)
        if self.instance:
            code_is_exist = Season.objects.exclude(id=self.instance.id).filter(code=code).exists()
        else:
            code_is_exist = Season.objects.filter(code=code).exists()
        if code_is_exist:
            errors["code"] = "Code cannot be duplicate."

        if errors:
            raise serializers.ValidationError(errors)
        attrs = super().validate(attrs)
        return attrs
    
class PackageTypeSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    class Meta:
        fields = ['id', 'name']


class RoleSerializer(serializers.ModelSerializer):

    class Meta:
        model = Role
        fields =["id", "name"]


class RoleListSerializer(serializers.ModelSerializer):
    users = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields ='__all__'

    def get_users(self, role):
        users = User.objects.filter(role=role)
        return [{"id": user.id, "name": user.username, "first_name": user.first_name, "last_name": user.last_name, "email": user.email} for user in users]
    
    def get_groups(self, role):
        groups = Group.objects.filter(role=role)
        return [{"id": group.id, "name": group.name} for group in groups]


class UserAddRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['role_set', 'groups']

    def update(self, instance, validated_data):
        data = {}
        if 'role_set' in validated_data:
            role_set=[]
            for role in instance.role_set.all():
                role_set.append(role.id)
            for role in validated_data['role_set']:
                role_set.append(role.id)
            data['role_set'] = role_set
        if 'groups' in validated_data:
            groups = []
            for group in instance.groups.all():
                groups.append(group.id)
            for group in validated_data['groups']:
                groups.append(group.id)
            data['groups'] = groups
        return super().update(instance, data)


class UserGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class GroupSerializer(serializers.ModelSerializer):
    role_set=RoleSerializer(read_only=True, many=True)
    user_set = UserGroupSerializer(read_only=True, many=True)
    class Meta:
        model = Group
        fields = '__all__'


class GroupAddPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Group
        fields = ["permissions"]

    def update(self, instance, validated_data):

        data=[]
        for permission in instance.permissions.all():
            data.append(permission.id)
        
        for permission in validated_data['permissions']:
            data.append(permission.id)

        return super().update(instance, {"permissions": data})
    

class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(source = 'pk', required=False)
    is_active = serializers.BooleanField(required=False)
    username = serializers.CharField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password], style={'input_type': 'password', 'placeholder': 'Password'}, allow_blank=True)
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password', 'placeholder': 'Password'}, allow_blank=True)
    role_set = RoleSerializer(many=True, required=False)
    groups = GroupSerializer(many=True, required=False)
    user_name_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'is_active', 'username', 'password', 'password2', 'email', 'first_name', 'last_name', 'role_set', 'groups')
    
    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        elif attrs['password'] == '':
            raise serializers.ValidationError({"password": "Password field required."})
        elif attrs['password2'] == '':
            raise serializers.ValidationError({"password2": "Confirm Password Password field required."})

        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
    
    def get_user_name_display(self, instance):
        return '%s %s' % (instance.first_name, instance.last_name)


class UserDetailSerializer(serializers.ModelSerializer):
    old_password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password', 'placeholder': 'Password'})
    new_password2 = serializers.CharField(write_only=True, required=False, style={'input_type': 'password', 'placeholder': 'Password'})
    reset_password = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'old_password', 'password', 'new_password2', 'reset_password', 'password']

    def validate(self, attrs):
        reset_password = attrs.get('reset_password', False)
        old_password = attrs.get('old_password')
        new_password = attrs.get('password')
        new_password2 = attrs.get('new_password2')

        if reset_password:
            if not old_password or not new_password or not new_password2:
                raise serializers.ValidationError({"old_password":"To reset the password, all password fields are required."})
            user = self.instance
            if not user.check_password(old_password):
                raise serializers.ValidationError({"old_password":"Old password is incorrect."})
            if new_password != new_password2:
                raise serializers.ValidationError({"password":"New password fields didn't match."})
            if new_password == old_password:
                raise serializers.ValidationError({"password":"New password can't be the same as the old password."})
            try:
                validate_password(new_password, user)
            except ValidationError as e:
                raise serializers.ValidationError(str(e))
        attrs = super().validate(attrs)
        return attrs

    def update(self, instance, validated_data):
        reset_password = validated_data.pop('reset_password', False)
        new_password = validated_data.pop('password', None)

        if reset_password:
            instance.set_password(new_password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class PlantIdNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plant
        fields = ["id", "name"]

class UserUpdateSerializer(serializers.ModelSerializer):
    new_password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password', 'placeholder': 'Password'})
    new_password2 = serializers.CharField(write_only=True, required=False, style={'input_type': 'password', 'placeholder': 'Password'})
    reset_password = serializers.BooleanField(required=False)
    role_set = RoleSerializer(read_only=True, many=True, required=False)
    groups = GroupSerializer(read_only=True, many=True, required=False)
    plants = PlantIdNameSerializer(read_only=True,many=True ,required=False)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'new_password', 'new_password2', 'reset_password', 'role_set', 'groups', 'plants']

    def validate(self, attrs):
        reset_password = attrs.get('reset_password', False)
        new_password = attrs.get('new_password')
        new_password2 = attrs.get('new_password2')

        if reset_password:
            if not new_password or not new_password2:
                raise serializers.ValidationError({"new_password":"To reset the password, all password fields are required."})
            user = self.instance
            if new_password != new_password2:
                raise serializers.ValidationError({"new_password":"New password fields didn't match."})
            try:
                validate_password(new_password, user)
            except ValidationError as e:
                raise serializers.ValidationError(str(e))
        return attrs

    def update(self, instance, validated_data):
        reset_password = validated_data.pop('reset_password', False)
        new_password = validated_data.pop('new_password', None)

        if reset_password:
            instance.set_password(new_password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
    

class UsersListSerializer(serializers.ModelSerializer):
   
    user_full_name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'user_full_name', 'email']
    
    def get_user_full_name(self, user_obj):
        return user_obj.get_full_name()


class CountrySerializer(serializers.ModelSerializer):
    customer_brand_name = serializers.CharField(source='customer_brand.brand.name', read_only=True)
    class Meta:
        model=Country
        fields = ("__all__")
    

class SizeSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(source='category.name', read_only=True)
    class Meta:
        model = Size
        fields = '__all__'
    
    def validate(self, attrs):
        sorting_order = attrs['sorting_order']
        name = attrs['name']
        category = attrs['category']
        errors={}
        if Size.objects.filter(category=category, sorting_order=sorting_order).count() > 0:
            if self.instance:
                if self.instance.sorting_order != sorting_order:
                    errors['sorting_order']="Sorting Order is Duplicated"
            else:
                errors['sorting_order']="Sorting Order is Duplicated"
        if Size.objects.filter(category=category, name=name).count()>0:
            if self.instance:
                if self.instance.name != name:
                    errors['name'] = "Size Name Cannot be Duplicated"
            else:
                errors['name'] = "Size Name Cannot be Duplicated"
        if not errors == {}:
            raise serializers.ValidationError(errors)
        return super().validate(attrs)


class SizeCategorySerializer(serializers.ModelSerializer):


    class Meta:
        model = SizeCategory
        fields = '__all__'


class SizeCategoryListSerializer(serializers.ModelSerializer):
    category_options = SizeSerializer(many=True, read_only=True, source = 'size_set')


    class Meta:
        model = SizeCategory
        fields = ['id', 'name', 'category_options']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['category_options'] = sorted(data['category_options'], key=lambda x: x['sorting_order'])
        return data

class ColorwayCategorySerializer(serializers.ModelSerializer):
      
     class Meta:
        model=ColorwayCategory
        fields = ("__all__")


class FileAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model=FileAttachment
        fields = ("__all__")


class MachineTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = MachineType
        fields = '__all__'


class FolderTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = FolderType
        fields = '__all__'


class LocationCountrySerializer(serializers.ModelSerializer):

    class Meta:
        model = LocationCountry
        fields = '__all__'



class AddressSerializer(serializers.ModelSerializer):
    display_address = serializers.CharField(source='get_verbose_address', read_only=True)
    country_name = serializers.CharField(source='country.name', read_only=True)
    class Meta:
        model = Address
        fields ='__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['country'].required = True
        self.fields['country'].allow_null = False


class SupplierLocationPortSerializer(serializers.ModelSerializer):

    port_name = serializers.CharField(source='port.name', read_only=True)
    supplier_location_port_name = serializers.CharField(source='display_name', read_only=True)

    class Meta:
        model = SupplierLocationPort
        fields = '__all__'


class SupplierLocationSerializer(serializers.ModelSerializer):

    address_line_1 = serializers.CharField(source='address.address_line_1', read_only=True)
    address_line_2 = serializers.CharField(source='address.address_line_2', read_only=True)
    city = serializers.CharField(source='address.city', read_only=True)
    country_name = serializers.CharField(source='address.country.name', read_only=True)
    country = serializers.IntegerField(source='address.country.id', read_only=True)

    class Meta:
        model = SupplierLocation
        fields = '__all__'


class PlantSerializer(serializers.ModelSerializer):
    address_line_1 = serializers.CharField(source='address.address_line_1', read_only=True)
    address_line_2 = serializers.CharField(source='address.address_line_2', read_only=True)
    city = serializers.CharField(source='address.city', read_only=True)
    country = serializers.CharField(source='address.country.id', read_only=True)
    billing_address_line_1 = serializers.CharField(source='billing_address.address_line_1', read_only=True)
    billing_address_line_2 = serializers.CharField(source='billing_address.address_line_2', read_only=True)
    billing_address_city = serializers.CharField(source='billing_address.city', read_only=True)
    billing_address_country = serializers.CharField(source='billing_address.country.id', read_only=True)

    class Meta:
        model = Plant
        fields = '__all__'


class InHouseMaterialSerializer(serializers.ModelSerializer):

    class Meta:
        model = InHouseMaterial
        fields = ('__all__')


class OtherCostSerializer(serializers.ModelSerializer):

    class Meta:
        model = OtherCost
        fields = ('__all__')


class CustomerUserAssignSerializer(serializers.ModelSerializer):

    users = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    is_admin = serializers.BooleanField(write_only=True, default=False)
    class Meta:
        model = Customer
        fields = ('users', 'is_admin')

    def update(self, instance, validated_data):
        user_id = validated_data.get('users')
        is_admin = validated_data.get('is_admin')
        CustomerMerchant.objects.create(customer=instance, user=user_id, is_admin=is_admin)
        return instance

    
class CustomerUserListSerializer(serializers.ModelSerializer):

    username = serializers.CharField(read_only=True, allow_null=True)
    first_name = serializers.CharField(read_only=True, allow_null=True)
    last_name = serializers.CharField(read_only=True, allow_null=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True, allow_null=True)
    short_name = serializers.CharField(source='get_short_name', read_only=True, allow_null=True)
    plants = serializers.SerializerMethodField(read_only=True, allow_null=True)
    email = serializers.EmailField(read_only=True, allow_null=True)
    date_joined = serializers.DateTimeField(read_only=True, allow_null=True)
    status = serializers.SerializerMethodField(read_only=True, allow_null=True)
    is_admin = serializers.SerializerMethodField(read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'full_name', 'short_name', 'plants', 'email', 'date_joined', 'status', 'is_admin')

    def get_plants(self, instance):
        plants = instance.plants.all()
        user_plants = []
        if plants.exists():
            for plant in plants:
                plant_detail = {'id': plant.id,
                                'plant_name': plant.name}
                user_plants.append(plant_detail)
        return user_plants

    def get_status(self, instance):
        status = 'active'
        if not instance.is_active:
            status = 'inactive'
        return status

    def get_is_admin(self, instance):
        user_id = instance.id
        customer_id = self.context.get('customer_id')
        customer_merchant = get_object_or_none(CustomerMerchant, {'customer_id': customer_id, 'user_id': user_id})  #A merchant can be assigned once to the customer
        if customer_merchant:
            admin_status = customer_merchant.is_admin
        else:
            admin_status = None
        return admin_status
    

class CustomerUserMerchantListSerializer(CustomerUserListSerializer):

    class Meta:
        model = User
        fields = ('id', 'username')


class UserPlantAssignSerializer(serializers.Serializer):
    plant_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True
    )

    def update(self, instance, validated_data):
        plant_ids = validated_data.get("plant_ids", [])
        plants = Plant.objects.filter(id__in=plant_ids)
               
        instance.plants.set(plants)  

        return instance

    def to_representation(self, instance):
        return {
            "id": instance.id,
            "username": instance.username,
            "plants": [{"id": p.id, "name": p.name} for p in instance.plants.all()],
        }