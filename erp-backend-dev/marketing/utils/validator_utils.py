from django.db.models import Q
from marketing.models import OrderPack, ColorwayItemType, OrderSizeGroup, OrderPackItem


# TODO - what is this validator?
class TableValidator:
    def __init__(self, table_instance, fields):
        self.fields = fields
        self.table_instance = table_instance

    def validate(self):
        errors = []
        
        for field_name in self.fields:
            validation_text = self.validate_field(field_name)
            if validation_text:
                errors.append({
                    'field_name': field_name,
                    'validation_text': validation_text
                })
        return errors

    def validate_field(self, field_name):
        field_value = getattr(self.table_instance, field_name)
        if field_value is None or field_value == "":
            return f"{field_name} is required."
        return None


class OrderInquiryValidator:

    def __init__(self, order):
        self.order = order

    def validate_general_info(self):
        errors = {
            'general_info': self.general_information_validator(),
            'countries': self.order_country_validator(),
            'sizes': self.size_category_validator(),
            'items': self.item_validator(),
            'colorways': self.order_colorway_validator(),
            'colorway_matrix': self.colorway_matrix_validator(),
            # 'order_packs': self.pack_quantity_validator(),
        }
        valid = True
        for key, val in errors.items():
            if bool(val):
                valid = False
        return valid, errors

    def general_information_validator(self):
        order_inquiry = self.order
        errors = {}
        if not order_inquiry.style_number:
            errors['style_number'] = 'Style number missing'
        if not order_inquiry.brand:
            errors['brand'] = 'Brand missing'
        if not order_inquiry.season:
            errors['season'] = 'Season missing'
        if not order_inquiry.year:
            errors['year'] = 'Year missing'
        if not order_inquiry.customer:
            errors['customer'] = 'Customer missing'
        return errors

    def order_country_validator(self):
        order_inquiry = self.order
        errors = {}
        if not order_inquiry.ordercountry_set.exists():
            errors['order_country'] = 'At least one country must be associated with the order.'
        return errors

    def size_category_validator(self):
        order_inquiry = self.order
        order_sizes = order_inquiry.ordersize_set.all()
        order_size_groups = order_inquiry.ordersizegroup_set.all()
        errors = {}
        if not order_inquiry.size_category:
            errors['size_category'] = 'Size category missing'
        if not order_inquiry.costing_method:
            errors['costing_method'] = 'Costing method missing'
        if not order_inquiry.ordersize_set.exists():
            errors['size'] = 'At least one size must be associated with the order.'
        if not order_inquiry.ordersizegroup_set.exists():
            errors['size_group'] = 'At least one size group must be associated with the order.'
        # TODO validate if ordersize groups cover all the sizes selected
        # sizes = order_size_group.sizes.all()
        # for order_size_group in order_size_groups:
        #     if not order_sizes.filter(pk__in=sizes).exists():
        #         errors['size_group'] = 'Not all the selected sizes include in order size group.'
        # other_groups = order_size_groups.exclude(id=order_size_group.id).filter(sizes__in=sizes)
        # if other_groups.exists():
        #     errors['size_group'] = 'A size cannot be in multiple groups.'

        return errors

    def item_validator(self):
        order_inquiry = self.order
        errors = {}
        # TODO - validate if order inquiry is multiple, if multiple must at least have 2 items
        if order_inquiry.pack_type == 'multi':
            if not order_inquiry.orderitem_set.count() > 1:
                errors['pack_type'] = 'Multi Pack needs more than one item'
        if order_inquiry.quantity_per_pack != order_inquiry.orderitem_set.count():
            errors['quantity_per_pack'] = 'The number entered for Quantity Per Pack did not match with the entered number of Items'
        if not order_inquiry.pack_type:
            errors['pack_type'] = 'Pack Type is missing'
        if not order_inquiry.quantity_per_pack:
            errors['quantity_per_pack'] = 'Quantity Per Pack is missing'
        if not order_inquiry.orderitem_set.exists():
            errors['order_item'] = 'At least one item must be associated with the order.'
        return errors

    def order_colorway_validator(self):
        order_inquiry = self.order
        errors = {}
        if not order_inquiry.number_of_colorways:
            errors['number_of_colorways'] = 'Number of Colorways missing'
        if not order_inquiry.ordercolorway_set.exists():
            errors['order_colorway'] = 'At least one colorway must be associated with the colorway category.'
        # TODO - if number of colorways doesnt match order_inquiry.ordercolorway_set count add error
        if order_inquiry.number_of_colorways != order_inquiry.ordercolorway_set.count():
            errors['number_of_colorways'] = 'Number of Colorways needs to match with the Colorways entered'
        return errors


    # TODO - add validation to validate if every item colorway combo has a ColorwayCategoryType associated with it
    def colorway_matrix_validator(self):
        order_inquiry = self.order
        errors = {}
        order_items = order_inquiry.get_order_items()
        order_colorways = order_inquiry.get_order_colorways()
        for order_item in order_items:
            for order_colorway in order_colorways:
                colorway_item_types = ColorwayItemType.objects.filter(colorway = order_colorway, item = order_item).exists()
                if not colorway_item_types:
                    errors[order_item.item.names] = 'Colorway item type missing for OrderItem'
        return errors

    def pack_quantity_validator(order_inquiry):
        errors = {}
        order_packs = OrderPack.objects.filter(
            Q(size__order=order_inquiry) &
            Q(colorway__order=order_inquiry) &
            Q(country__order=order_inquiry)
        )
        for order_pack in order_packs:
            if order_pack.cad_quantity is None:
                errors['Order Pack '+str(order_pack.id)] = 'CAD quantity missing'
        return errors
    
    def validate_orderpacks_and_orderpackitems_reviewd(version):
        order_packs_not_reviewed = OrderPack.objects.filter(version=version, reviewed=False)
        errors = {}
        for order_pack_not_reviewed in order_packs_not_reviewed:
            if order_pack_not_reviewed.reviewed == False:
                errors['Order Pack '+str(order_pack_not_reviewed.id)] = 'Not reviewed'
        
        order_pack_items_not_reviewed = OrderPackItem.objects.filter(pack__version=version, reviewed=False)
        for order_pack_item_not_reviewed in order_pack_items_not_reviewed:
            if order_pack_item_not_reviewed.reviewed == False:
                errors['Order Pack Item '+str(order_pack_item_not_reviewed.id)] = 'Not reviewed'
        return errors
