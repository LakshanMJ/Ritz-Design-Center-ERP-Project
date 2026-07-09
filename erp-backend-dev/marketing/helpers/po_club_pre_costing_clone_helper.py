from django.db import transaction

from marketing.models import OrderInquiry, OrderCountry, OrderSize, OrderSizeGroup, OrderItem, OrderColorway, \
    ColorwayItemType, OrderPack, OrderPackItem, OrderPackSizeGroup, POPack, POItem, ActualPOClubColorway, \
    ActualPOClubCountry, ActualPOClubSize, PurchaseOrderOtherCostType, POPackOtherCost
from datetime import date
from shared.utils import get_object_or_none
from django.shortcuts import get_object_or_404
from marketing.helpers.order_inquiry_clone_helper import OrderInquiryCloneHelper

class POClubCloneHelper(OrderInquiryCloneHelper):

    def __init__(self, po_club, costing_type='marketing_costing'):
        source_costing_version = po_club.get_marketing_costing()
        self.po_club = po_club
        self.source_order_inquiry = source_costing_version.order
        self.source_version = source_costing_version
        self.costing_type = costing_type
        self.purhcase_orders = self.po_club.get_purchase_orders()
        # self.destination_order_inquiry = destination_order_inquiry
        # self.version = destination_version

    def copy_colorway(self, pre_costing_order_inquiry, actual_po_club_colorway):
        order_colorway, created = OrderColorway.objects.get_or_create(order=pre_costing_order_inquiry, colorway=actual_po_club_colorway.colorway_name)
        order_colorway.copied_from = actual_po_club_colorway.marketing_order_colorway
        order_colorway.save()
        actual_po_club_colorway.pre_costing_order_colorway = order_colorway
        actual_po_club_colorway.save()
        po_colorways = actual_po_club_colorway.pocolorway_set.all()
        for po_colorway in po_colorways:
            po_colorway.order_colorway = order_colorway
            po_colorway.save()

    def copy_country(self, pre_costing_order_inquiry, actual_po_club_country):
        order_country, created = OrderCountry.objects.get_or_create(order=pre_costing_order_inquiry, country=actual_po_club_country.marketing_order_country.country)
        order_country.copied_from = actual_po_club_country.marketing_order_country
        order_country.save()
        actual_po_club_country.pre_costing_order_country = order_country
        actual_po_club_country.save()
        po_countries = actual_po_club_country.pocountry_set.all()
        for po_country in po_countries:
            po_country.order_country = order_country
            po_country.save()

    def copy_size(self, pre_costing_order_inquiry, actual_po_club_size):
        order_size, created = OrderSize.objects.get_or_create(order=pre_costing_order_inquiry, size=actual_po_club_size.marketing_order_size.size)
        order_size.copied_from = actual_po_club_size.marketing_order_size
        order_size.save()
        actual_po_club_size.pre_costing_order_size = order_size
        actual_po_club_size.save()
        po_sizes = actual_po_club_size.posize_set.all()
        for po_size in po_sizes:
            po_size.order_size = order_size
            po_size.save()

    def copy_size_groups(self, marketing_costing_order_inquiry, pre_costing_order_inquiry):
        for source_size_group in marketing_costing_order_inquiry.get_order_size_groups():
            size_group, created = OrderSizeGroup.objects.get_or_create(
                order=pre_costing_order_inquiry,
                copied_from=source_size_group
            )
            source_sizes = source_size_group.get_sizes()
            for source_size in source_sizes:
                order_sizes = pre_costing_order_inquiry.get_order_sizes().filter(copied_from=source_size)
                for order_size in order_sizes:
                    size_group.sizes.add(order_size)

    def verify_clone_packs(self):
        order_items = self.version.order.get_order_items()
        order_colorways = self.version.order.get_order_colorways()
        order_countries = self.version.order.get_order_countries()
        order_sizes = self.version.order.get_order_sizes()
        order_size_groups = self.version.order.get_order_size_groups()

        for order_colorway in order_colorways:
            for order_country in order_countries:
                for order_size in order_sizes:
                    source_order_pack = get_object_or_none(OrderPack, 
                        {
                            'version':self.source_version,
                            'size': order_size.copied_from,
                            'colorway': order_colorway.copied_from,
                            'country': order_country.copied_from
                        }
                    )
                    order_pack = OrderPack.objects.get_or_create(size=order_size, country=order_country, colorway=order_colorway, version=self.version)[0]
                    order_pack.copied_from = source_order_pack
                    order_pack.save()
                    po_packs = POPack.objects.filter(
                        po_colorway__order_colorway=order_colorway,
                        po_country__order_country=order_country,
                        po_size__order_size=order_size,
                        purchase_order__costing_version=self.version
                    )
                    for po_pack in po_packs:
                        po_pack.order_pack = order_pack
                        po_pack.save()
                    for order_item in order_items:
                        order_pack_item, created = OrderPackItem.objects.get_or_create(pack=order_pack, item=order_item)

                        copied_from = OrderPackItem.objects.get(pack=order_pack.copied_from, item=order_item.copied_from)
                        order_pack_item.copied_from = copied_from
                        order_pack_item.save()
                        po_items = POItem.objects.filter(purchase_order__costing_version=self.version, order_item=order_item.copied_from)
                        for po_item in po_items:
                            po_item.order_item=order_item
                            po_item.save()
                for order_size_group in order_size_groups:
                    pack = OrderPackSizeGroup.objects.get_or_create(size_group=order_size_group, country=order_country, colorway=order_colorway, version=self.version)[0]

    def get_created_costing_version(self):
        return self.version

    def clone_data(self):

        with transaction.atomic():
            self.destination_order_inquiry = self.create_clone_order_inquiry()
            po_club_colorways = ActualPOClubColorway.objects.filter(po_club=self.po_club)
            po_club_countries = ActualPOClubCountry.objects.filter(po_club=self.po_club)
            po_club_sizes = ActualPOClubSize.objects.filter(po_club=self.po_club)

            for po_club_colorway in po_club_colorways:
                self.copy_colorway(self.destination_order_inquiry, po_club_colorway)

            for po_club_country in po_club_countries:
                self.copy_country(self.destination_order_inquiry, po_club_country)

            for po_club_size in po_club_sizes:
                self.copy_size(self.destination_order_inquiry, po_club_size)

            self.version = self.destination_order_inquiry.create_version(copied_from=self.source_version)
            self.set_costing_version_basic_data()

            self.copy_size_groups(self.source_version.order, self.destination_order_inquiry)
            self.create_order_items()
            self.create_colorway_item_types()
            self.destination_order_inquiry.copied_from = self.source_order_inquiry
            self.destination_order_inquiry.save()
            self.verify_clone_packs()
            self.create_order_version_colorway_country()
            self.create_order_pack_item_placements()

            # self.create_other_cost()
            # self.create_version_item_colorway_operations()
            self.create_order_costing_colorway_material_supplier_inquiry()
            self.destination_order_inquiry.generate_code()

