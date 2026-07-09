from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from marketing.models import  ItemAttribute, OrderPackItemPlacement, OrderColorway, OrderCountry, OrderSize, OrderPackItem, \
    OrderPlacement, OrderPack, OtherCostType, OrderPackOtherCost, OrderPackPlacement
from shared.models import OtherCost


@receiver(post_save, sender=OrderPackItem, dispatch_uid='create_order_pack_item')
def create_order_pack_item(sender, instance, created, **kwargs):
    if created and instance.pack.version.copied_from is None:
        item = instance.item.item
        item_attributes = ItemAttribute.objects.filter(item=item, active=True, is_mandatory=True, assign_type=ItemAttribute.ORDER_PACK_ITEM) #TODO discuss with Dasith Sir
        for item_attribute in item_attributes:
            order_placement = OrderPlacement.objects.get_or_create(item=item, item_attribute=item_attribute, version=instance.pack.version)[0]

            order_placement.name = item_attribute.placement
            order_placement.type = item_attribute.type
            order_placement.assign_type = item_attribute.assign_type
            order_placement.material = item_attribute.material
            order_placement.estimated_consumption_ratio = item_attribute.estimated_consumption_ratio
            order_placement.estimated_consumption_ratio_units = item_attribute.estimated_consumption_ratio_units
            order_placement.save()
            order_pack_item_placement = OrderPackItemPlacement.objects.get_or_create(order_pack_item=instance, item_attribute_other=order_placement, placement_name=item_attribute.placement)[0]
            order_pack_item_placement.estimated_consumption_ratio = item_attribute.estimated_consumption_ratio
            order_pack_item_placement.estimated_consumption_ratio_units = item_attribute.estimated_consumption_ratio_units
            order_pack_item_placement.save()

        item_attributes = ItemAttribute.objects.filter(item=item, active=True, is_mandatory=True, assign_type=ItemAttribute.ORDER_PACK) #TODO discuss with Dasith Sir
        for item_attribute in item_attributes:
            order_placement = OrderPlacement.objects.get_or_create(item=item, item_attribute=item_attribute, version=instance.pack.version)[0]

            order_placement.name = item_attribute.placement
            order_placement.type = item_attribute.type
            order_placement.assign_type = item_attribute.assign_type
            order_placement.material = item_attribute.material
            order_placement.estimated_consumption_ratio = item_attribute.estimated_consumption_ratio
            order_placement.estimated_consumption_ratio_units = item_attribute.estimated_consumption_ratio_units
            order_placement.save()
            order_pack_placement = OrderPackPlacement.objects.get_or_create(order_pack=instance.pack, item_attribute_other=order_placement, placement_name=item_attribute.placement)[0]
            order_pack_placement.estimated_consumption_ratio = item_attribute.estimated_consumption_ratio
            order_pack_placement.estimated_consumption_ratio_units = item_attribute.estimated_consumption_ratio_units
            order_pack_placement.save()



@receiver(post_save, sender=OrderPack, dispatch_uid='create_order_pack_signal')
def create_order_pack_signal(sender, instance, created, **kwargs):
    if created and instance.version.copied_from is None:
        other_costs = OtherCost.objects.filter(active=True)

        for other_cost in other_costs:
            cost_type = OtherCostType.objects.get_or_create(version=instance.version, name=other_cost.name, other_cost=other_cost)[0]
            OrderPackOtherCost.objects.get_or_create(pack=instance, other_cost_type=cost_type, other_cost_type_name=other_cost.name)