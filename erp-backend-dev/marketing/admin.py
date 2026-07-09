from django.contrib import admin
from .models import Item, ItemAttribute, OrderInquiry, OrderItem
# Register your models here.
# all models are registerd here.
admin.site.register(Item)
admin.site.register(ItemAttribute)
admin.site.register(OrderInquiry)
admin.site.register(OrderItem)